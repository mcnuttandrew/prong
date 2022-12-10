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

export function argListToIntList(
  view: EditorView,
  argList: SyntaxNode[]
): number[] {
  return argList.map((child) =>
    parseInt(codeString(view, child.from, child.to))
  );
}

export function isColorFunc(s: string): boolean {
  switch (s) {
    case "color":
    case "fill":
    case "stroke":
    case "background":
      return true;
    default:
      return false;
  }
}

// todo: unused
export function isSliderFunc(s: string): boolean {
  return s === "_slider";
}

export function isArgToSpecialFunc(
  view: EditorView,
  node: SyntaxNode
): boolean {
  if (
    node.parent?.type?.name === "ArgList" &&
    node.parent?.parent?.type?.name === "CallExpression"
  ) {
    const theFuncNode = node.parent!.parent!.getChild("VariableName")!;
    const theFunc = codeString(view, theFuncNode.from, theFuncNode.to);
    return isColorFunc(theFunc) || isSliderFunc(theFunc);
  } else if (
    node.parent?.type?.name === "ArrayExpression" &&
    node.parent?.parent?.type?.name === "ArgList" &&
    node.parent?.parent?.parent?.type?.name === "CallExpression"
  ) {
    const theFuncNode = node.parent!.parent!.parent!.getChild("VariableName")!;
    const theFunc = codeString(view, theFuncNode.from, theFuncNode.to);
    return isColorFunc(theFunc) || isSliderFunc(theFunc);
  } else {
    return false;
  }
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

// https://www.w3schools.com/colors/colors_groups.asp

export const colorGroups = {
  pink: [
    "pink",
    "lightpink",
    "hotpink",
    "deeppink",
    "palevioletred",
    "mediumvioletred",
  ],
  purple: [
    "lavender",
    "thistle",
    "plum",
    "orchid",
    "violet",
    "fuchsia",
    "magenta",
    "mediumorchid",
    "darkorchid",
    "darkviolet",
    "blueviolet",
    "darkmagenta",
    "purple",
    "mediumpurple",
    "mediumslateblue",
    "slateblue",
    "darkslateblue",
    "rebeccapurple",
    "indigo",
  ],
  red: [
    "lightsalmon",
    "salmon",
    "darksalmon",
    "lightcoral",
    "indianred",
    "crimson",
    "red",
    "firebrick",
    "darkred",
  ],
  orange: ["orange", "darkorange", "coral", "tomato", "orangered"],
  yellow: [
    "gold",
    "yellow",
    "lightyellow",
    "lemonchiffon",
    "lightgoldenrodyellow",
    "papayawhip",
    "moccasin",
    "peachpuff",
    "palegoldenrod",
    "khaki",
    "darkkhaki",
  ],
  green: [
    "greenyellow",
    "chartreuse",
    "lawngreen",
    "lime",
    "limegreen",
    "palegreen",
    "lightgreen",
    "mediumspringgreen",
    "springgreen",
    "mediumseagreen",
    "seagreen",
    "forestgreen",
    "green",
    "darkgreen",
    "yellowgreen",
    "olivedrab",
    "darkolivegreen",
    "mediumaquamarine",
    "darkseagreen",
    "lightseagreen",
    "darkcyan",
    "teal",
  ],
  // maybe display cyan as part of blue
  cyan: [
    "aqua",
    "cyan",
    "lightcyan",
    "paleturquoise",
    "aquamarine",
    "turquoise",
    "mediumturquoise",
    "darkturquoise",
  ],
  blue: [
    "cadetblue",
    "steelblue",
    "lightsteelblue",
    "lightblue",
    "powderblue",
    "lightskyblue",
    "skyblue",
    "cornflowerblue",
    "deepskyblue",
    "dodgerblue",
    "royalblue",
    "blue",
    "mediumblue",
    "darkblue",
    "navy",
    "midnightblue",
  ],
  brown: [
    "cornsilk",
    "blanchedalmond",
    "bisque",
    "navajowhite",
    "wheat",
    "burlywood",
    "tan",
    "rosybrown",
    "sandybrown",
    "goldenrod",
    "darkgoldenrod",
    "peru",
    "chocolate",
    "olive",
    "saddlebrown",
    "sienna",
    "brown",
    "maroon",
  ],
  white: [
    "white",
    "snow",
    "honeydew",
    "mintcream",
    "azure",
    "aliceblue",
    "ghostwhite",
    "whitesmoke",
    "seashell",
    "beige",
    "oldlace",
    "floralwhite",
    "ivory",
    "antiquewhite",
    "linen",
    "lavenderblush",
    "mistyrose",
  ],
  gray: [
    "gainsboro",
    "lightgray",
    "silver",
    "darkgray",
    "dimgray",
    "gray",
    "lightslategray",
    "slategray",
    "darkslategray",
    "black",
  ],
};

type AbsPathItem = { nodeType: string; index: number; node: SyntaxNode };
function syntaxNodeToAbsPath(node: SyntaxNode): AbsPathItem[] {
  const nodeType = node.name;

  const parent = node.parent;
  const siblings = (parent && parent.getChildren(nodeType)) || [];
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
  let pointer = root;
  let idx = 1;
  while (idx < absPath.length) {
    const item = absPath[idx];
    pointerLog.push(pointer);
    if (item.nodeType === "Object" && absPath[idx + 1]) {
      const nextItem = absPath[idx + 1]; // a property node
      const targetIndex = nextItem.index;
      const key = Object.keys(pointer)[targetIndex];

      if (typeof pointer[key] === "object") {
        pointer = pointer[key];
      }
      keyPath.push(key);
      idx++;
    } else if (item.nodeType === "Array" && absPath[idx + 1]) {
      const key = absPath[idx + 1].index;
      keyPath.push(key);
      if (typeof pointer[key] === "object") {
        pointer = pointer[key];
      }
      idx++;
    }
    idx++;
  }
  const isChildOfProperty =
    absPath.length > 2 && absPath[absPath.length - 2].nodeType === "Property";
  const isPropertyKey = absPath[absPath.length - 1].nodeType === "PropertyName";
  // if we are looking at property name object
  if (isChildOfProperty && pointerLog[pointerLog.length - 1]) {
    const parent = absPath[absPath.length - 2];
    const val = Object.keys(pointerLog[pointerLog.length - 1])[parent.index];
    keyPath.push(isPropertyKey ? `${val}___key` : `${val}___val`);
  }
  return keyPath;
}

export function syntaxNodeToKeyPath(node: SyntaxNode, state: EditorState) {
  const absPath = syntaxNodeToAbsPath(node);
  const root = absPath[0];
  let parsedRoot = {};
  try {
    parsedRoot = JSON.parse(
      codeStringState(state, root.node.from, root.node.to)
    );
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

// // see this file for examples
// // https://github.com/codemirror/commands/blob/acab64fc3d911393b6728c1e8eacadf5c11cc9bf/src/commands.ts#L683
// import {
//   EditorState,
//   EditorSelection,
//   SelectionRange,
// } from "@codemirror/state";
// import { EditorView, KeyBinding } from "@codemirror/view";
// import { syntaxTree } from "@codemirror/language";
// import { SyntaxNode } from "@lezer/common";

// function updateSel(
//   sel: EditorSelection,
//   by: (range: SelectionRange) => SelectionRange
// ) {
//   return EditorSelection.create(sel.ranges.map(by), sel.mainIndex);
// }

// function setSel(
//   state: EditorState,
//   selection: EditorSelection | { anchor: number; head?: number }
// ) {
//   return state.update({
//     selection,
//     scrollIntoView: true,
//     userEvent: "select",
//   });
// }

// function findAstNode(
//   view: EditorView,
//   targetRange: [number, number]
// ): SyntaxNode | null {
//   const [targFrom, targTo] = targetRange;
//   const { from, to } = view.visibleRanges[0];
//   let smallestContainer: SyntaxNode | null = null;
//   let smallestContainerSize = Infinity;
//   syntaxTree(view.state).iterate({
//     from,
//     to,
//     enter: (type, from, to, get) => {
//       const rangeSize = to - from;
//       if (
//         from <= targFrom &&
//         to >= targTo &&
//         rangeSize < smallestContainerSize
//       ) {
//         smallestContainerSize = rangeSize;
//         smallestContainer = get();
//       }
//     },
//   });
//   return smallestContainer;
// }

// function moveOnAst(
//   view: EditorView,
//   nextNode: (x: SyntaxNode) => SyntaxNode | null
// ) {
//   const state = view.state;
//   const targ = state.selection.ranges[0];
//   const node = findAstNode(view, [targ.from, targ.to]); // or the whole thing

//   if (!node) {
//     console.log("nothing found");
//     return true;
//   }
//   const next = nextNode(node);
//   if (!next) {
//     console.log("no next");
//     return true;
//   }

//   let selection = updateSel(view.state.selection, (range) => {
//     return EditorSelection.range(next.from, next.to);
//   });
//   view.dispatch(setSel(view.state, selection));
//   return true;
// }

// const selectNextAstNode = (view: EditorView) =>
//   moveOnAst(view, (x) => x.nextSibling);
// const selectPrevAstNode = (view: EditorView) =>
//   moveOnAst(view, (x) => x.prevSibling);
// const selectChildAstNode = (view: EditorView) =>
//   moveOnAst(view, (x) => {
//     let child = x.firstChild;
//     if (!child) {
//       return child;
//     }
//     if (new Set(["{", "}"]).has(child.type.name)) {
//       return child.nextSibling;
//     }
//     return child;
//   });
// const selectParentAstNode = (view: EditorView) =>
//   moveOnAst(view, (x) => x.parent);

// // to do:
// // down -> go into element
// // up -> go up an ast level
// // left -> go to prev sibling or loop to end
// // right -> go to next sibling or return to start
// // enter -> open structure menu
// // esc -> close structure menu or go up a level
// // see https://developer.mozilla.org/en-US/docs/Web/API/KeyboardEvent/key
// export const ASTKeyBinding: readonly KeyBinding[] = [
//   {
//     key: "Cmd-ArrowRight",
//     run: selectNextAstNode,
//     preventDefault: true,
//   },
//   {
//     key: "Cmd-ArrowLeft",
//     run: selectPrevAstNode,
//     preventDefault: true,
//   },
//   {
//     key: "Cmd-ArrowUp",
//     run: selectParentAstNode,
//     preventDefault: true,
//   },
//   {
//     key: "Cmd-ArrowDown",
//     run: selectChildAstNode,
//     preventDefault: true,
//   },
// ];

// // Jet's Keybinding
// // h:          ascend
// // l:          descend
// // j:          next sibling
// // k:          previous sibling
// // J:          move down (in array)
// // K:          move up (in array)
// // i:          enter edit mode (string/number)
// // <C-s>:      save file
// // <SPACE>:    toggle boolean
// // <ESC>:      exit edit mode
// // <BS>:       delete key/element
// // <ENTER>:    add new key/element (object/array)
// // <TAB>:      toggle fold
// // f:          unfold all children
// // F:          fold all children
// // s:          replace element with string
// // b:          replace element with bool
// // n:          replace element with number
// // N:          replace element with null
// // a:          replace element with array
// // o:          replace element with object
// // u:          undo last change (undo buffer keeps 100 states)
// // <C-r>:      redo from undo states
// // y:          copy current value into buffer (and clipboard)
// // p:          paste value from buffer over current value
// // x:          cut a value, equivalent to a copy -> delete
// // q | ctrl-c: quit without saving. Due to a bug, tap twice
