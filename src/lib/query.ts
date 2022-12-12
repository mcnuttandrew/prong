type functionQueryType = (value: string) => boolean;
export type ProjectionQuery =
  | { type: "function"; query: functionQueryType }
  | { type: "index"; query: (number | string)[] }
  | { type: "regex"; query: RegExp }
  | { type: "value"; query: string[] };

function keyPathMatchesQueryCore(
  query: (string | number)[],
  keyPath: (string | number)[]
): boolean {
  if (query.length !== keyPath.length) {
    return false;
  }
  for (let idx = 0; idx < query.length; idx++) {
    if (query[idx] === "*") {
      continue;
    }
    if (query[idx] !== keyPath[idx]) {
      return false;
    }
  }

  return true;
}

function keyPathMatchesQueryMemoizer() {
  const pathMatchCache: Record<string, boolean> = {};
  return function (
    query: (string | number)[],
    keyPath: (string | number)[]
  ): boolean {
    const accessKey = `${query.join("XXXXX")}_________${keyPath.join("XXXXX")}`;
    if (pathMatchCache[accessKey]) {
      return pathMatchCache[accessKey];
    }
    const result = keyPathMatchesQueryCore(query, keyPath);
    pathMatchCache[accessKey] = result;
    return result;
  };
}
export const keyPathMatchesQuery = keyPathMatchesQueryMemoizer();

function valueQuery(query: string[], nodeValue: string): boolean {
  const strippedVal = nodeValue.slice(1, nodeValue.length - 1);
  return !!query.find((x) => x === strippedVal);
}

function functionQuery(query: functionQueryType, nodeValue: string) {
  return query(nodeValue);
}

function regexQuery(query: RegExp, nodeValue: string) {
  return !!nodeValue.match(query);
}

export function runProjectionQuery(
  query: ProjectionQuery,
  keyPath: (string | number)[],
  nodeValue: string
): boolean {
  switch (query.type) {
    case "index":
      return keyPathMatchesQuery(query.query, keyPath);
    case "value":
      return valueQuery(query.query, nodeValue);
    case "function":
      return functionQuery(query.query, nodeValue);
    case "regex":
      return regexQuery(query.query, nodeValue);
    default:
      return false;
  }
}