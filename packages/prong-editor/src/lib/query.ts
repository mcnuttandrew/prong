import { JSONSchema } from "./JSONSchemaTypes";
import { SyntaxNode } from "@lezer/common";

type NodeType = SyntaxNode["type"]["name"];
type functionQueryType = (
  value: string,
  nodeType: NodeType,
  keyPath: (string | number)[],
  cursorPosition: number,
  nodePos: { start: number; end: number }
) => boolean;
export type ProjectionQuery =
  | { type: "function"; query: functionQueryType }
  | { type: "index"; query: (number | string)[] }
  | { type: "multi-index"; query: (number | string)[][] }
  | { type: "regex"; query: RegExp }
  | { type: "value"; query: string[] }
  | { type: "schemaMatch"; query: string[] }
  | { type: "nodeType"; query: NodeType[] };

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

const functionQuery = (
  query: functionQueryType,
  ...args: Parameters<functionQueryType>
) => query(...args);

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
  const downcasedQuery = query.map((x) => x.toLowerCase());
  const result = refNames
    .map((x) => x.toLowerCase())
    .some((type) => {
      const last = type?.split("/").at(-1);
      return downcasedQuery.some((queryKey) => queryKey === last);
    });
  return result;
}

function nodeTypeMatch(query: NodeType[], nodeType: NodeType): boolean {
  return query.some((x) => x === nodeType);
}

const simpleMatchers = {
  regex: regexQuery,
  value: valueQuery,
  function: functionQuery,
};
const cache: Record<string, boolean> = {};
function buildCacheKey(
  query: ProjectionQuery,
  keyPath: (string | number)[],
  nodeValue: any,
  projId: number,
  cursorPos: number
) {
  const keyPathStr = JSON.stringify(keyPath);

  switch (query.type) {
    case "function": {
      const queryStr = JSON.stringify(query);
      return `${queryStr}-${keyPathStr}-${nodeValue}}-${projId}-${cursorPos}`;
    }
    case "regex": {
      const queryReg = JSON.stringify({
        ...query,
        query: query.query.toString(),
      });
      return `${queryReg}-${keyPathStr}-${nodeValue}}-${projId}`;
    }
    case "multi-index":
    case "index":
    case "nodeType":
    case "value":
    case "schemaMatch":
    default: {
      const queryStr = JSON.stringify(query);
      return `${queryStr}-${keyPathStr}-${nodeValue}}-${projId}`;
    }
  }
}
export function runProjectionQuery(props: {
  query: ProjectionQuery;
  keyPath: (string | number)[];
  nodeValue: string;
  typings: any[];
  nodeType: SyntaxNode["type"]["name"];
  projId: number;
  cursorPosition: number;
  nodePos: { start: number; end: number };
}): boolean {
  const {
    query,
    keyPath,
    nodeValue,
    projId,
    nodeType,
    typings,
    cursorPosition,
    nodePos,
  } = props;

  const cacheKey = buildCacheKey(
    query,
    keyPath,
    nodeValue,
    projId,
    cursorPosition
  );
  if (cache[cacheKey]) {
    return cache[cacheKey];
  }
  let pass = false;
  switch (query.type) {
    case "multi-index":
      pass = query.query.some((q) => keyPathMatchesQuery(q, keyPath));
      break;
    case "index":
      pass = keyPathMatchesQuery(query.query, keyPath);
      break;
    case "function":
      pass = functionQuery(
        query.query as any,
        nodeValue,
        nodeType,
        keyPath,
        cursorPosition,
        nodePos
      );
      break;
    case "nodeType":
      pass = nodeTypeMatch(query.query, nodeType);
      break;
    case "value":
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
