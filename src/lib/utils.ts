import { EditorView } from "@codemirror/view";
import { syntaxTree } from "@codemirror/language";
import { EditorState } from "@codemirror/state";
import { SyntaxNode } from "@lezer/common";
import * as Json from "jsonc-parser";
import { UpdateDispatch } from "./popover-menu/PopoverState";
import { getMatchingSchemas } from "./from-vscode/validator";

export function codeString(
  view: EditorView,
  from: number,
  to?: number
): string {
  return view.state.doc.sliceString(from, to);
}

export function codeStringState(
  state: EditorState,
  from: number,
  to?: number
): string {
  return state.doc.sliceString(from, to);
}

export function classNames(input: Record<string, boolean>) {
  return Object.entries(input)
    .filter(([key, value]) => value)
    .map(([key]) => key)
    .join(" ");
}

export function unwrap(value: any, errorMessage: string) {
  if (value === null || value === undefined) {
    throw new Error(errorMessage);
  } else {
    return value;
  }
}
export const colorNames: { [key: string]: string } = {
  aliceblue: "#f0f8ff",
  antiquewhite: "#faebd7",
  aqua: "#00ffff",
  aquamarine: "#7fffd4",
  azure: "#f0ffff",
  beige: "#f5f5dc",
  bisque: "#ffe4c4",
  black: "#000000",
  blanchedalmond: "#ffebcd",
  blue: "#0000ff",
  blueviolet: "#8a2be2",
  brown: "#a52a2a",
  burlywood: "#deb887",
  cadetblue: "#5f9ea0",
  chartreuse: "#7fff00",
  chocolate: "#d2691e",
  coral: "#ff7f50",
  cornflowerblue: "#6495ed",
  cornsilk: "#fff8dc",
  crimson: "#dc143c",
  cyan: "#00ffff",
  darkblue: "#00008b",
  darkcyan: "#008b8b",
  darkgoldenrod: "#b8860b",
  darkgray: "#a9a9a9",
  darkgreen: "#006400",
  darkkhaki: "#bdb76b",
  darkmagenta: "#8b008b",
  darkolivegreen: "#556b2f",
  darkorange: "#ff8c00",
  darkorchid: "#9932cc",
  darkred: "#8b0000",
  darksalmon: "#e9967a",
  darkseagreen: "#8fbc8f",
  darkslateblue: "#483d8b",
  darkslategray: "#2f4f4f",
  darkturquoise: "#00ced1",
  darkviolet: "#9400d3",
  deeppink: "#ff1493",
  deepskyblue: "#00bfff",
  dimgray: "#696969",
  dodgerblue: "#1e90ff",
  firebrick: "#b22222",
  floralwhite: "#fffaf0",
  forestgreen: "#228b22",
  fuchsia: "#ff00ff",
  gainsboro: "#dcdcdc",
  ghostwhite: "#f8f8ff",
  gold: "#ffd700",
  goldenrod: "#daa520",
  gray: "#808080",
  green: "#008000",
  greenyellow: "#adff2f",
  honeydew: "#f0fff0",
  hotpink: "#ff69b4",
  indianred: "#cd5c5c",
  indigo: "#4b0082",
  ivory: "#fffff0",
  khaki: "#f0e68c",
  lavender: "#e6e6fa",
  lavenderblush: "#fff0f5",
  lawngreen: "#7cfc00",
  lemonchiffon: "#fffacd",
  lightblue: "#add8e6",
  lightcoral: "#f08080",
  lightcyan: "#e0ffff",
  lightgoldenrodyellow: "#fafad2",
  lightgray: "#d3d3d3",
  lightgreen: "#90ee90",
  lightpink: "#ffb6c1",
  lightsalmon: "#ffa07a",
  lightseagreen: "#20b2aa",
  lightskyblue: "#87cefa",
  lightslategray: "#778899",
  lightsteelblue: "#b0c4de",
  lightyellow: "#ffffe0",
  lime: "#00ff00",
  limegreen: "#32cd32",
  linen: "#faf0e6",
  magenta: "#ff00ff",
  maroon: "#800000",
  mediumaquamarine: "#66cdaa",
  mediumblue: "#0000cd",
  mediumorchid: "#ba55d3",
  mediumpurple: "#9370d8",
  mediumseagreen: "#3cb371",
  mediumslateblue: "#7b68ee",
  mediumspringgreen: "#00fa9a",
  mediumturquoise: "#48d1cc",
  mediumvioletred: "#c71585",
  midnightblue: "#191970",
  mintcream: "#f5fffa",
  mistyrose: "#ffe4e1",
  moccasin: "#ffe4b5",
  navajowhite: "#ffdead",
  navy: "#000080",
  oldlace: "#fdf5e6",
  olive: "#808000",
  olivedrab: "#6b8e23",
  orange: "#ffa500",
  orangered: "#ff4500",
  orchid: "#da70d6",
  palegoldenrod: "#eee8aa",
  palegreen: "#98fb98",
  paleturquoise: "#afeeee",
  palevioletred: "#d87093",
  papayawhip: "#ffefd5",
  peachpuff: "#ffdab9",
  peru: "#cd853f",
  pink: "#ffc0cb",
  plum: "#dda0dd",
  powderblue: "#b0e0e6",
  purple: "#800080",
  rebeccapurple: "#663399",
  red: "#ff0000",
  rosybrown: "#bc8f8f",
  royalblue: "#4169e1",
  saddlebrown: "#8b4513",
  salmon: "#fa8072",
  sandybrown: "#f4a460",
  seagreen: "#2e8b57",
  seashell: "#fff5ee",
  sienna: "#a0522d",
  silver: "#c0c0c0",
  skyblue: "#87ceeb",
  slateblue: "#6a5acd",
  slategray: "#708090",
  snow: "#fffafa",
  springgreen: "#00ff7f",
  steelblue: "#4682b4",
  tan: "#d2b48c",
  teal: "#008080",
  thistle: "#d8bfd8",
  tomato: "#ff6347",
  turquoise: "#40e0d0",
  violet: "#ee82ee",
  wheat: "#f5deb3",
  white: "#ffffff",
  whitesmoke: "#f5f5f5",
  yellow: "#ffff00",
  yellowgreen: "#9acd32",
};

type NodeType =
  | "Object"
  | "Array"
  | "Property"
  | "PropertyName"
  | "String"
  | "Number"
  | "Boolean";
type AbsPathItem = {
  nodeType: NodeType;
  index: number;
  node: SyntaxNode;
};

function getChildren(syntaxNode: SyntaxNode): SyntaxNode[] {
  const children: SyntaxNode[] = [];
  let pointer = syntaxNode.firstChild;
  const bannedTypes = new Set(["[", "]", "{", "}"]);
  while (pointer) {
    if (!bannedTypes.has(pointer.type.name)) {
      children.push(pointer);
    }
    pointer = pointer.nextSibling;
  }
  return children;
}
export function syntaxNodeToAbsPath(node: SyntaxNode): AbsPathItem[] {
  const nodeType = node.name as NodeType;

  const parent = node.parent;
  const siblings = parent ? getChildren(parent) : [];
  const selfIndex: number = siblings.findIndex(
    (sib) => sib.from === node.from && sib.to === node.to
  );
  const add = [{ nodeType, index: selfIndex, node }];
  return (parent ? syntaxNodeToAbsPath(parent) : []).concat(add);
}

/**
 * Transform an absolute path item list into our key path notation
 * @param absPath
 * @param root
 * @returns
 */
function absPathToKeyPath(
  absPath: AbsPathItem[],
  root: any
): (string | number)[] {
  const keyPath: (string | number)[] = [];
  const pointerLog = [];
  let idx = 1;
  while (idx < absPath.length) {
    const item = absPath[idx];
    const pointer = getNestedVal(keyPath, root);
    pointerLog.push(pointer);
    switch (item.nodeType) {
      case "Array":
        if (absPath.at(idx + 1)) {
          const arrayKey = absPath[idx + 1].index;
          keyPath.push(arrayKey);
        }
        break;
      case "Object":
        if (absPath.at(idx + 1)) {
          const nextItem = absPath[idx + 1]; // a property node
          const targetIndex = nextItem.index;
          const objKey = Object.keys(pointer)[targetIndex];
          keyPath.push(objKey);
        }
        break;
      case "Property":
        break;
      case "PropertyName":
        const PropertyNameTerminal = keyPath.pop();
        keyPath.push(`${PropertyNameTerminal}___key`);
        break;
      case "Number":
      case "String":
      case "Boolean":
        const prevItem = absPath[idx - 1];
        if (prevItem.nodeType === "Property") {
          const terminal = keyPath.at(-1);
          keyPath.push(`${terminal}___value`);
        }
        break;
      default:
        break;
    }

    idx++;
  }
  return keyPath;
}

const getNestedVal = (props: (string | number)[], obj: any) =>
  props.reduce((a, prop) => a[prop], obj);

export function syntaxNodeToKeyPath(node: SyntaxNode, fullCode: string) {
  const absPath = syntaxNodeToAbsPath(node);
  let parsedRoot = {};
  try {
    parsedRoot = JSON.parse(fullCode);
  } catch (e) {
    return [];
  }

  return absPathToKeyPath(absPath, parsedRoot);
}

function findParseTargetWidth(
  tree: Json.Node,
  keyPath: (string | number)[]
): { from: number; to: number } | "error" {
  const [head, ...tail] = keyPath;
  if ((!head || `${head}`.includes("___val")) && head !== 0 && !tail.length) {
    return { from: tree.offset, to: tree.offset + tree.length };
  }
  switch (tree.type) {
    case "boolean":
    case "number":
    case "null":
    case "string":
      return "error";
    case "array":
      const nextItemArray = (tree.children || [])[head as number];
      return nextItemArray
        ? findParseTargetWidth(nextItemArray, tail)
        : "error";
    case "object":
      const itemProp = (tree.children || []).find((property) => {
        const [key] = property.children || [];
        return key ? key.value === head : "error";
      });
      return !itemProp ? "error" : findParseTargetWidth(itemProp, keyPath);
    case "property":
      const [key, value] = tree.children!;
      if (`${tail[0]}`.includes("___key")) {
        return { from: key.offset, to: key.offset + key.length };
      }
      return findParseTargetWidth(value, tail);
    default:
      return "error";
  }
}

export function setIn(
  keyPath: (string | number)[],
  newValue: any,
  content: string
): string {
  // todo maybe replace with https://gitlab.com/WhyNotHugo/tree-sitter-jsonc
  const parsedJson = Json.parseTree(content);
  // fail gracefully
  if (!parsedJson) {
    return content;
  }
  // traverse the parsed content using the keypath to find the place for insert
  const targetWindow = findParseTargetWidth(parsedJson, keyPath);
  if (targetWindow === "error") {
    return "error";
  }
  const value = typeof newValue === "string" ? `"${newValue}"` : newValue;
  return insertSwap(content, { ...targetWindow, value });
}

export function insertSwap(content: string, update: UpdateDispatch) {
  return (
    content.slice(0, update.from) + update.value + content.slice(update.to)
  );
}

export function applyAllCmds(content: string, updates: UpdateDispatch[]) {
  return updates.reduce((acc, row) => insertSwap(acc, row), content);
}

export function createNodeMap(schema: any, doc: string) {
  return getMatchingSchemas(schema, doc).then((matches) => {
    return matches.reduce((acc, { node, schema }) => {
      const [from, to] = [node.offset, node.offset + node.length];
      acc[`${from}-${to}`] = (acc[`${from}-${to}`] || []).concat(schema);
      return acc;
    }, {} as { [x: string]: any });
  });
}

export function getMenuTargetNode(state: EditorState) {
  const possibleMenuTargets: any[] = [];
  syntaxTree(state).iterate({
    enter: (nodeRef) => {
      const node = nodeRef.node;
      const ranges = state.selection.ranges;
      if (ranges.length !== 1 && ranges[0].from !== ranges[0].to) {
        return;
      }
      if (node.from <= ranges[0].from && node.to >= ranges[0].from) {
        possibleMenuTargets.push(node);
      }
    },
  });

  const target = possibleMenuTargets.reduce(
    (acc, row) => {
      const dist = row.to - row.from;
      return dist < acc.dist ? { dist, target: row } : acc;
    },
    { dist: Infinity, target: null }
  );
  return target.target;
}

export const simpleUpdate = (
  view: EditorView,
  from: number,
  to: number,
  insert: string
) => {
  view.dispatch(view.state.update({ changes: { from, to, insert } }));
};

export function simpleParse(content: any, defaultVal = {}) {
  try {
    return Json.parse(content);
  } catch (e) {
    console.log("simple parse fail", e);
    return defaultVal;
  }
}
