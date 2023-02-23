import { insertSwap } from "./utils";
import { modifyCodeByCommand, MenuEvent } from "./modify-json";
import { findNodeByText } from "./test-utils";

const fruitData = `{
  "fruits": [ "apple", "orange", "#c71585" ],
  "vegetables": [
    {
      "veggieName": "potato",
      "veggieLike": true
    },
    {
      "veggieName": "broccoli",
      "veggieLike": false
    }
  ]
}`;

const exampleData = `{
    "a": {
      "b": [1, 2, 
        3],
      "c": true,
    },
    "d": null,
    "e": [{ "f": 4, "g": 5 }],
    "I": "example",
  }`;

test("modifyCodeByCommand - decreaseItemIdx", () => {
  ["1", "2", "3", '"a"', '"d"', '"e"', '"I"'].forEach((key) => {
    const keyNode = findNodeByText(exampleData, key)!;
    const cmd = modifyCodeByCommand(
      { payload: key, type: "decreaseItemIdx" },
      keyNode,
      exampleData,
      keyNode.from
    )!;
    expect(insertSwap(exampleData, cmd)).toMatchSnapshot();
  });
});

test("modifyCodeByCommand - increaseItemIdx", () => {
  ["1", "2", "3", '"a"', '"d"', '"e"', '"I"'].forEach((key) => {
    const keyNode = findNodeByText(exampleData, key)!;
    const cmd = modifyCodeByCommand(
      { payload: key, type: "increaseItemIdx" },
      keyNode,
      exampleData,
      keyNode.from
    )!;
    expect(insertSwap(exampleData, cmd)).toMatchSnapshot();
  });
});

test("modifyCodeByCommand - simpleSwap", () => {
  const trueKey = findNodeByText(exampleData, "true")!;
  [
    "false",
    '"hot dog sports"',
    "0",
    '{"squid": ["dough", false, "bag", 0]}',
  ].forEach((payload) => {
    const cmd = modifyCodeByCommand(
      { payload, type: "simpleSwap" },
      trueKey,
      exampleData,
      trueKey.from
    )!;
    expect(insertSwap(exampleData, cmd)).toMatchSnapshot();
  });
  // may also want to check that it swaps in arrays fine?
  // const threeKey =
});

test("modifyCodeByCommand - addElementAsSiblingInArray (empty array)", () => {
  const txt = `{"example": []}`;
  const makeCmd = (): MenuEvent =>
    copy({ type: "addElementAsSiblingInArray", payload: "-9" });
  const targ = findNodeByText(txt, "[]")!;
  const cmd1 = modifyCodeByCommand(makeCmd(), targ, txt, targ.from)!;
  const result1 = insertSwap(txt, cmd1);
  expect(result1).toMatchSnapshot();

  expect(true).toBe(true);
});

test("modifyCodeByCommand - addElementAsSiblingInArray", () => {
  const makeCmd = (): MenuEvent =>
    copy({ type: "addElementAsSiblingInArray", payload: "-9" });
  // insert from left
  const key1 = findNodeByText(exampleData, "1")!.prevSibling!;
  const cmd1 = modifyCodeByCommand(
    makeCmd(),
    key1,
    exampleData,
    key1.nextSibling!.from
  )!;
  const result1 = insertSwap(exampleData, cmd1);
  expect(result1).toMatchSnapshot();

  // insert to right with trailing comma
  const exampleData2 = exampleData.replace("3", "3,");
  const key2 = findNodeByText(exampleData2, "3")!;
  const cmd2 = modifyCodeByCommand(
    makeCmd(),
    key2,
    exampleData,
    key2.nextSibling!.to
  )!;
  const result2 = insertSwap(exampleData, cmd2);
  expect(result2).toMatchSnapshot();

  // test empty array
  const exampleData3 = exampleData.replace("3", "[]");
  const key3 = findNodeByText(exampleData3, "[]")!.firstChild!;
  const cmd3 = modifyCodeByCommand(makeCmd(), key3, exampleData, key3.from)!;
  const result3 = insertSwap(exampleData3, cmd3);
  expect(result3).toMatchSnapshot();

  // insert at each place across array
  [1, 2, 3].forEach((key) => {
    const foundKey = findNodeByText(exampleData, `${key}`)!;
    const cmd = modifyCodeByCommand(
      makeCmd(),
      foundKey,
      exampleData,
      foundKey.to
    )!;
    const result = insertSwap(exampleData, cmd);
    expect(result).toMatchSnapshot();
  });

  expect(true).toBe(true);
});

test("modifyCodeByCommand - addObjectKey", () => {
  const rootKey = findNodeByText(exampleData, exampleData)!;
  const cmd = modifyCodeByCommand(
    { payload: { key: `"J"`, value: "[6, 7, 8]" }, type: "addObjectKey" },
    rootKey,
    exampleData,
    rootKey.from
  )!;
  expect(insertSwap(exampleData, cmd)).toMatchSnapshot();

  console.log("start one in question");
  const rootKeyb = findNodeByText(exampleData, `{ "f": 4, "g": 5 }`)!;
  const cmdb = modifyCodeByCommand(
    { payload: { key: `"J"`, value: "[6, 7, 8]" }, type: "addObjectKey" },
    rootKeyb,
    exampleData,
    rootKeyb.to
  )!;
  expect(insertSwap(exampleData, cmdb)).toMatchSnapshot();

  const cmd2 = modifyCodeByCommand(
    { payload: { key: `"J"`, value: "{}" }, type: "addObjectKey" },
    findNodeByText(exampleData, exampleData)!,
    exampleData,
    exampleData.length - 3
  )!;
  const update1 = insertSwap(exampleData, cmd2);
  const newObjKey = findNodeByText(update1, "{}")!;
  const cmd3 = modifyCodeByCommand(
    { payload: { key: `"X"`, value: '"Y"' }, type: "addObjectKey" },
    newObjKey,
    update1,
    newObjKey.from
  )!;
  expect(insertSwap(update1, cmd3)).toMatchSnapshot();
});

test("modifyCodeByCommand - addObjectKey (boundary effects)", () => {
  const rootKey = findNodeByText(exampleData, exampleData)!.parent!;
  const cmd = modifyCodeByCommand(
    { payload: { key: `"test"`, value: "null" }, type: "addObjectKey" },
    rootKey,
    exampleData,
    1
  )!;
  expect(insertSwap(exampleData, cmd)).toMatchSnapshot();
});

test("modifyCodeByCommand - addObjectKey (cursorPos fruit)", () => {
  const rootKey = findNodeByText(fruitData, '"vegetables"')!.parent!.lastChild!
    .firstChild!.nextSibling!;

  const cmd = modifyCodeByCommand(
    {
      payload: { key: '"veggieStarRating"', value: "0" },
      type: "addObjectKey",
    },
    rootKey,
    fruitData,
    71
  )!;
  expect(insertSwap(fruitData, cmd)).toMatchSnapshot();
});

test("modifyCodeByCommand - addObjectKey (cursorPos version)", () => {
  const buggyText = `{arc}`;
  const rootKey = findNodeByText(buggyText, "}")!.parent!;
  const cmd = modifyCodeByCommand(
    { payload: { key: `"arc"`, value: "{}" }, type: "addObjectKey" },
    rootKey,
    buggyText,
    4
  )!;
  expect(insertSwap(buggyText, cmd)).toMatchSnapshot();

  // const buggyText2 = `{ "bar": { }  }`;
  // const rootKey2 = findNodeByText(buggyText2, "}")!;
  // const cmd2 = modifyCodeByCommand(
  //   { payload: { key: `"point"`, value: "{ } " }, type: "addObjectKey" },
  //   rootKey2,
  //   buggyText2,
  //   13
  // )!;
  // expect(insertSwap(buggyText2, cmd2)).toMatchSnapshot();

  // const buggyText3 = `{"bar": { } po }`;
  // const rootKey3 = findNodeByText(buggyText3, "}")!;
  // const cmd3 = modifyCodeByCommand(
  //   { payload: { key: `"point"`, value: "{ } " }, type: "addObjectKey" },
  //   rootKey3,
  //   buggyText3,
  //   13
  // )!;
  // expect(insertSwap(buggyText3, cmd3)).toMatchSnapshot();
});

test("modifyCodeByCommand - addObjectKey (buggy mark)", () => {
  const buggyText = `{"mark": {"type":"bar", col}} `;
  const rootKey = findNodeByText(buggyText, "col")!.parent!;
  const cmd = modifyCodeByCommand(
    { payload: { key: `"color"`, value: '""' }, type: "addObjectKey" },
    rootKey,
    buggyText,
    27
  )!;
  expect(insertSwap(buggyText, cmd)).toMatchSnapshot();
});

test("modifyCodeByCommand - addObjectKeyEvent (legend insert)", () => {
  const buggyText = `
{
  "padding": 5,
  leg
  "signals": []
}
`;
  const rootKey = findNodeByText(buggyText, "leg")!.parent!;
  const cmd = modifyCodeByCommand(
    { payload: { key: `"legends"`, value: "[]" }, type: "addObjectKey" },
    rootKey,
    buggyText,
    26
    // todo vary the char position a little bit
  )!;
  expect(insertSwap(buggyText, cmd)).toMatchSnapshot();
});

const copy = (x: any) => JSON.parse(JSON.stringify(x));

test("modifyCodeByCommand - removeObjectKey", () => {
  const makeCmd = (): MenuEvent =>
    copy({ payload: "", type: "removeObjectKey" });

  // test a bunch of object keys
  ["a", "d", "I", "f", "g"].forEach((text) => {
    const key = findNodeByText(exampleData, `"${text}"`)!;
    const cmd = modifyCodeByCommand(makeCmd(), key, exampleData, key.from)!;
    expect(insertSwap(exampleData, cmd)).toMatchSnapshot();
  });

  // remove all keys from an object
  [
    ["f", "g"],
    ["g", "f"],
  ].forEach(([firstKey, secondKey]) => {
    const key1 = findNodeByText(exampleData, `"${firstKey}"`)!;
    const updated = insertSwap(
      exampleData,
      modifyCodeByCommand(makeCmd(), key1, exampleData, key1.from)!
    );
    const key2 = findNodeByText(updated, `"${secondKey}"`)!;
    const cmd = modifyCodeByCommand(makeCmd(), key2, updated, key2.from)!;
    expect(insertSwap(updated, cmd)).toMatchSnapshot();
  });
});

test("modifyCodeByCommand - removeElementFromArray", () => {
  const makeCmd = (): MenuEvent =>
    copy({ payload: "", type: "removeElementFromArray" });

  // test a bunch of object keys
  ["1", "2", "3", `{ "f": 4, "g": 5 }`].forEach((text) => {
    const key = findNodeByText(exampleData, `${text}`)!;
    const cmd = modifyCodeByCommand(makeCmd(), key, exampleData, key.from)!;
    expect(insertSwap(exampleData, cmd)).toMatchSnapshot();
  });

  // remove all elements in an array
  [
    ["1", "2", "3"],
    ["3", "1", "2"],
    ["3", "2", "1"],
  ].forEach(([firstKey, secondKey, thirdKey]) => {
    const key1 = findNodeByText(exampleData, `${firstKey}`)!;
    const cmd0 = modifyCodeByCommand(makeCmd(), key1, exampleData, key1.from);
    const update1 = insertSwap(exampleData, cmd0!);
    const key2 = findNodeByText(update1, `${secondKey}`)!;
    const cmd = modifyCodeByCommand(makeCmd(), key2, update1, key2.from)!;
    const update2 = insertSwap(update1, cmd);

    const key3 = findNodeByText(update2, `${thirdKey}`)!;
    const cmd2 = modifyCodeByCommand(makeCmd(), key3, update2, key3.from)!;
    const update3 = insertSwap(update2, cmd2);
    expect(update3).toMatchSnapshot();
  });
});
