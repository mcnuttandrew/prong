import { keyPathMatchesQuery } from "./utils";

test("keyPathMatchesQuery", () => {
  expect(
    keyPathMatchesQuery(["data", "values", "*"], ["data", "values", 1])
  ).toBe(true);
  expect(keyPathMatchesQuery(["data", "values"], ["data", "values", 1])).toBe(
    false
  );
  expect(
    keyPathMatchesQuery(["data", "values", "*"], ["encoding", "x", "field-key"])
  ).toBe(false);
});
