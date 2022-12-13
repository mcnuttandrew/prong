import { SyntaxNode } from "@lezer/common";
import { UpdateDispatch } from "./popover-menu/PopoverState";
import { nodeToId } from "./compute-menu-contents";

export type MenuEvent =
  | addElementAsSiblingInArrayEvent
  | addObjectKeyEvent
  | nullEvent
  | removeElementFromArrayEvent
  | removeObjectKeyEvent
  | simpleSwapEvent
  | increaseItemIdxEvent
  | decreaseItemIdxEvent;
// | moveItemToEndEvent
// | moveItemToStartEvent;

// | duplicateElementInArrayEvent;
type nullEvent = { type: "nullEvent"; nodeId: string };
type simpleSwapEvent = { type: "simpleSwap"; payload: string; nodeId: string };
type addObjectKeyEvent = {
  type: "addObjectKey";
  payload: { key: string; value: string };
  nodeId: string;
};
type addElementAsSiblingInArrayEvent = {
  type: "addElementAsSiblingInArray";
  payload: string;
  nodeId: string;
};
type removeObjectKeyEvent = { type: "removeObjectKey"; nodeId: string };
type removeElementFromArrayEvent = {
  type: "removeElementFromArray";
  nodeId: string;
};
type increaseItemIdxEvent = { type: "increaseItemIdx"; nodeId: string };
type decreaseItemIdxEvent = { type: "decreaseItemIdx"; nodeId: string };

// type duplicateElementInArrayEvent = {
//   type: "duplicateElementInArray";
//   payload: any;
// };
type ModifyCmd<A extends MenuEvent> = (
  value: A,
  syntaxNode: SyntaxNode,
  currentText: string
) => UpdateDispatch | undefined;

export const boundCheck = (node: SyntaxNode) => {
  const prevType = node.prevSibling?.type.name;
  const isFirst = !prevType || new Set(["⚠", "[", "{"]).has(prevType);
  const nextType = node.nextSibling?.type.name;
  const isLast = !nextType || new Set(["⚠", "]", "}"]).has(nextType);
  return { isFirst, isLast };
};

const checkAndLift =
  (boundFunction: ModifyCmd<any>, isPrev: boolean): ModifyCmd<any> =>
  (value, syntaxNode, currentText) => {
    let node = syntaxNode;
    if (syntaxNode.type.name === "PropertyName") {
      node = syntaxNode.parent!;
    }
    const bound = boundCheck(node);
    const sib = isPrev ? node.prevSibling : node.nextSibling;
    const atBoundart = isPrev ? bound.isFirst : bound.isLast;
    if (!sib || atBoundart) {
      return undefined;
    }
    return boundFunction(value, node, currentText);
  };
const decreaseItemIdx: ModifyCmd<decreaseItemIdxEvent> = checkAndLift(
  (value, node, currentText) => {
    const sib = node.prevSibling!;
    const prev = currentText.slice(sib.from, sib.to);
    const curr = currentText.slice(node.from, node.to);
    const join = currentText.slice(sib.to, node.from);
    return { value: `${curr}${join}${prev}`, from: sib.from, to: node.to };
  },
  true
);

const increaseItemIdx: ModifyCmd<decreaseItemIdxEvent> = checkAndLift(
  (value, node, currentText) => {
    const sib = node.nextSibling!;
    const next = currentText.slice(sib.from, sib.to);
    const curr = currentText.slice(node.from, node.to);
    const join = currentText.slice(node.to, sib.from);
    return { value: `${next}${join}${curr}`, from: node.from, to: sib.to };
  },
  false
);

const removeObjectKey: ModifyCmd<removeObjectKeyEvent> = (
  value,
  syntaxNode
) => {
  const objNode =
    syntaxNode.type.name === "Property" ? syntaxNode : syntaxNode.parent!;

  let from: number;
  let to: number;

  const prevType = objNode.prevSibling!.type.name;
  const nextType = objNode.nextSibling!.type.name;
  const prevTypeIsCurly = new Set(["⚠", "{"]).has(prevType);
  const nextTypeIsCurly = new Set(["⚠", "}"]).has(nextType);

  if (!prevTypeIsCurly && !nextTypeIsCurly) {
    from = objNode.from;
    to = objNode.nextSibling!.from;
  }

  if (!prevTypeIsCurly && nextTypeIsCurly) {
    from = objNode.prevSibling!.to;
    to = objNode.nextSibling!.from;
  }

  if (prevTypeIsCurly && !nextTypeIsCurly) {
    from = objNode.from;
    to = objNode.nextSibling!.from;
  }

  if (prevTypeIsCurly && nextTypeIsCurly) {
    from = objNode.prevSibling!.to;
    to = objNode.nextSibling!.from;
  }
  return { value: "", from: from!, to: to! };
};

const removeElementFromArray: ModifyCmd<removeElementFromArrayEvent> = (
  value,
  syntaxNode
) => {
  let from: number;
  let to: number;
  const prevType = syntaxNode.prevSibling?.type.name || "⚠";
  const nextType = syntaxNode.nextSibling?.type.name || "⚠";
  const prevTypeIsBracket = new Set(["⚠", "["]).has(prevType);
  const nextTypeIsBracket = new Set(["⚠", "]"]).has(nextType);

  if (!prevTypeIsBracket && !nextTypeIsBracket) {
    from = syntaxNode.from;
    to = syntaxNode.nextSibling!.from;
  }

  if (!prevTypeIsBracket && nextTypeIsBracket) {
    from = syntaxNode.prevSibling!.to;
    to = syntaxNode.nextSibling!.from;
  }

  if (prevTypeIsBracket && !nextTypeIsBracket) {
    from = syntaxNode.from;
    to = syntaxNode.nextSibling!.from;
  }

  if (prevTypeIsBracket && nextTypeIsBracket) {
    from = syntaxNode.prevSibling!.to;
    to = syntaxNode.nextSibling!.from;
  }
  return { value: "", from: from!, to: to! };
};

const simpleSwap: ModifyCmd<simpleSwapEvent> = (value, syntaxNode) => {
  const from = syntaxNode.from;
  const to = syntaxNode.to;
  return { value: value.payload, from, to };
};

// only does the simplified case of add into the end of an object
const addObjectKey: ModifyCmd<addObjectKeyEvent> = (
  { payload: { key, value } },
  syntaxNode,
  currentText
) => {
  const rightBrace = syntaxNode.lastChild!;
  const prevSib = rightBrace.prevSibling!;
  // new object
  if (prevSib.type.name === "{") {
    return {
      value: `{${key}: ${value}}`,
      from: prevSib.from,
      to: rightBrace.to,
    };
  }
  // trailing comma
  if (prevSib.type.name === "⚠") {
    return {
      value: `, ${key}: ${value}`,
      from: prevSib.to - 1,
      to: prevSib.to,
    };
  }
  // does the previous items have a line break separating them?
  let lineBreakSep: false | string = false;
  if (prevSib && prevSib.prevSibling) {
    const diffSlice = currentText.slice(prevSib.prevSibling.to, prevSib.from);
    if (diffSlice.includes("\n")) {
      lineBreakSep = diffSlice.split("\n")[1];
    }
  }

  // regular object with stuff in it
  return {
    value: lineBreakSep
      ? `,\n${lineBreakSep}${key}: ${value}\n${lineBreakSep}`
      : `, ${key}: ${value}`,
    from: prevSib.to,
    to: rightBrace.from,
  };
};

// always add as sibling following the target
// not sure how to target an empty array?
const addElementAsSiblingInArray: ModifyCmd<addElementAsSiblingInArrayEvent> = (
  { payload },
  syntaxNode
) => {
  // WIP
  let from: number;
  let to: number;
  let value = payload;
  const currentTypeIsBacket = syntaxNode.type.name === "[";
  // const prevType = syntaxNode.prevSibling?.type.name || "⚠";
  const nextType = syntaxNode.nextSibling?.type.name || "⚠";
  // const prevTypeIsBracket = new Set(["⚠", "["]).has(prevType);
  const nextTypeIsBracket = new Set(["⚠", "]"]).has(nextType);

  // case: []
  if (currentTypeIsBacket && nextType === "]") {
    from = syntaxNode.from;
    to = syntaxNode.to;
    value = `[${payload}`;
  }

  // case [X1]
  if (currentTypeIsBacket && !nextTypeIsBracket) {
    from = syntaxNode.from;
    to = syntaxNode.from;
    value = `[${payload}, `;
  }

  if (!currentTypeIsBacket && !nextTypeIsBracket) {
    from = syntaxNode.to + 1;
    to = syntaxNode.to + 1;
    value = ` ${payload},`;
  }

  if (!currentTypeIsBacket && nextType === "]") {
    from = syntaxNode.to;
    to = syntaxNode.to;
    value = `, ${payload}`;
  }
  if (!currentTypeIsBacket && nextType === "⚠") {
    from = syntaxNode.to;
    to = syntaxNode.to;
    value = `, ${payload}`;
  }

  if (currentTypeIsBacket && !nextTypeIsBracket) {
    from = syntaxNode.from;
    to = syntaxNode.nextSibling!.from;
  }

  return { value, from: from!, to: to! };
};

// todo fix this type string
// todo maybe also add typings about what objects are expected???
const CmdTable: Record<string, ModifyCmd<any>> = {
  duplicateElementInArray: () => undefined,
  addElementAsSiblingInArray,
  addObjectKey,
  removeElementFromArray,
  removeObjectKey,
  simpleSwap,
  decreaseItemIdx,
  increaseItemIdx,
};
export const modifyCodeByCommand: ModifyCmd<any> = (
  value,
  syntaxNode,
  currentText
) => {
  if (!CmdTable[value.type]) {
    return { from: 0, to: 0, value: "" };
  }
  const targetNode = possiblyModifyChosenNode(value, syntaxNode);
  const result = CmdTable[value.type](value, targetNode, currentText);
  return result || { from: 0, to: 0, value: "" };
};

const climbToRoot = (node: SyntaxNode): SyntaxNode =>
  node.parent ? climbToRoot(node.parent) : node;

function findSyntaxNodeById(node: SyntaxNode, id: string): SyntaxNode | null {
  //   const root = (node as any).context as SyntaxNode;
  const root = climbToRoot(node);
  let foundNode: SyntaxNode | null = null;
  root.tree?.iterate({
    enter: ({ node }) => {
      if (foundNode) {
        return;
      }

      if (nodeToId(node) === id) {
        foundNode = node;
      }
    },
  });
  return foundNode;
}

const possiblyModifyChosenNode = (
  menuEvent: MenuEvent,
  syntaxNode: SyntaxNode
) => {
  const targetNode = menuEvent.nodeId
    ? findSyntaxNodeById(syntaxNode, menuEvent.nodeId) || syntaxNode
    : syntaxNode;

  return targetNode;
};
