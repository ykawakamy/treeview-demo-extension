import { WhenClause, WhenClauseExpr } from "./MenuDefinition";

export namespace ContextExpr {
  export function And(lt: WhenClauseExpr, rt: WhenClauseExpr): WhenClauseExpr {
    return (item, context) => lt(item, context) && rt(item, context);
  }
  export function Or(lt: WhenClauseExpr, rt: WhenClauseExpr): WhenClauseExpr {
    return (item, context) => lt(item, context) || rt(item, context);
  }

  export function RegexTest(lt: WhenClauseExpr, rt: WhenClauseExpr): WhenClauseExpr {
    return (item, context) => {
      const ltVal = lt(item, context);
      const rtVal = rt(item, context);
      if (typeof ltVal === "string" && typeof rtVal === "string") {
        const regpart = /^\/((.|\\\/)+)\/([ismu]*)$/.exec(rtVal);
        if(!regpart){
          return false;
        }
        return ltVal.match(new RegExp(regpart[1],regpart[2]));
      }
      return false;
    };
  }

  export function Context(token: string): WhenClauseExpr {
    return (item, context) => {
      return context[token];
    };
  }
  export function String(token: string): WhenClauseExpr {
    return (item, context) => {
      return token;
    };
  }
}
