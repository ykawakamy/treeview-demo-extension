import { ContextExpr } from "../ContextExpr";
import { WhenClause, WhenClauseExpr } from "../MenuDefinition";

type Ty = "root" | "!" | "&&" | "||" | "in" | "comparator";
const level: Record<Ty, number> = {
  "!": 3,
  comparator: 2,
  in: 1,
  "&&": 4,
  "||": 5,
  root: 6,
};
export function parseWhenClause(when: string | undefined): WhenClause {
  if (!when) {
    return { op: "root", tree: [], expr: (item, context) => true };
  }

  const pattern = /!={0,2}|\(|\)|'[^']+'|===?|&&|\|\||>=?|<=?|=~|in(?!\w)|not in|[\w._-]+|\/(?:.|\\\/)+\/[ismu]*/g;
  let index = 0;
  let stack: WhenClause[] = [];
  let opStack: { level: number; expr: (rt: WhenClause) => WhenClause }[] = [];
  const recursion = (parentLevel: number): WhenClause => {
    function resolve(currentLevel: number, lazyExpr: (lt: WhenClause) => ((rt: WhenClause) => WhenClause) ) {
      let prev = opStack.at(-1);
      while (prev && prev.level < currentLevel) {
        stack.push(opStack.pop()!.expr(stack.pop()!));
        prev = opStack.at(-1);
      }
      const lt = stack.pop();
      if (!lt) {
        throw new Error("failed to parse whenClause");
      }
      opStack.push({ level: currentLevel, expr: lazyExpr(lt) });
    }

    while (index < when.length) {
      const parts = pattern.exec(when);
      if (!parts) {
        index = when.length;
        break;
      }
      index = pattern.lastIndex;
      const op = parts[0][0];
      const token = parts[0];
      if (op === "'") {
        const unquote = token.slice(1, -1);
        stack.push({ op: unquote, tree: [], expr: ContextExpr.String(unquote) });
      } else if (token === "(") {
        const pOpStack = opStack;
        opStack = [];
        const pStack = stack;
        stack = [];
        pStack.push(recursion(level["root"]));
        opStack = pOpStack;
        stack = pStack;
      } else if (token === ")") {
        break;
      } else if (token === "!") {
        opStack.push({
          level: level["!"],
          expr: (rt) => {
            return { op: "!", tree: [rt], expr: (item, context) => !rt.expr(item, context) };
          },
        });
      } else if (token === "&&") {
        const currentLevel = level[token];
        resolve(currentLevel, (lt: WhenClause) => (rt: WhenClause): WhenClause => {
          return toOperator(lt, token, rt);
        });
      } else if (token === "||") {
        const currentLevel = level[token];
        resolve(currentLevel, (lt: WhenClause) => (rt: WhenClause): WhenClause => {
          return toOperator(lt, token, rt);
        });
      } else if (isComparator(token)) {
        const currentLevel = level["comparator"];
        resolve(currentLevel, (lt: WhenClause) => (rt: WhenClause): WhenClause => {
          return { op: token, tree: [lt, rt], expr: toComparator(lt.expr, token, rt.expr) };
        });
      } else if (isInClause(token)) {
        const currentLevel = level["in"];
        resolve(currentLevel, (lt: WhenClause) => (rt: WhenClause): WhenClause => {
          return { op: token, tree: [lt, rt], expr: toComparator(lt.expr, token, rt.expr) };
        });
      } else {
        if (opStack.at(-1)?.level === level["comparator"]) {
          stack.push({ op: token, tree: [], expr: ContextExpr.String(token) });
        } else {
          stack.push({ op: `context: ${token}`, tree: [], expr: ContextExpr.Context(token) });
        }
      }
    }
    while (opStack.at(-1)) {
      stack.push(opStack.pop()!.expr(stack.pop()!));
    }
    return stack[0];
  };
  const clause = recursion(level["root"]);
  return { op: when, tree: [clause], expr: (item, context) => clause.expr(item, context) };
}
function isOperator(token: string) {
  switch (token) {
    case "!":
    case "||":
    case "&&":
      return true;
  }
  return false;
}
function toOperator(lt: WhenClause, token: string, rt: WhenClause): WhenClause {
  switch (token) {
    case "||":
      return { op: token, tree: [lt, rt], expr: ContextExpr.Or(lt.expr, rt.expr) };
    case "&&":
      return { op: token, tree: [lt, rt], expr: ContextExpr.And(lt.expr, rt.expr) };
  }
  throw new Error("failed to parse whenClause");
}
function isComparator(token: string) {
  switch (token) {
    case "!==":
    case "!=":
    case "===":
    case "==":
    case "=~":
    case "<":
    case "<=":
    case ">":
    case ">=":
      return true;
  }
  return false;
}

function isInClause(token: string) {
  switch (token) {
    case "in":
    case "not in":
      return true;
  }
  return false;
}

function toComparator(lt: WhenClauseExpr, token: string, rt: WhenClauseExpr): WhenClauseExpr {
  switch (token) {
    case "!==":
    case "!=":
      return (item, context) => lt(item, context) != rt(item, context);
    case "===":
    case "==":
      return (item, context) => lt(item, context) == rt(item, context);
    case "=~":
      return ContextExpr.RegexTest(lt, rt);
    case "<":
      return (item, context) => lt(item, context) < rt(item, context);
    case "<=":
      return (item, context) => lt(item, context) <= rt(item, context);
    case ">":
      return (item, context) => lt(item, context) > rt(item, context);
    case ">=":
      return (item, context) => lt(item, context) >= rt(item, context);
    case "in":
      return (item, context) => {
        const ltVal = lt(item, context);
        const rtVal = rt(item, context);
        if (Array.isArray(rtVal)) {
          return rtVal.includes(ltVal);
        }
        return ltVal in rtVal;
      };
    case "not in":
      return (item, context) => {
        const ltVal = lt(item, context);
        const rtVal = rt(item, context);
        if (Array.isArray(rtVal)) {
          return !rtVal.includes(ltVal);
        }
        return !(ltVal in rtVal);
      };
  }
  throw new Error("failed to parse whenClause");
}
