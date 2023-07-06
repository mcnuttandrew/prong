import { SyntaxNode } from "@lezer/common";
import { MenuEvent } from "./modify-json";
import { SchemaMap } from "../components/Editor";
import { JSONSchema7 } from "json-schema";
import { Projection } from "./projections";

import { LintError } from "./Linter";

import {
  evalTypeBasedContent,
  evalParentBasedContent,
} from "./menu-content/type-based";
import { evalSchemaChunks } from "./menu-content/schema-based";

export type MenuRow = { label: string; elements: MenuElement[] };
export type MenuElement =
  | {
      type: "button";
      label?: string;
      content: string;
      onSelect: MenuEvent;
    }
  | { type: "display"; label?: string; content: string }
  | { type: "free-input"; label: string }
  | {
      type: "projection";
      projectionType: Projection["type"];
      label?: string;
      element: JSX.Element;
    };

export const nodeToId = (node: SyntaxNode): `${number}-${number}` =>
  `${node.from}-${node.to}`;

export function prepDiagnostics(
  diagnostics: LintError[],
  targetNode: SyntaxNode
) {
  return diagnostics
    .filter(
      (x) =>
        (x.from === targetNode.from || x.from === targetNode.from - 1) &&
        (x.to === targetNode.to || x.to === targetNode.to + 1)
      // more generous than we need to be with the linter errors
    )
    .map((lint) => ({
      label: "Lint error",
      elements: [
        { type: "display", content: lint.message },
        ...(lint.expected || []).map((expectation: string) => {
          return {
            type: "button",
            content: `Switch to ${expectation}`,
            onSelect: {
              type: "simpleSwap",
              payload:
                expectation in simpleTypes
                  ? simpleTypes[expectation]
                  : `"${expectation}"`,
              nodeId: nodeToId(targetNode),
            },
          };
        }),
      ],
    }))
    .filter((x) => x);
}
export const simpleTypes: Record<string, any> = {
  string: "",
  object: `{ } `,
  number: "0",
  boolean: true,
  array: "[ ] ",
  null: "null",
};
export const literalTypes: Record<string, string> = {
  string: '""',
  integer: "0",
  number: "0",
  boolean: "true",
  null: "null",
};

export const liminalNodeTypes = new Set(["⚠", "{", "}", "[", "]"]);
export function retargetToAppropriateNode(
  node: SyntaxNode | SyntaxNode
): SyntaxNode | SyntaxNode {
  let targetNode = node;
  if (liminalNodeTypes.has(node.type.name)) {
    targetNode = node.parent!;
  } else if (node.type.name === "PropertyName") {
    targetNode = node.nextSibling!;
  }
  return targetNode;
}

function getSchemaForRetargetedNode(
  node: SyntaxNode,
  schemaMap: SchemaMap
): JSONSchema7[] {
  let targetNode = retargetToAppropriateNode(node);
  const from = targetNode.from;
  const to = targetNode.to;

  let schemaChunk: JSONSchema7[] = schemaMap[`${from}-${to}`];
  return schemaChunk;
  // todo remove below
  // if (schemaChunk?.length > 1) {
  //   return { anyOf: schemaChunk };
  // } else if (schemaChunk?.length === 1) {
  //   return schemaChunk[0];
  // }
  // // implying that its not an array?
  // return schemaChunk as any as JSONSchema7;
}

const safeStringify = (obj: any, indent = 2) => {
  let cache: any = [];
  const retVal = JSON.stringify(
    obj,
    (key, value) =>
      typeof value === "object" && value !== null
        ? cache.includes(value)
          ? undefined // Duplicate reference found, discard key
          : cache.push(value) && value // Store value in our collection
        : value,
    indent
  );
  cache = null;
  return retVal;
};

function getCacheKeyForElement(el: MenuElement): string {
  switch (el.type) {
    case "free-input":
      return "free-input";
    case "button":
      return el.content;
    case "display":
    case "projection":
    default:
      return safeStringify(el);
  }
}

function deduplicate(rows: MenuElement[]): any[] {
  const hasSeen: Set<string> = new Set([]);
  return rows.filter((x) => {
    const key = getCacheKeyForElement(x);
    if (hasSeen.has(key)) {
      return false;
    }
    hasSeen.add(key);
    return true;
  });
}

export function simpleMerge(content: MenuRow[]): MenuRow[] {
  const groups = content.reduce((acc: Record<string, any[]>, row) => {
    acc[row.label] = (acc[row.label] || []).concat(row.elements);
    return acc;
  }, {});

  return Object.entries(groups).map(
    ([label, elements]) =>
      ({ label, elements: deduplicate(elements).filter((x) => x) } as MenuRow)
  );
}

function getCompareString(element: MenuElement): string {
  switch (element.type) {
    case "button":
    case "display":
      return element.content;
    case "free-input":
    case "projection":
    default:
      return "ZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZ";
  }
}

function sortMenuContents(content: MenuRow[]): MenuRow[] {
  return content.map((row) => ({
    ...row,
    elements: row.elements.sort((a, b) =>
      getCompareString(a).localeCompare(getCompareString(b))
    ),
  }));
}

export function generateMenuContent(
  syntaxNode: SyntaxNode,
  schemaMap: SchemaMap,
  fullCode: string
): MenuRow[] {
  const schemaChunk = getSchemaForRetargetedNode(syntaxNode, schemaMap);

  const content: MenuRow[] = [
    { name: "evalSchemaChunks", fun: evalSchemaChunks },
    { name: "evalTypeBasedContent", fun: evalTypeBasedContent },
    { name: "evalParentBasedContent", fun: evalParentBasedContent },
  ]
    .flatMap(({ fun, name }) => {
      try {
        return fun(syntaxNode, schemaChunk, fullCode);
      } catch (e) {
        console.log("error in ", name);
        console.error(e);
        return [];
      }
    })
    .filter((x) => x);

  let computedMenuContents = simpleMerge(content).filter(
    (x) => x.elements.length
  );
  computedMenuContents = sortMenuContents(computedMenuContents);
  return computedMenuContents;
}
