import { setIn, syntaxNodeToKeyPath, syntaxNodeToAbsPath } from "./utils";
import { vegaCode } from "../examples/example-data";
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

test("setIn", () => {
  const result1 = `{
    "a": false,
    "d": null,
    "e": [{ "f": 4, "g": 5 }],
    "I": "example",
  }`;
  expect(setIn(["a"], false, exampleData)).toBe(result1);
  const result2 = `{
    "a": {
      "b": [false, 2, 
        3],
      "c": true,
    },
    "d": null,
    "e": [{ "f": 4, "g": 5 }],
    "I": "example",
  }`;
  expect(setIn(["a", "b", 0], false, exampleData)).toBe(result2);
  const result3 = `{
    "a": {
      "b": [1, 2, 
        3],
      "c": true,
    },
    "d": null,
    "e": [{ "f": false, "g": 5 }],
    "I": "example",
  }`;
  expect(setIn(["e", 0, "f"], false, exampleData)).toBe(result3);
  expect(setIn(["e", "f"], false, exampleData)).toBe("error");
  expect(setIn(["x", "f"], false, exampleData)).toBe("error");

  const result4 = `{
    "a": {
      "x": [1, 2, 
        3],
      "c": true,
    },
    "d": null,
    "e": [{ "f": 4, "g": 5 }],
    "I": "example",
  }`;
  expect(setIn(["a", "b", "b___key"], "x", exampleData)).toBe(result4);
  const result5 = `{
    "a": {
      "b": [1, 2, 
        3],
      "c": true,
    },
    "d": null,
    "e": [{ "f": 4, "g": 5 }],
    "I": "big darn squid holy shit",
  }`;
  expect(setIn(["I"], "big darn squid holy shit", exampleData)).toBe(result5);
});

test("setIn - vegaCode", () => {
  const a = setIn(
    ["marks", 0, "encode", "hover", "stroke", "value", "value___value"],
    "green",
    vegaCode
  );
  expect(a).toMatchSnapshot();
  const b = setIn(
    ["marks", 0, "encode", "update", "stroke___val"],
    "purple",
    a
  );
  expect(b).toMatchSnapshot();
});

test("syntaxNodeToKeyPath", () => {
  ["firebrick", "steelblue", "marks", "extent[1]"].forEach((key) => {
    const node = findNodeByText(vegaCode, `"${key}"`)!;
    expect(syntaxNodeToKeyPath(node, vegaCode)).toMatchSnapshot();
  });
});

test("syntaxNodeToAbsPath", () => {
  ["firebrick", "extent[1]"].forEach((key) => {
    const node = findNodeByText(vegaCode, `"${key}"`)!;
    expect(
      syntaxNodeToAbsPath(node).map((x) => [x.index, x.nodeType])
    ).toMatchSnapshot();
  });
});
