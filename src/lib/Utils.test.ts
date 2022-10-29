import { keyPathMatchesQuery, setIn } from "./utils";

test("setIn", () => {
  const exampleData = `{
    "a": {
      "b": [1, 2, 3],
      "c": true,
    },
    "d": null,
    "e": [{ "f": 1, "g": 2 }],
  }`;
  const result1 = `{
    "a": false,
    "d": null,
    "e": [{ "f": 1, "g": 2 }],
  }`;
  expect(setIn(["a"], false, exampleData)).toBe(result1);
  const result2 = `{
    "a": {
      "b": [false, 2, 3],
      "c": true,
    },
    "d": null,
    "e": [{ "f": 1, "g": 2 }],
  }`;
  expect(setIn(["a", "b", 0], false, exampleData)).toBe(result2);
  const result3 = `{
    "a": {
      "b": [1, 2, 3],
      "c": true,
    },
    "d": null,
    "e": [{ "f": false, "g": 2 }],
  }`;
  expect(setIn(["e", 0, "f"], false, exampleData)).toBe(result3);
  expect(setIn(["e", "f"], false, exampleData)).toBe("error");
  expect(setIn(["x", "f"], false, exampleData)).toBe("error");

  const result4 = `{
    "a": {
      "x": [1, 2, 3],
      "c": true,
    },
    "d": null,
    "e": [{ "f": 1, "g": 2 }],
  }`;
  expect(setIn(["a", "b", "b___key"], "x", exampleData)).toBe(result4);
});

test("keyPathMatchesQuery", () => {
  const basicQuery = ["data", "values", "*"];
  expect(keyPathMatchesQuery(basicQuery, ["data", "values", 1])).toBe(true);
  expect(keyPathMatchesQuery(["data", "values"], ["data", "values", 1])).toBe(
    false
  );
  expect(
    keyPathMatchesQuery(basicQuery, ["encoding", "x", "field___key"])
  ).toBe(false);

  expect(keyPathMatchesQuery(basicQuery, [])).toBe(false);
  expect(keyPathMatchesQuery(basicQuery, ["$schema"])).toBe(false);
  expect(keyPathMatchesQuery(basicQuery, ["$schema", "$schema___key"])).toBe(
    false
  );
  expect(keyPathMatchesQuery(basicQuery, ["data"])).toBe(false);
  expect(keyPathMatchesQuery(basicQuery, ["data", "undefined___key"])).toBe(
    false
  );
  expect(keyPathMatchesQuery(basicQuery, ["data", "values"])).toBe(false);
  expect(keyPathMatchesQuery(basicQuery, ["data", "values", 0])).toBe(true);
  expect(keyPathMatchesQuery(basicQuery, ["data", "values", "0___key"])).toBe(
    true
  );
  expect(
    keyPathMatchesQuery(basicQuery, ["data", "values", 0, "a___key"])
  ).toBe(false);
  expect(
    keyPathMatchesQuery(basicQuery, ["data", "values", 0, "b___key"])
  ).toBe(false);
  expect(keyPathMatchesQuery(basicQuery, ["data", "values", 1])).toBe(true);
  expect(
    keyPathMatchesQuery(basicQuery, ["data", "values", 1, "a___key"])
  ).toBe(false);
  expect(
    keyPathMatchesQuery(basicQuery, ["data", "values", 1, "b___key"])
  ).toBe(false);
  expect(keyPathMatchesQuery(basicQuery, ["data", "values", 2])).toBe(true);

  expect(keyPathMatchesQuery(basicQuery, ["description"])).toBe(false);
  expect(
    keyPathMatchesQuery(basicQuery, ["description", "description___key"])
  ).toBe(false);
  expect(keyPathMatchesQuery(basicQuery, ["encoding"])).toBe(false);
  expect(keyPathMatchesQuery(basicQuery, ["encoding", "undefined___key"])).toBe(
    false
  );
  expect(keyPathMatchesQuery(basicQuery, ["encoding", "x"])).toBe(false);
  expect(keyPathMatchesQuery(basicQuery, ["encoding", "Xaxis"])).toBe(false);
  expect(
    keyPathMatchesQuery(basicQuery, ["encoding", "Xaxis", "labelAngle"])
  ).toBe(false);
  expect(
    keyPathMatchesQuery(basicQuery, [
      "encoding",
      "Xaxis",
      "labelAngle",
      "labelAngle___key",
    ])
  ).toBe(false);
  expect(
    keyPathMatchesQuery(basicQuery, ["encoding", "Xaxis", "undefined___key"])
  ).toBe(false);
  expect(keyPathMatchesQuery(basicQuery, ["encoding", "Xfield"])).toBe(false);
  expect(keyPathMatchesQuery(basicQuery, ["encoding", "Xfield___key"])).toBe(
    false
  );
  expect(
    keyPathMatchesQuery(basicQuery, ["encoding", "Xfield", "field___key"])
  ).toBe(false);
  expect(keyPathMatchesQuery(basicQuery, ["encoding", "Xtype"])).toBe(false);
  expect(
    keyPathMatchesQuery(basicQuery, ["encoding", "Xtype", "type___key"])
  ).toBe(false);
  expect(keyPathMatchesQuery(basicQuery, ["encoding", "y"])).toBe(false);
  expect(keyPathMatchesQuery(basicQuery, ["encoding", "y", "field"])).toBe(
    false
  );
  expect(
    keyPathMatchesQuery(basicQuery, ["encoding", "y", "field", "field___key"])
  ).toBe(false);
  expect(keyPathMatchesQuery(basicQuery, ["encoding", "y", "type"])).toBe(
    false
  );
  expect(keyPathMatchesQuery(basicQuery, ["encoding", "y", "type___key"])).toBe(
    false
  );
  expect(
    keyPathMatchesQuery(basicQuery, ["encoding", "y", "type", "type___key"])
  ).toBe(false);
  expect(keyPathMatchesQuery(basicQuery, ["mark"])).toBe(false);
  expect(keyPathMatchesQuery(basicQuery, ["mark", "mark___key"])).toBe(false);
});
