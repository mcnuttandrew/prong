import { insertSwap } from "./utils";
import { modifyCodeByCommand, MenuEvent } from "./modify-json";
import { findNodeByText } from "./test-utils";

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

test.only("modifyCodeByCommand - decreaseItemIdx", () => {
  ["1", "2", "3", '"a"', '"d"', '"e"', '"I"'].forEach((key) => {
    const keyNode = findNodeByText(exampleData, key)!;
    const cmd = modifyCodeByCommand(
      { payload: key, type: "decreaseItemIdx" },
      keyNode,
      exampleData
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
      exampleData
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
      exampleData
    )!;
    expect(insertSwap(exampleData, cmd)).toMatchSnapshot();
  });
  // may also want to check that it swaps in arrays fine?
  // const threeKey =
});

test("modifyCodeByCommand - addElementAsSiblingInArray", () => {
  const makeCmd = (): MenuEvent =>
    copy({ type: "addElementAsSiblingInArray", payload: "-9" });
  // insert from left
  const key1 = findNodeByText(exampleData, "1")!.prevSibling!;
  const cmd1 = modifyCodeByCommand(makeCmd(), key1, exampleData)!;
  const result1 = insertSwap(exampleData, cmd1);
  expect(result1).toMatchSnapshot();

  // insert to right with trailing comma
  const exampleData2 = exampleData.replace("3", "3,");
  const key2 = findNodeByText(exampleData2, "3")!;
  const cmd2 = modifyCodeByCommand(makeCmd(), key2, exampleData)!;
  const result2 = insertSwap(exampleData, cmd2);
  expect(result2).toMatchSnapshot();

  // test empty array
  const exampleData3 = exampleData.replace("3", "[]");
  const key3 = findNodeByText(exampleData3, "[]")!.firstChild!;
  const cmd3 = modifyCodeByCommand(makeCmd(), key3, exampleData)!;
  const result3 = insertSwap(exampleData3, cmd3);
  expect(result3).toMatchSnapshot();

  // insert at each place across array
  [1, 2, 3].forEach((key) => {
    const foundKey = findNodeByText(exampleData, `${key}`)!;
    const cmd = modifyCodeByCommand(makeCmd(), foundKey, exampleData)!;
    const result = insertSwap(exampleData, cmd);
    expect(result).toMatchSnapshot();
  });

  expect(true).toBe(true);
});

test("modifyCodeByCommand - addObjectKey", () => {
  [exampleData, `{ "f": 4, "g": 5 }`].forEach((targKey) => {
    const rootKey = findNodeByText(exampleData, targKey)!;
    const cmd = modifyCodeByCommand(
      { payload: { key: `"J"`, value: "[6, 7, 8]" }, type: "addObjectKey" },
      rootKey,
      exampleData
    )!;
    expect(insertSwap(exampleData, cmd)).toMatchSnapshot();
  });

  const cmd2 = modifyCodeByCommand(
    { payload: { key: `"J"`, value: "{}" }, type: "addObjectKey" },
    findNodeByText(exampleData, exampleData)!,
    exampleData
  )!;
  const update1 = insertSwap(exampleData, cmd2);
  const newObjKey = findNodeByText(update1, "{}")!;
  const cmd3 = modifyCodeByCommand(
    { payload: { key: `"X"`, value: '"Y"' }, type: "addObjectKey" },
    newObjKey,
    update1
  )!;
  expect(insertSwap(update1, cmd3)).toMatchSnapshot();
});

const copy = (x: any) => JSON.parse(JSON.stringify(x));

test("modifyCodeByCommand - removeObjectKey", () => {
  const makeCmd = (): MenuEvent =>
    copy({ payload: "", type: "removeObjectKey" });

  // test a bunch of object keys
  ["a", "d", "I", "f", "g"].forEach((text) => {
    const key = findNodeByText(exampleData, `"${text}"`)!;
    const cmd = modifyCodeByCommand(makeCmd(), key, exampleData)!;
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
      modifyCodeByCommand(makeCmd(), key1, exampleData)!
    );
    const key2 = findNodeByText(updated, `"${secondKey}"`)!;
    const cmd = modifyCodeByCommand(makeCmd(), key2, updated)!;
    expect(insertSwap(updated, cmd)).toMatchSnapshot();
  });
});

test("modifyCodeByCommand - removeElementFromArray", () => {
  const makeCmd = (): MenuEvent =>
    copy({ payload: "", type: "removeElementFromArray" });

  // test a bunch of object keys
  ["1", "2", "3", `{ "f": 4, "g": 5 }`].forEach((text) => {
    const key = findNodeByText(exampleData, `${text}`)!;
    const cmd = modifyCodeByCommand(makeCmd(), key, exampleData)!;
    expect(insertSwap(exampleData, cmd)).toMatchSnapshot();
  });

  // remove all elements in an array
  [
    ["1", "2", "3"],
    ["3", "1", "2"],
    ["3", "2", "1"],
  ].forEach(([firstKey, secondKey, thirdKey]) => {
    const key1 = findNodeByText(exampleData, `${firstKey}`)!;
    const cmd0 = modifyCodeByCommand(makeCmd(), key1, exampleData);
    const update1 = insertSwap(exampleData, cmd0!);
    // console.log(key1);
    const key2 = findNodeByText(update1, `${secondKey}`)!;
    const cmd = modifyCodeByCommand(makeCmd(), key2, update1)!;
    const update2 = insertSwap(update1, cmd);

    const key3 = findNodeByText(update2, `${thirdKey}`)!;
    const cmd2 = modifyCodeByCommand(makeCmd(), key3, update2)!;
    const update3 = insertSwap(update2, cmd2);
    expect(update3).toMatchSnapshot();
  });
});
