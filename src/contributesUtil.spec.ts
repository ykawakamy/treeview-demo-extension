import assert from "assert";
import { parseWhenClause } from "./ContributesUtil";

describe("parseWhenClause", () => {
  test("!editorReadonly", ()=>{
    const when = parseWhenClause("!editorReadonly");
    const dummy:any = {};
    assert.equal(when(dummy, {}), true);
    assert.equal(when(dummy, {editorReadonly: true}), false);
    assert.equal(when(dummy, {editorReadonly: false}), true);
  });

  test("!(editorReadonly || inDebugMode)", ()=>{
    const when = parseWhenClause("!(editorReadonly || inDebugMode)");
    const dummy:any = {};
    assert.equal(when(dummy, {editorReadonly: true,  inDebugMode: true  }), false);
    assert.equal(when(dummy, {editorReadonly: true,  inDebugMode: false }), false);
    assert.equal(when(dummy, {editorReadonly: false, inDebugMode: true  }), false);
    assert.equal(when(dummy, {editorReadonly: false, inDebugMode: false }), true);
  });

  test("textInputFocus && !editorReadonly", ()=>{
    const when = parseWhenClause("textInputFocus && !editorReadonly");
    const dummy:any = {};
    assert.equal(when(dummy, {textInputFocus: true,  editorReadonly: true  }), false);
    assert.equal(when(dummy, {textInputFocus: true,  editorReadonly: false }), true);
    assert.equal(when(dummy, {textInputFocus: false, editorReadonly: true  }), false);
    assert.equal(when(dummy, {textInputFocus: false, editorReadonly: false }), false);
  });

  test("!foo && bar	", ()=>{
    const when = parseWhenClause("!foo && bar	");
    const dummy:any = {};
    assert.equal(when(dummy, {foo: true,  bar: true  }), false);
    assert.equal(when(dummy, {foo: true,  bar: false }), false);
    assert.equal(when(dummy, {foo: false, bar: true  }), true);
    assert.equal(when(dummy, {foo: false, bar: false }), false);
  });

  test("(!foo) && bar	", ()=>{
    const when = parseWhenClause("(!foo) && bar	");
    const dummy:any = {};
    assert.equal(when(dummy, {foo: true,  bar: true  }), false);
    assert.equal(when(dummy, {foo: true,  bar: false }), false);
    assert.equal(when(dummy, {foo: false, bar: true  }), true);
    assert.equal(when(dummy, {foo: false, bar: false }), false);
  });

  test("!foo || bar	", ()=>{
    const when = parseWhenClause("!foo || bar	");
    const dummy:any = {};
    assert.equal(when(dummy, {foo: true,  bar: true  }), true);
    assert.equal(when(dummy, {foo: true,  bar: false }), false);
    assert.equal(when(dummy, {foo: false, bar: true  }), true);
    assert.equal(when(dummy, {foo: false, bar: false }), true);
  });

  test("(!foo) || bar	", ()=>{
    const when = parseWhenClause("(!foo) || bar");
    const dummy:any = {};
    assert.equal(when(dummy, {foo: true,  bar: true  }), true);
    assert.equal(when(dummy, {foo: true,  bar: false }), false);
    assert.equal(when(dummy, {foo: false, bar: true  }), true);
    assert.equal(when(dummy, {foo: false, bar: false }), true);
  });

  test("foo || bar && baz	", ()=>{
    const when = parseWhenClause("foo || bar && baz");
    const dummy:any = {};
    assert.equal(when(dummy, {foo: true,  bar: true  , baz: true  }), true);
    assert.equal(when(dummy, {foo: true,  bar: true  , baz: false }), true);
    assert.equal(when(dummy, {foo: true,  bar: false , baz: true  }), true);
    assert.equal(when(dummy, {foo: true,  bar: false , baz: false }), true);
    assert.equal(when(dummy, {foo: false, bar: true  , baz: true  }), true);
    assert.equal(when(dummy, {foo: false, bar: true  , baz: false }), false);
    assert.equal(when(dummy, {foo: false, bar: false , baz: true  }), false);
    assert.equal(when(dummy, {foo: false, bar: false , baz: false }), false);
  });

  test("foo || bar && baz	", ()=>{
    const when = parseWhenClause("foo || (bar && baz)");
    const dummy:any = {};
    assert.equal(when(dummy, {foo: true,  bar: true  , baz: true  }), true);
    assert.equal(when(dummy, {foo: true,  bar: true  , baz: false }), true);
    assert.equal(when(dummy, {foo: true,  bar: false , baz: true  }), true);
    assert.equal(when(dummy, {foo: true,  bar: false , baz: false }), true);
    assert.equal(when(dummy, {foo: false, bar: true  , baz: true  }), true);
    assert.equal(when(dummy, {foo: false, bar: true  , baz: false }), false);
    assert.equal(when(dummy, {foo: false, bar: false , baz: true  }), false);
    assert.equal(when(dummy, {foo: false, bar: false , baz: false }), false);
  });

});
