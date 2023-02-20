export function isDataTable(input: any): boolean {
  // array
  if (!Array.isArray(input)) {
    return false;
  }
  // array of objects
  if (!input.every((x) => typeof x === "object")) {
    return false;
  }

  const types = Array.from(
    new Set(input.flatMap((row) => Object.values(row).map((el) => typeof el)))
  );
  const allowed = new Set(["string", "number", "boolean"]);
  return types.every((typ) => allowed.has(typ));
}
