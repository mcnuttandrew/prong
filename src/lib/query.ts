import { JSONSchema } from "./JSONSchemaTypes";

type functionQueryType = (value: string) => boolean;
export type ProjectionQuery =
  | { type: "function"; query: functionQueryType }
  | { type: "index"; query: (number | string)[] }
  | { type: "regex"; query: RegExp }
  | { type: "value"; query: string[] }
  | { type: "schemaMatch"; query: string[] };

export function keyPathMatchesQuery(
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

function schemaMatchQuery(query: string[], typings: any): boolean {
  let refNames = [];
  if (Array.isArray(typings)) {
    refNames = typings
      .flatMap((type: JSONSchema) => [type?.$$refName, type?.$$labeledType])
      .filter((x) => x);
  } else if (typeof typings === "object") {
    refNames = [typings?.$$refName, typings?.$$labeledType].filter((x) => x);
  }
  const result = refNames.some((type) => {
    const last = type?.split("/").at(-1);
    return query.some((queryKey) => queryKey === last);
  });
  return result;
}

const simpleMatchers = {
  regex: regexQuery,
  value: valueQuery,
  function: functionQuery,
};
let cache: Record<string, boolean> = {};
export function runProjectionQuery(
  query: ProjectionQuery,
  keyPath: (string | number)[],
  nodeValue: string,
  typings: any[]
): boolean {
  const queryStr =
    query.type === "regex"
      ? JSON.stringify({ ...query, query: query.query.toString() })
      : JSON.stringify(query);
  const keyPathStr = JSON.stringify(keyPath);
  const cacheKey = `${queryStr}-${keyPathStr}-${nodeValue}}`;
  if (cache[cacheKey]) {
    return cache[cacheKey];
  }

  let pass = false;
  switch (query.type) {
    case "index":
      pass = keyPathMatchesQuery(query.query, keyPath);
      break;
    case "value":
    case "function":
    case "regex":
      pass = simpleMatchers[query.type](query.query as any, nodeValue);
      break;
    case "schemaMatch":
      pass = schemaMatchQuery(query.query, typings);
      break;
    default:
      return false;
  }
  cache[cacheKey] = pass;
  return pass;
}
