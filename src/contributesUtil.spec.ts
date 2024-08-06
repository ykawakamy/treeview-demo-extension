import { expect, jest, test } from "@jest/globals";
import assert from "assert";
import { WhenClause } from "./MenuDefinition";
import { parseWhenClause } from "./webview/WhenClauseParser";

function assertWhenClause(clause: WhenClause, actual: boolean, expected: boolean) {
  try {
    assert.equal(actual, expected);
  } catch (e) {
    let out = "";
    const debug = (clause: WhenClause, nested: number) => {
      out += `${"  ".repeat(nested)} - ${clause.op}: \n`;
      for (const item of clause.tree) {
        debug(item, nested + 1);
      }
    };
    debug(clause, 0);
    console.log(out);
    throw e;
  }
}
function assertTree(when: WhenClause, expected: any) {
  expect(when.tree).toMatchObject(expected.tree);
}

describe("parseWhenClause", () => {
  test("!editorReadonly", () => {
    const when = parseWhenClause("!editorReadonly");
    const dummy: any = {};
    assertTree(when, { tree: [{ op: "!", tree: [{ op: "context: editorReadonly", tree: [] }] }] });
    assertWhenClause(when, when.expr(dummy, {}), true);
    assertWhenClause(when, when.expr(dummy, { editorReadonly: true }), false);
    assertWhenClause(when, when.expr(dummy, { editorReadonly: false }), true);
  });

  test("!(editorReadonly || inDebugMode)", () => {
    const when = parseWhenClause("!(editorReadonly || inDebugMode)");
    const dummy: any = {};
    assertTree(when, { 
      tree: [
        { op: "!", tree: [
          { op: "||", tree: [
            { op: "context: editorReadonly", tree: [] },
            { op: "context: inDebugMode", tree: [] },
          ]
        }] 
      }] 
    });
    assertWhenClause(when, when.expr(dummy, { editorReadonly: true, inDebugMode: true }), false);
    assertWhenClause(when, when.expr(dummy, { editorReadonly: true, inDebugMode: false }), false);
    assertWhenClause(when, when.expr(dummy, { editorReadonly: false, inDebugMode: true }), false);
    assertWhenClause(when, when.expr(dummy, { editorReadonly: false, inDebugMode: false }), true);
  });

  test("textInputFocus && !editorReadonly", () => {
    const when = parseWhenClause("textInputFocus && !editorReadonly");
    const dummy: any = {};
    assertTree(when, { 
      tree: [
        { op: "&&", tree: [
          { op: "context: textInputFocus", tree: [] },
          { op: "!", tree: [
            { op: "context: editorReadonly", tree: [] },
          ]}
        ]} 
      ]} 
    );
    assertWhenClause(when, when.expr(dummy, { textInputFocus: true, editorReadonly: true }), false);
    assertWhenClause(when, when.expr(dummy, { textInputFocus: true, editorReadonly: false }), true);
    assertWhenClause(when, when.expr(dummy, { textInputFocus: false, editorReadonly: true }), false);
    assertWhenClause(when, when.expr(dummy, { textInputFocus: false, editorReadonly: false }), false);
  });

  test("!foo && bar	", () => {
    const when = parseWhenClause("!foo && bar	");
    const dummy: any = {};
    assertTree(when, { 
      tree: [
        { op: "&&", tree: [
          { op: "!", tree: [
            { op: "context: foo", tree: [] },
          ]},
          { op: "context: bar", tree: [] },
        ]} 
      ]} 
    );
    assertWhenClause(when, when.expr(dummy, { foo: true, bar: true }), false);
    assertWhenClause(when, when.expr(dummy, { foo: true, bar: false }), false);
    assertWhenClause(when, when.expr(dummy, { foo: false, bar: true }), true);
    assertWhenClause(when, when.expr(dummy, { foo: false, bar: false }), false);
  });

  test("(!foo) && bar	", () => {
    const when = parseWhenClause("(!foo) && bar	");
    const dummy: any = {};
    assertTree(when, { 
      tree: [
        { op: "&&", tree: [
          { op: "!", tree: [
            { op: "context: foo", tree: [] },
          ]},
          { op: "context: bar", tree: [] },
        ]} 
      ]} 
    );
    assertWhenClause(when, when.expr(dummy, { foo: true, bar: true }), false);
    assertWhenClause(when, when.expr(dummy, { foo: true, bar: false }), false);
    assertWhenClause(when, when.expr(dummy, { foo: false, bar: true }), true);
    assertWhenClause(when, when.expr(dummy, { foo: false, bar: false }), false);
  });

  test("!foo || bar	", () => {
    const when = parseWhenClause("!foo || bar	");
    const dummy: any = {};
    assertTree(when, { 
      tree: [
        { op: "||", tree: [
          { op: "!", tree: [
            { op: "context: foo", tree: [] },
          ]},
          { op: "context: bar", tree: [] },
        ]} 
      ]} 
    );
    assertWhenClause(when, when.expr(dummy, { foo: true, bar: true }), true);
    assertWhenClause(when, when.expr(dummy, { foo: true, bar: false }), false);
    assertWhenClause(when, when.expr(dummy, { foo: false, bar: true }), true);
    assertWhenClause(when, when.expr(dummy, { foo: false, bar: false }), true);
  });

  test("(!foo) || bar	", () => {
    const when = parseWhenClause("(!foo) || bar");
    const dummy: any = {};
    assertTree(when, { 
      tree: [
        { op: "||", tree: [
          { op: "!", tree: [
            { op: "context: foo", tree: [] },
          ]},
          { op: "context: bar", tree: [] },
        ]} 
      ]} 
    );
    assertWhenClause(when, when.expr(dummy, { foo: true, bar: true }), true);
    assertWhenClause(when, when.expr(dummy, { foo: true, bar: false }), false);
    assertWhenClause(when, when.expr(dummy, { foo: false, bar: true }), true);
    assertWhenClause(when, when.expr(dummy, { foo: false, bar: false }), true);
  });

  test("foo || bar && baz	", () => {
    const when = parseWhenClause("foo || bar && baz");
    const dummy: any = {};
    assertTree(when, { 
      tree: [
        { op: "||", tree: [
          { op: "context: foo", tree: [] },
          { op: "&&", tree: [
            { op: "context: bar", tree: [] },
            { op: "context: baz", tree: [] },
          ]},
        ]} 
      ]} 
    );
    assertWhenClause(when, when.expr(dummy, { foo: true, bar: true, baz: true }), true);
    assertWhenClause(when, when.expr(dummy, { foo: true, bar: true, baz: false }), true);
    assertWhenClause(when, when.expr(dummy, { foo: true, bar: false, baz: true }), true);
    assertWhenClause(when, when.expr(dummy, { foo: true, bar: false, baz: false }), true);
    assertWhenClause(when, when.expr(dummy, { foo: false, bar: true, baz: true }), true);
    assertWhenClause(when, when.expr(dummy, { foo: false, bar: true, baz: false }), false);
    assertWhenClause(when, when.expr(dummy, { foo: false, bar: false, baz: true }), false);
    assertWhenClause(when, when.expr(dummy, { foo: false, bar: false, baz: false }), false);
  });

  test("foo || (bar && baz)	", () => {
    const when = parseWhenClause("foo || (bar && baz)");
    const dummy: any = {};
    assertTree(when, { 
      tree: [
        { op: "||", tree: [
          { op: "context: foo", tree: [] },
          { op: "&&", tree: [
            { op: "context: bar", tree: [] },
            { op: "context: baz", tree: [] },
          ]},
        ]} 
      ]} 
    );
    assertWhenClause(when, when.expr(dummy, { foo: true, bar: true, baz: true }), true);
    assertWhenClause(when, when.expr(dummy, { foo: true, bar: true, baz: false }), true);
    assertWhenClause(when, when.expr(dummy, { foo: true, bar: false, baz: true }), true);
    assertWhenClause(when, when.expr(dummy, { foo: true, bar: false, baz: false }), true);
    assertWhenClause(when, when.expr(dummy, { foo: false, bar: true, baz: true }), true);
    assertWhenClause(when, when.expr(dummy, { foo: false, bar: true, baz: false }), false);
    assertWhenClause(when, when.expr(dummy, { foo: false, bar: false, baz: true }), false);
    assertWhenClause(when, when.expr(dummy, { foo: false, bar: false, baz: false }), false);
  });

  test("-- (foo || bar) && baz	", () => {
    const when = parseWhenClause("(foo || bar) && baz");
    const dummy: any = {};
    assertTree(when, { 
      tree: [
        { op: "&&", tree: [
          { op: "||", tree: [
            { op: "context: foo", tree: [] },
            { op: "context: bar", tree: [] },
          ]},
          { op: "context: baz", tree: [] },
        ]} 
      ]} 
    );
    assertWhenClause(when, when.expr(dummy, { foo: true, bar: true, baz: true }), true);
    assertWhenClause(when, when.expr(dummy, { foo: true, bar: true, baz: false }), false);
    assertWhenClause(when, when.expr(dummy, { foo: true, bar: false, baz: true }), true);
    assertWhenClause(when, when.expr(dummy, { foo: true, bar: false, baz: false }), false);
    assertWhenClause(when, when.expr(dummy, { foo: false, bar: true, baz: true }), true);
    assertWhenClause(when, when.expr(dummy, { foo: false, bar: true, baz: false }), false);
    assertWhenClause(when, when.expr(dummy, { foo: false, bar: false, baz: true }), false);
    assertWhenClause(when, when.expr(dummy, { foo: false, bar: false, baz: false }), false);
  });

  test("foo || (bar && baz)	", () => {
    const when = parseWhenClause("foo || (bar && baz)");
    const dummy: any = {};
    assertTree(when, { 
      tree: [
        { op: "||", tree: [
          { op: "context: foo", tree: [] },
          { op: "&&", tree: [
            { op: "context: bar", tree: [] },
            { op: "context: baz", tree: [] },
          ]},
        ]} 
      ]} 
    );
    assertWhenClause(when, when.expr(dummy, { foo: true, bar: true, baz: true }), true);
    assertWhenClause(when, when.expr(dummy, { foo: true, bar: true, baz: false }), true);
    assertWhenClause(when, when.expr(dummy, { foo: true, bar: false, baz: true }), true);
    assertWhenClause(when, when.expr(dummy, { foo: true, bar: false, baz: false }), true);
    assertWhenClause(when, when.expr(dummy, { foo: false, bar: true, baz: true }), true);
    assertWhenClause(when, when.expr(dummy, { foo: false, bar: true, baz: false }), false);
    assertWhenClause(when, when.expr(dummy, { foo: false, bar: false, baz: true }), false);
    assertWhenClause(when, when.expr(dummy, { foo: false, bar: false, baz: false }), false);
  });

  test(" !foo && bar || baz	", () => {
    const when = parseWhenClause("!foo && bar || baz	");
    const dummy: any = {};
    assertTree(when, { 
      tree: [
        { op: "||", tree: [
          { op: "&&", tree: [
            { op: "!", tree: [
              { op: "context: foo", tree: [] },
            ]},
            { op: "context: bar", tree: [] },
          ]},
          { op: "context: baz", tree: [] },
        ]} 
      ]} 
    );
    assertWhenClause(when, when.expr(dummy, { foo: true, bar: true, baz: true }), true);
    assertWhenClause(when, when.expr(dummy, { foo: true, bar: true, baz: false }), false);
    assertWhenClause(when, when.expr(dummy, { foo: true, bar: false, baz: true }), true);
    assertWhenClause(when, when.expr(dummy, { foo: true, bar: false, baz: false }), false);
    assertWhenClause(when, when.expr(dummy, { foo: false, bar: true, baz: true }), true);
    assertWhenClause(when, when.expr(dummy, { foo: false, bar: true, baz: false }), true);
    assertWhenClause(when, when.expr(dummy, { foo: false, bar: false, baz: true }), true);
    assertWhenClause(when, when.expr(dummy, { foo: false, bar: false, baz: false }), false);
  });

  test(" (!foo && bar) || baz	", () => {
    const when = parseWhenClause("(!foo && bar) || baz");
    const dummy: any = {};
    assertTree(when, { 
      tree: [
        { op: "||", tree: [
          { op: "&&", tree: [
            { op: "!", tree: [
              { op: "context: foo", tree: [] },
            ]},
            { op: "context: bar", tree: [] },
          ]},
          { op: "context: baz", tree: [] },
        ]} 
      ]} 
    );
    assertWhenClause(when, when.expr(dummy, { foo: true, bar: true, baz: true }), true);
    assertWhenClause(when, when.expr(dummy, { foo: true, bar: true, baz: false }), false);
    assertWhenClause(when, when.expr(dummy, { foo: true, bar: false, baz: true }), true);
    assertWhenClause(when, when.expr(dummy, { foo: true, bar: false, baz: false }), false);
    assertWhenClause(when, when.expr(dummy, { foo: false, bar: true, baz: true }), true);
    assertWhenClause(when, when.expr(dummy, { foo: false, bar: true, baz: false }), true);
    assertWhenClause(when, when.expr(dummy, { foo: false, bar: false, baz: true }), true);
    assertWhenClause(when, when.expr(dummy, { foo: false, bar: false, baz: false }), false);
  });

  test("editorLangId == typescript", () => {
    const when = parseWhenClause("editorLangId == typescript");
    const dummy: any = {};
    assertTree(when, { 
      tree: [
        { op: "==", tree: [
          { op: "context: editorLangId", tree: [] },
          { op: "typescript", tree: [] },
        ]} 
      ]} 
    );
    assertWhenClause(when, when.expr(dummy, { editorLangId: "typescript" }), true);
    assertWhenClause(when, when.expr(dummy, { editorLangId: "javascript" }), false);
  });

  test("editorLangId == 'typescript'", () => {
    const when = parseWhenClause("editorLangId == 'typescript'");
    const dummy: any = {};
    assertTree(when, { 
      tree: [
        { op: "==", tree: [
          { op: "context: editorLangId", tree: [] },
          { op: "typescript", tree: [] },
        ]} 
      ]} 
    );
    assertWhenClause(when, when.expr(dummy, { editorLangId: "typescript" }), true);
    assertWhenClause(when, when.expr(dummy, { editorLangId: "javascript" }), false);
  });

  test("resourceExtname != .js", () => {
    const when = parseWhenClause("resourceExtname != .js");
    const dummy: any = {};
    assertTree(when, { 
      tree: [
        { op: "!=", tree: [
          { op: "context: resourceExtname", tree: [] },
          { op: ".js", tree: [] },
        ]} 
      ]} 
    );
    assertWhenClause(when, when.expr(dummy, { resourceExtname: ".ts" }), true);
    assertWhenClause(when, when.expr(dummy, { resourceExtname: ".js" }), false);
  });

  test("resourceExtname != '.js'", () => {
    const when = parseWhenClause("resourceExtname != '.js'");
    const dummy: any = {};
    assertTree(when, { 
      tree: [
        { op: "!=", tree: [
          { op: "context: resourceExtname", tree: [] },
          { op: ".js", tree: [] },
        ]} 
      ]} 
    );
    assertWhenClause(when, when.expr(dummy, { resourceExtname: ".ts" }), true);
    assertWhenClause(when, when.expr(dummy, { resourceExtname: ".js" }), false);
  });

  test("editorLangId === typescript", () => {
    const when = parseWhenClause("editorLangId === typescript");
    const dummy: any = {};
    assertTree(when, { 
      tree: [
        { op: "===", tree: [
          { op: "context: editorLangId", tree: [] },
          { op: "typescript", tree: [] },
        ]} 
      ]} 
    );
    assertWhenClause(when, when.expr(dummy, { editorLangId: "typescript" }), true);
    assertWhenClause(when, when.expr(dummy, { editorLangId: "javascript" }), false);
  });

  test("editorLangId === 'typescript'", () => {
    const when = parseWhenClause("editorLangId === 'typescript'");
    const dummy: any = {};
    assertTree(when, { 
      tree: [
        { op: "===", tree: [
          { op: "context: editorLangId", tree: [] },
          { op: "typescript", tree: [] },
        ]} 
      ]} 
    );
    assertWhenClause(when, when.expr(dummy, { editorLangId: "typescript" }), true);
    assertWhenClause(when, when.expr(dummy, { editorLangId: "javascript" }), false);
  });

  test("resourceExtname !== .js", () => {
    const when = parseWhenClause("resourceExtname !== .js");
    const dummy: any = {};
    assertTree(when, { 
      tree: [
        { op: "!==", tree: [
          { op: "context: resourceExtname", tree: [] },
          { op: ".js", tree: [] },
        ]} 
      ]} 
    );
    assertWhenClause(when, when.expr(dummy, { resourceExtname: ".ts" }), true);
    assertWhenClause(when, when.expr(dummy, { resourceExtname: ".js" }), false);
  });

  test("resourceExtname !== '.js'", () => {
    const when = parseWhenClause("resourceExtname !== '.js'");
    const dummy: any = {};
    assertTree(when, { 
      tree: [
        { op: "!==", tree: [
          { op: "context: resourceExtname", tree: [] },
          { op: ".js", tree: [] },
        ]} 
      ]} 
    );
    assertWhenClause(when, when.expr(dummy, { resourceExtname: ".ts" }), true);
    assertWhenClause(when, when.expr(dummy, { resourceExtname: ".js" }), false);
  });

  test("resourceFilename == 'My New File.md'", () => {
    const when = parseWhenClause("resourceFilename == 'My New File.md'");
    const dummy: any = {};
    assertTree(when, { 
      tree: [
        { op: "==", tree: [
          { op: "context: resourceFilename", tree: [] },
          { op: "My New File.md", tree: [] },
        ]} 
      ]} 
    );
    assertWhenClause(when, when.expr(dummy, { resourceFilename: "My New File.md" }), true);
    assertWhenClause(when, when.expr(dummy, { resourceFilename: "AnotherFile.md" }), false);
  });

  test("gitOpenRepositoryCount >= 1", () => {
    const when = parseWhenClause("gitOpenRepositoryCount >= 1");
    const dummy: any = {};
    assertTree(when, { 
      tree: [
        { op: ">=", tree: [
          { op: "context: gitOpenRepositoryCount", tree: [] },
          { op: "1", tree: [] },
        ]} 
      ]} 
    );
    assertWhenClause(when, when.expr(dummy, { gitOpenRepositoryCount: 2 }), true);
    assertWhenClause(when, when.expr(dummy, { gitOpenRepositoryCount: 0 }), false);
  });

  test("gitOpenRepositoryCount>=1", () => {
    const when = parseWhenClause("gitOpenRepositoryCount>=1");
    const dummy: any = {};
    assertTree(when, { 
      tree: [
        { op: ">=", tree: [
          { op: "context: gitOpenRepositoryCount", tree: [] },
          { op: "1", tree: [] },
        ]} 
      ]} 
    );
    assertWhenClause(when, when.expr(dummy, { gitOpenRepositoryCount: 2 }), true);
    assertWhenClause(when, when.expr(dummy, { gitOpenRepositoryCount: 0 }), false);
  });

  test("resourceScheme =~ /^untitled$|^file$/", () => {
    const when = parseWhenClause("resourceScheme =~ /^untitled$|^file$/");
    const dummy: any = {};
    assertTree(when, { 
      tree: [
        { op: "=~", tree: [
          { op: "context: resourceScheme", tree: [] },
          { op: "/^untitled$|^file$/", tree: [] },
        ]} 
      ]} 
    );
    assertWhenClause(when, when.expr(dummy, { resourceScheme: "untitled" }), true);
    assertWhenClause(when, when.expr(dummy, { resourceScheme: "file" }), true);
    assertWhenClause(when, when.expr(dummy, { resourceScheme: "http" }), false);
  });

  test("resourceScheme =~ /file:\\/\\//", () => {
    const when = parseWhenClause("resourceScheme =~ /file:\\/\\//");
    const dummy: any = {};
    assertTree(when, { 
      tree: [
        { op: "=~", tree: [
          { op: "context: resourceScheme", tree: [] },
          { op: "/file:\\/\\//", tree: [] },
        ]} 
      ]} 
    );
    assertWhenClause(when, when.expr(dummy, { resourceScheme: "file://" }), true);
    assertWhenClause(when, when.expr(dummy, { resourceScheme: "http://" }), false);
  });

  test("resourceFilename in supportedFolders", () => {
    const when = parseWhenClause("resourceFilename in supportedFolders");
    const dummy: any = {};
    assertTree(when, { 
      tree: [
        { op: "in", tree: [
          { op: "context: resourceFilename", tree: [] },
          { op: "context: supportedFolders", tree: [] },
        ]} 
      ]} 
    );
    const supportedFolders = ["src", "lib"];
    assertWhenClause(when, when.expr(dummy, { resourceFilename: "src", supportedFolders }), true);
    assertWhenClause(when, when.expr(dummy, { resourceFilename: "docs", supportedFolders }), false);
  });

  test("resourceFilename not in supportedFolders", () => {
    const when = parseWhenClause("resourceFilename not in supportedFolders");
    const dummy: any = {};
    assertTree(when, { 
      tree: [
        { op: "not in", tree: [
          { op: "context: resourceFilename", tree: [] },
          { op: "context: supportedFolders", tree: [] },
        ]} 
      ]} 
    );
    const supportedFolders = ["src", "lib"];
    assertWhenClause(when, when.expr(dummy, { resourceFilename: "src", supportedFolders }), false);
    assertWhenClause(when, when.expr(dummy, { resourceFilename: "docs", supportedFolders }), true);
  });

  describe("complex ", () => {
    test("editorReadonly != true", () => {
      const when = parseWhenClause("editorReadonly != true");
      const dummy: any = {};
      assertTree(when, { 
        tree: [
          { op: "!=", tree: [
            { op: "context: editorReadonly", tree: [] },
            { op: "true", tree: [] },
          ]} 
        ]} 
      );
      assertWhenClause(when, when.expr(dummy, {}), true);
      assertWhenClause(when, when.expr(dummy, { editorReadonly: "true" }), false);
      assertWhenClause(when, when.expr(dummy, { editorReadonly: "false" }), true);
    });

    test("!(editorReadonly == true || inDebugMode == true)", () => {
      const when = parseWhenClause("!(editorReadonly == true || inDebugMode == true)");
      const dummy: any = {};
      assertTree(when, { 
        tree: [
          { op: "!", tree: [
            { op: "||", tree: [
              { op: "==", tree: [
                { op: "context: editorReadonly", tree: [] },
                { op: "true", tree: [] },
              ]},
              { op: "==", tree: [
                { op: "context: inDebugMode", tree: [] },
                { op: "true", tree: [] },
              ]} 
            ]} 
          ]} 
        ]} 
      );
      assertWhenClause(when, when.expr(dummy, { editorReadonly: "true", inDebugMode: "true" }), false);
      assertWhenClause(when, when.expr(dummy, { editorReadonly: "true", inDebugMode: "false" }), false);
      assertWhenClause(when, when.expr(dummy, { editorReadonly: "false", inDebugMode: "true" }), false);
      assertWhenClause(when, when.expr(dummy, { editorReadonly: "false", inDebugMode: "false" }), true);
    });

    test("textInputFocus == true && editorReadonly != true", () => {
      const when = parseWhenClause("textInputFocus == true && editorReadonly != true");
      const dummy: any = {};
      assertTree(when, { 
        tree: [
          { op: "&&", tree: [
            { op: "==", tree: [
              { op: "context: textInputFocus", tree: [] },
              { op: "true", tree: [] },
            ]},
            { op: "!=", tree: [
              { op: "context: editorReadonly", tree: [] },
              { op: "true", tree: [] },
            ]} 
          ]} 
        ]} 
      );
      assertWhenClause(when, when.expr(dummy, { textInputFocus: "true", editorReadonly: "true" }), false);
      assertWhenClause(when, when.expr(dummy, { textInputFocus: "true", editorReadonly: "false" }), true);
      assertWhenClause(when, when.expr(dummy, { textInputFocus: "false", editorReadonly: "true" }), false);
      assertWhenClause(when, when.expr(dummy, { textInputFocus: "false", editorReadonly: "false" }), false);
    });

    test("foo != true && bar == true	", () => {
      const when = parseWhenClause("foo != true && bar == true	");
      const dummy: any = {};
      assertTree(when, { 
        tree: [
          { op: "&&", tree: [
            { op: "!=", tree: [
              { op: "context: foo", tree: [] },
              { op: "true", tree: [] },
            ]},
            { op: "==", tree: [
              { op: "context: bar", tree: [] },
              { op: "true", tree: [] },
            ]} 
          ]} 
        ]} 
      );
      assertWhenClause(when, when.expr(dummy, { foo: "true", bar: "true" }), false);
      assertWhenClause(when, when.expr(dummy, { foo: "true", bar: "false" }), false);
      assertWhenClause(when, when.expr(dummy, { foo: "false", bar: "true" }), true);
      assertWhenClause(when, when.expr(dummy, { foo: "false", bar: "false" }), false);
    });

    test("!(foo == true) && bar == true	", () => {
      const when = parseWhenClause("!(foo == true) && bar == true	");
      const dummy: any = {};
      assertTree(when, { 
        tree: [
          { op: "&&", tree: [
            { op: "!", tree: [
              { op: "==", tree: [
                { op: "context: foo", tree: [] },
                { op: "true", tree: [] },
              ]},
            ]},
            { op: "==", tree: [
              { op: "context: bar", tree: [] },
              { op: "true", tree: [] },
            ]} 
          ]} 
        ]} 
      );
      assertWhenClause(when, when.expr(dummy, { foo: "true", bar: "true" }), false);
      assertWhenClause(when, when.expr(dummy, { foo: "true", bar: "false" }), false);
      assertWhenClause(when, when.expr(dummy, { foo: "false", bar: "true" }), true);
      assertWhenClause(when, when.expr(dummy, { foo: "false", bar: "false" }), false);
    });

    test("foo != true || bar == true	", () => {
      const when = parseWhenClause("foo != true || bar == true	");
      const dummy: any = {};
      assertTree(when, { 
        tree: [
          { op: "||", tree: [
            { op: "!=", tree: [
              { op: "context: foo", tree: [] },
              { op: "true", tree: [] },
            ]},
            { op: "==", tree: [
              { op: "context: bar", tree: [] },
              { op: "true", tree: [] },
            ]} 
          ]} 
        ]} 
      );
      assertWhenClause(when, when.expr(dummy, { foo: "true", bar: "true" }), true);
      assertWhenClause(when, when.expr(dummy, { foo: "true", bar: "false" }), false);
      assertWhenClause(when, when.expr(dummy, { foo: "false", bar: "true" }), true);
      assertWhenClause(when, when.expr(dummy, { foo: "false", bar: "false" }), true);
    });

    test("(foo != true) || bar == true	", () => {
      const when = parseWhenClause("(foo != true) || bar == true");
      const dummy: any = {};
      assertTree(when, { 
        tree: [
          { op: "||", tree: [
            { op: "!=", tree: [
              { op: "context: foo", tree: [] },
              { op: "true", tree: [] },
            ]},
            { op: "==", tree: [
              { op: "context: bar", tree: [] },
              { op: "true", tree: [] },
            ]} 
          ]} 
        ]} 
      );
      assertWhenClause(when, when.expr(dummy, { foo: "true", bar: "true" }), true);
      assertWhenClause(when, when.expr(dummy, { foo: "true", bar: "false" }), false);
      assertWhenClause(when, when.expr(dummy, { foo: "false", bar: "true" }), true);
      assertWhenClause(when, when.expr(dummy, { foo: "false", bar: "false" }), true);
    });

    test("foo == true || bar == true && baz == true	", () => {
      const when = parseWhenClause("foo == true || bar == true && baz == true");
      const dummy: any = {};
      assertTree(when, { 
        tree: [
          { op: "||", tree: [
            { op: "==", tree: [
              { op: "context: foo", tree: [] },
              { op: "true", tree: [] },
            ]},
            { op: "&&", tree: [
              { op: "==", tree: [
                { op: "context: bar", tree: [] },
                { op: "true", tree: [] },
              ]}, 
              { op: "==", tree: [
                { op: "context: baz", tree: [] },
                { op: "true", tree: [] },
              ]} 
            ]},
          ]} 
        ]} 
      );
      assertWhenClause(when, when.expr(dummy, { foo: "true", bar: "true", baz: "true" }), true);
      assertWhenClause(when, when.expr(dummy, { foo: "true", bar: "true", baz: "false" }), true);
      assertWhenClause(when, when.expr(dummy, { foo: "true", bar: "false", baz: "true" }), true);
      assertWhenClause(when, when.expr(dummy, { foo: "true", bar: "false", baz: "false" }), true);
      assertWhenClause(when, when.expr(dummy, { foo: "false", bar: "true", baz: "true" }), true);
      assertWhenClause(when, when.expr(dummy, { foo: "false", bar: "true", baz: "false" }), false);
      assertWhenClause(when, when.expr(dummy, { foo: "false", bar: "false", baz: "true" }), false);
      assertWhenClause(when, when.expr(dummy, { foo: "false", bar: "false", baz: "false" }), false);
    });

    test("foo == true || (bar == true && baz == true)	", () => {
      const when = parseWhenClause("foo == true || (bar == true && baz == true)");
      const dummy: any = {};
      assertTree(when, { 
        tree: [
          { op: "||", tree: [
            { op: "==", tree: [
              { op: "context: foo", tree: [] },
              { op: "true", tree: [] },
            ]},
            { op: "&&", tree: [
              { op: "==", tree: [
                { op: "context: bar", tree: [] },
                { op: "true", tree: [] },
              ]}, 
              { op: "==", tree: [
                { op: "context: baz", tree: [] },
                { op: "true", tree: [] },
              ]} 
            ]},
          ]} 
        ]} 
      );
      assertWhenClause(when, when.expr(dummy, { foo: "true", bar: "true", baz: "true" }), true);
      assertWhenClause(when, when.expr(dummy, { foo: "true", bar: "true", baz: "false" }), true);
      assertWhenClause(when, when.expr(dummy, { foo: "true", bar: "false", baz: "true" }), true);
      assertWhenClause(when, when.expr(dummy, { foo: "true", bar: "false", baz: "false" }), true);
      assertWhenClause(when, when.expr(dummy, { foo: "false", bar: "true", baz: "true" }), true);
      assertWhenClause(when, when.expr(dummy, { foo: "false", bar: "true", baz: "false" }), false);
      assertWhenClause(when, when.expr(dummy, { foo: "false", bar: "false", baz: "true" }), false);
      assertWhenClause(when, when.expr(dummy, { foo: "false", bar: "false", baz: "false" }), false);
    });

    test("-- (foo == true || bar == true) && baz == true	", () => {
      const when = parseWhenClause("(foo == true || bar == true) && baz == true");
      const dummy: any = {};
      assertTree(when, { 
        tree: [
          { op: "&&", tree: [
            { op: "||", tree: [
              { op: "==", tree: [
                { op: "context: foo", tree: [] },
                { op: "true", tree: [] },
              ]},
              { op: "==", tree: [
                { op: "context: bar", tree: [] },
                { op: "true", tree: [] },
              ]}, 
            ]},
            { op: "==", tree: [
              { op: "context: baz", tree: [] },
              { op: "true", tree: [] },
            ]} 
          ]} 
        ]} 
      );
      assertWhenClause(when, when.expr(dummy, { foo: "true", bar: "true", baz: "true" }), true);
      assertWhenClause(when, when.expr(dummy, { foo: "true", bar: "true", baz: "false" }), false);
      assertWhenClause(when, when.expr(dummy, { foo: "true", bar: "false", baz: "true" }), true);
      assertWhenClause(when, when.expr(dummy, { foo: "true", bar: "false", baz: "false" }), false);
      assertWhenClause(when, when.expr(dummy, { foo: "false", bar: "true", baz: "true" }), true);
      assertWhenClause(when, when.expr(dummy, { foo: "false", bar: "true", baz: "false" }), false);
      assertWhenClause(when, when.expr(dummy, { foo: "false", bar: "false", baz: "true" }), false);
      assertWhenClause(when, when.expr(dummy, { foo: "false", bar: "false", baz: "false" }), false);
    });

    test(" foo != true && bar == true || baz == true	", () => {
      const when = parseWhenClause("foo != true && bar == true || baz == true	");
      const dummy: any = {};
      assertTree(when, { 
        tree: [
          { op: "||", tree: [
            { op: "&&", tree: [
              { op: "!=", tree: [
                { op: "context: foo", tree: [] },
                { op: "true", tree: [] },
              ]},
              { op: "==", tree: [
                { op: "context: bar", tree: [] },
                { op: "true", tree: [] },
              ]}, 
            ]},
            { op: "==", tree: [
              { op: "context: baz", tree: [] },
              { op: "true", tree: [] },
            ]} 
          ]} 
        ]} 
      );
      assertWhenClause(when, when.expr(dummy, { foo: "true", bar: "true", baz: "true" }), true);
      assertWhenClause(when, when.expr(dummy, { foo: "true", bar: "true", baz: "false" }), false);
      assertWhenClause(when, when.expr(dummy, { foo: "true", bar: "false", baz: "true" }), true);
      assertWhenClause(when, when.expr(dummy, { foo: "true", bar: "false", baz: "false" }), false);
      assertWhenClause(when, when.expr(dummy, { foo: "false", bar: "true", baz: "true" }), true);
      assertWhenClause(when, when.expr(dummy, { foo: "false", bar: "true", baz: "false" }), true);
      assertWhenClause(when, when.expr(dummy, { foo: "false", bar: "false", baz: "true" }), true);
      assertWhenClause(when, when.expr(dummy, { foo: "false", bar: "false", baz: "false" }), false);
    });

    test(" (foo != true && bar == true) || baz == true	", () => {
      const when = parseWhenClause("(foo != true && bar == true) || baz == true");
      const dummy: any = {};
      assertTree(when, { 
        tree: [
          { op: "||", tree: [
            { op: "&&", tree: [
              { op: "!=", tree: [
                { op: "context: foo", tree: [] },
                { op: "true", tree: [] },
              ]},
              { op: "==", tree: [
                { op: "context: bar", tree: [] },
                { op: "true", tree: [] },
              ]}, 
            ]},
            { op: "==", tree: [
              { op: "context: baz", tree: [] },
              { op: "true", tree: [] },
            ]} 
          ]} 
        ]} 
      );
      assertWhenClause(when, when.expr(dummy, { foo: "true", bar: "true", baz: "true" }), true);
      assertWhenClause(when, when.expr(dummy, { foo: "true", bar: "true", baz: "false" }), false);
      assertWhenClause(when, when.expr(dummy, { foo: "true", bar: "false", baz: "true" }), true);
      assertWhenClause(when, when.expr(dummy, { foo: "true", bar: "false", baz: "false" }), false);
      assertWhenClause(when, when.expr(dummy, { foo: "false", bar: "true", baz: "true" }), true);
      assertWhenClause(when, when.expr(dummy, { foo: "false", bar: "true", baz: "false" }), true);
      assertWhenClause(when, when.expr(dummy, { foo: "false", bar: "false", baz: "true" }), true);
      assertWhenClause(when, when.expr(dummy, { foo: "false", bar: "false", baz: "false" }), false);
    });
  });
});
