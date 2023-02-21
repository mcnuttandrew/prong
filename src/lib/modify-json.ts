import { SyntaxNode } from "@lezer/common";
import { UpdateDispatch } from "./popover-menu/PopoverState";
import { nodeToId, liminalNodeTypes } from "./compute-menu-contents";

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
type baseEvent = { nodeId: string };
interface nullEvent extends baseEvent {
  type: "nullEvent";
}
interface simpleSwapEvent extends baseEvent {
  type: "simpleSwap";
  payload: string;
}
interface addObjectKeyEvent extends baseEvent {
  type: "addObjectKey";
  payload: { key: string; value: string };
}
interface addElementAsSiblingInArrayEvent extends baseEvent {
  type: "addElementAsSiblingInArray";
  payload: string;
}
interface removeObjectKeyEvent extends baseEvent {
  type: "removeObjectKey";
}
interface removeElementFromArrayEvent extends baseEvent {
  type: "removeElementFromArray";
}
interface increaseItemIdxEvent extends baseEvent {
  type: "increaseItemIdx";
}
interface decreaseItemIdxEvent extends baseEvent {
  type: "decreaseItemIdx";
}

// type duplicateElementInArrayEvent = {
//   type: "duplicateElementInArray";
//   payload: any;
// };
type ModifyCmd<A extends MenuEvent> = (
  value: A,
  syntaxNode: SyntaxNode,
  currentText: string,
  cursorPos: number | undefined
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
  (value, syntaxNode, currentText, cursorPos) => {
    let node = syntaxNode;
    if (syntaxNode.type.name === "PropertyName") {
      node = syntaxNode.parent!;
    }
    const bound = boundCheck(node);
    const sib = isPrev ? node.prevSibling : node.nextSibling;
    const atBoundary = isPrev ? bound.isFirst : bound.isLast;
    if (!sib || atBoundary) {
      return undefined;
    }
    return boundFunction(value, node, currentText, cursorPos);
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

/**
 * Add object key function. Wow this is a mess
 * @param event
 * @param node
 * @param currentText
 * @param cursorPos
 * @returns
 */
const addObjectKey: ModifyCmd<addObjectKeyEvent> = (
  event,
  node,
  currentText,
  cursorPos
) => {
  const {
    payload: { key, value },
  } = event;
  // console.log("YYZ", event, node.type, currentText, cursorPos);
  // retarget to the object if we're somewhere inside
  let syntaxNode = node;

  if (syntaxNode.type.name === "JsonText") {
    syntaxNode = syntaxNode.firstChild!;
  } else if (syntaxNode.type.name !== "Object") {
    syntaxNode = syntaxNode.parent!;
    if (syntaxNode.type.name !== "Object") {
      throw Error("Add Object Key error");
    }
  }

  const rightBrace = syntaxNode.lastChild!;
  const prevSib = rightBrace.prevSibling!;
  const prevSibIsError = prevSib.type.name === "⚠";
  const prevSibIsBrace = prevSib.type.name === "{";
  const val = value === "" ? '""' : value;

  if (prevSibIsBrace) {
    return {
      value: `{${key}: ${val}}`,
      from: prevSib.from,
      to: rightBrace.to,
    };
  }
  // trailing comma or other error
  if (prevSibIsError) {
    const sub = currentText.slice(prevSib.to - 1, prevSib.to);
    const maybeComma = sub.includes(",") ? "" : ",";
    const precededByBracket = prevSib.prevSibling?.type.name === "{";
    const sep = precededByBracket ? "" : `${maybeComma} `;
    return {
      value: `${sep}${key}: ${val}`,
      from: prevSib.from + (sub.includes(",") || precededByBracket ? 0 : -1),
      to: prevSib.to,
    };
  }

  // targeted insertion is broken here :(
  const finalTarget = cursorPos
    ? rotateToAdaptivePosition(rightBrace.parent?.firstChild!, cursorPos)
    : prevSib;
  // const finalTarget = prevSib;
  // does the previous items have a line break separating them?
  let lineBreakSep: false | string = false;
  if (finalTarget && finalTarget.prevSibling) {
    const diffSlice = currentText.slice(
      finalTarget.prevSibling.to,
      finalTarget.from
    );
    if (diffSlice.includes("\n")) {
      lineBreakSep = diffSlice.split("\n")[1];
    }
  }
  if (finalTarget.type.name === "}" && prevSibIsError) {
    return {
      value: `{${key}: value}`,
      from: prevSib.prevSibling!.to,
      to: finalTarget.from,
    };
  }

  const nextIsBrace = finalTarget.nextSibling?.type.name === "}";
  const term = nextIsBrace ? "" : ",";
  // regular object with stuff in it
  return {
    value: lineBreakSep
      ? `,\n${lineBreakSep}${key}: ${val}${term}\n${lineBreakSep}`
      : `, ${key}: ${val}${term}`,
    // from: targIsBrace ? finalTarget.to - 1 : finalTarget.to,
    // to: targIsBrace ? finalTarget.to : finalTarget.nextSibling!.from,
    from: finalTarget.to,
    to: finalTarget.nextSibling!.from,
  };
};

function rotateToAdaptivePosition(
  node: SyntaxNode,
  cursorPos: number | undefined
): SyntaxNode {
  if (!cursorPos) {
    return node;
  }
  let next = node!.parent!.firstChild!;
  while (next.nextSibling && next.nextSibling.from < cursorPos) {
    next = next.nextSibling;
  }
  return next;
}

// always add as sibling following the target
// not sure how to target an empty array?
const addElementAsSiblingInArray: ModifyCmd<addElementAsSiblingInArrayEvent> = (
  { payload },
  node,
  _,
  cursorPos
) => {
  // WIP
  let from: number;
  let to: number;
  let value = payload;
  let syntaxNode = node;
  if (node.type.name === "Array") {
    syntaxNode = syntaxNode.firstChild!;
  }
  syntaxNode = rotateToAdaptivePosition(syntaxNode, cursorPos);
  // adapt to the position by rotating to the position from here
  // criterion: find the item just before that one after it
  const currentTypeIsBracket = syntaxNode.type.name === "[";
  // const prevType = syntaxNode.prevSibling?.type.name || "⚠";
  const nextType = syntaxNode.nextSibling?.type.name || "⚠";
  // const prevTypeIsBracket = new Set(["⚠", "["]).has(prevType);
  const nextTypeIsBracket = new Set(["⚠", "]"]).has(nextType);

  // case: []
  if (currentTypeIsBracket && nextType === "]") {
    from = syntaxNode.from;
    to = syntaxNode.to;
    value = `[${payload}`;
  }

  // case [X1]
  if (currentTypeIsBracket && !nextTypeIsBracket) {
    from = syntaxNode.from;
    to = syntaxNode.from;
    value = `[${payload}, `;
  }

  if (!currentTypeIsBracket && !nextTypeIsBracket) {
    from = syntaxNode.to + 1;
    to = syntaxNode.to + 1;
    value = ` ${payload},`;
  }

  if (!currentTypeIsBracket && nextType === "]") {
    from = syntaxNode.to;
    to = syntaxNode.to;
    value = `, ${payload}`;
  }
  if (!currentTypeIsBracket && nextType === "⚠") {
    from = syntaxNode.to;
    to = syntaxNode.to;
    value = `, ${payload}`;
  }

  if (currentTypeIsBracket && !nextTypeIsBracket) {
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
  currentText,
  cursorPos
) => {
  if (!CmdTable[value.type]) {
    return { from: 0, to: 0, value: "" };
  }
  const targetNode = possiblyModifyChosenNode(value, syntaxNode);
  const result = CmdTable[value.type](
    value,
    targetNode,
    currentText,
    cursorPos
  );
  return result || { from: 0, to: 0, value: "" };
};

const climbToRoot = (node: SyntaxNode): SyntaxNode =>
  node.parent ? climbToRoot(node.parent) : node;

function findSyntaxNodeById(node: SyntaxNode, id: string): SyntaxNode | null {
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

  const isLiminalNode = liminalNodeTypes.has(targetNode.type.name);
  // don't modify if its one of the liminal nodes (eg bracket)
  return isLiminalNode ? syntaxNode : targetNode;
};
