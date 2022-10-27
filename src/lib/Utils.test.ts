import { keyPathMatchesQuery } from "./utils";

test("keyPathMatchesQuery", () => {
  const basicQuery = ["data", "values", "*"];
  expect(keyPathMatchesQuery(basicQuery, ["data", "values", 1])).toBe(true);
  expect(keyPathMatchesQuery(["data", "values"], ["data", "values", 1])).toBe(
    false
  );
  expect(keyPathMatchesQuery(basicQuery, ["encoding", "x", "field-key"])).toBe(
    false
  );

  expect(keyPathMatchesQuery(basicQuery, [])).toBe(false);
  expect(keyPathMatchesQuery(basicQuery, ["$schema"])).toBe(false);
  expect(keyPathMatchesQuery(basicQuery, ["$schema", "$schema-key"])).toBe(
    false
  );
  expect(keyPathMatchesQuery(basicQuery, ["data"])).toBe(false);
  expect(keyPathMatchesQuery(basicQuery, ["data", "undefined-key"])).toBe(
    false
  );
  expect(keyPathMatchesQuery(basicQuery, ["data", "values"])).toBe(false);
  expect(keyPathMatchesQuery(basicQuery, ["data", "values", 0])).toBe(true);
  expect(keyPathMatchesQuery(basicQuery, ["data", "values", "0-key"])).toBe(
    true
  );
  expect(keyPathMatchesQuery(basicQuery, ["data", "values", 0, "a-key"])).toBe(
    false
  );
  expect(keyPathMatchesQuery(basicQuery, ["data", "values", 0, "b-key"])).toBe(
    false
  );
  expect(keyPathMatchesQuery(basicQuery, ["data", "values", 1])).toBe(true);
  expect(keyPathMatchesQuery(basicQuery, ["data", "values", 1, "a-key"])).toBe(
    false
  );
  expect(keyPathMatchesQuery(basicQuery, ["data", "values", 1, "b-key"])).toBe(
    false
  );
  expect(keyPathMatchesQuery(basicQuery, ["data", "values", 2])).toBe(true);

  expect(keyPathMatchesQuery(basicQuery, ["description"])).toBe(false);
  expect(
    keyPathMatchesQuery(basicQuery, ["description", "description-key"])
  ).toBe(false);
  expect(keyPathMatchesQuery(basicQuery, ["encoding"])).toBe(false);
  expect(keyPathMatchesQuery(basicQuery, ["encoding", "undefined-key"])).toBe(
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
      "labelAngle-key",
    ])
  ).toBe(false);
  expect(
    keyPathMatchesQuery(basicQuery, ["encoding", "Xaxis", "undefined-key"])
  ).toBe(false);
  expect(keyPathMatchesQuery(basicQuery, ["encoding", "Xfield"])).toBe(false);
  expect(keyPathMatchesQuery(basicQuery, ["encoding", "Xfield-key"])).toBe(
    false
  );
  expect(
    keyPathMatchesQuery(basicQuery, ["encoding", "Xfield", "field-key"])
  ).toBe(false);
  expect(keyPathMatchesQuery(basicQuery, ["encoding", "Xtype"])).toBe(false);
  expect(
    keyPathMatchesQuery(basicQuery, ["encoding", "Xtype", "type-key"])
  ).toBe(false);
  expect(keyPathMatchesQuery(basicQuery, ["encoding", "y"])).toBe(false);
  expect(keyPathMatchesQuery(basicQuery, ["encoding", "y", "field"])).toBe(
    false
  );
  expect(
    keyPathMatchesQuery(basicQuery, ["encoding", "y", "field", "field-key"])
  ).toBe(false);
  expect(keyPathMatchesQuery(basicQuery, ["encoding", "y", "type"])).toBe(
    false
  );
  expect(keyPathMatchesQuery(basicQuery, ["encoding", "y", "type-key"])).toBe(
    false
  );
  expect(
    keyPathMatchesQuery(basicQuery, ["encoding", "y", "type", "type-key"])
  ).toBe(false);
  expect(keyPathMatchesQuery(basicQuery, ["mark"])).toBe(false);
  expect(keyPathMatchesQuery(basicQuery, ["mark", "mark-key"])).toBe(false);
});
