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
  cursorPos: number
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
  (_value, node, currentText) => {
    const sib = node.prevSibling!;
    const prev = currentText.slice(sib.from, sib.to);
    const curr = currentText.slice(node.from, node.to);
    const join = currentText.slice(sib.to, node.from);
    return { value: `${curr}${join}${prev}`, from: sib.from, to: node.to };
  },
  true
);

const increaseItemIdx: ModifyCmd<decreaseItemIdxEvent> = checkAndLift(
  (_value, node, currentText) => {
    const sib = node.nextSibling!;
    const next = currentText.slice(sib.from, sib.to);
    const curr = currentText.slice(node.from, node.to);
    const join = currentText.slice(node.to, sib.from);
    return { value: `${next}${join}${curr}`, from: node.from, to: sib.to };
  },
  false
);

const removeObjectKey: ModifyCmd<removeObjectKeyEvent> = (
  _value,
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
  _value,
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

const shortest = (arr: string[]) =>
  arr.reduce((acc, row) => (acc.length > row.length ? acc : row), "");

const hasType = (
  node: SyntaxNode | undefined,
  type: SyntaxNode["type"]["name"]
) => node?.type.name === type;
function computeSeparations(
  prev: SyntaxNode | undefined,
  target: SyntaxNode,
  next: SyntaxNode | undefined,
  preText: string
) {
  let text = preText;
  if (hasType(target, "⚠")) {
    text = text.slice(0, target.from) + text.slice(target.to);
  }
  // region has new line
  const regionHasNl = (from: number, to: number) =>
    text.slice(from, to).includes("\n");
  const prevToTarg = (prev && text.slice(prev.to, target.from)) || "";
  const prevToNext = (prev && next && text.slice(prev.to, next.from)) || "";
  const nextToTarg = (next && text.slice(target.to, next.from)) || "";
  const seps = [prevToTarg, prevToNext, nextToTarg].map((x) =>
    x.replace(/\S|,/g, "")
  );

  let indentation = "";
  if (prev && regionHasNl(prev?.from, target?.to)) {
    const lines = text.split("\n");
    const searchKey = text.slice(prev.from, prev.to);
    const line = lines.find((x) => x.includes(searchKey));
    indentation = (line?.split(searchKey) || [""])[0];
  }

  return { prevSep: shortest(seps), nextSep: shortest(seps), indentation };
}

/**
 * Add object key function. Wow this is a mess
 * @param event
 * @param node
 * @param currentText
 * @param cursorPos
 * @returns
 */
const addObjectKeyPre: ModifyCmd<addObjectKeyEvent> = (
  event,
  node,
  text,
  cursorPos
) => {
  const {
    payload: { key, value },
  } = event;
  // retarget to the object if we're somewhere inside
  let syntaxNode = node;
  if (hasType(syntaxNode, "JsonText")) {
    syntaxNode = syntaxNode.firstChild!;
  } else if (!hasType(syntaxNode, "Object")) {
    syntaxNode = syntaxNode.parent!;
    if (!hasType(syntaxNode, "Object")) {
      throw Error("Add Object Key error");
    }
  }
  const approxTarget = rotateToAdaptivePosition(
    node.firstChild || node,
    cursorPos
  );
  const nextSib = approxTarget.nextSibling!;
  const prevSib = approxTarget.prevSibling!;

  const { prevSep, nextSep, indentation } = computeSeparations(
    prevSib,
    approxTarget,
    nextSib,
    text
  );
  const prefixA = (hasType(prevSib, "{") ? "" : ",") + prevSep;
  const suffix =
    (hasType(nextSib, "}") || hasType(approxTarget, "}") ? "" : ",") + nextSep;
  if (hasType(approxTarget, "⚠")) {
    return {
      value: `${prefixA}${indentation}${key}: ${value}${suffix}`,
      from: prevSib.to,
      to: nextSib.from,
    };
  }
  if (hasType(approxTarget, "}")) {
    return {
      value: `${prefixA}${indentation}${key}: ${value}${suffix}`,
      from: prevSib.to,
      to: approxTarget.to - 1,
    };
  }

  const prefixB = (hasType(approxTarget, "{") ? "" : ",") + prevSep;

  if (hasType(approxTarget, "{")) {
    return {
      value: `${prefixB}${indentation}${key}: ${value}${suffix}`,
      from: approxTarget.from + 1,
      to: nextSib.from,
    };
  }
  return {
    value: `${prefixB}${indentation}${key}: ${value}${suffix}`,
    from: approxTarget.to,
    to: nextSib!.from,
  };
};

const addObjectKey: ModifyCmd<addObjectKeyEvent> = (...args) => {
  const output = addObjectKeyPre(...args);

  const skips = (output?.value || "")
    .split("\n")
    .map((x) => x.replace(/\s/g, ""))
    .map((x, idx, arr) => {
      if (idx === 0 || idx === arr.length - 1) {
        return false;
      }
      return x.length === 0 ? idx : false;
    });
  const value = output!.value
    .split("\n")
    .filter((_, idx) => !skips[idx])
    .join("\n");

  return output ? { ...output, value } : undefined;
};
function rotateToAdaptivePosition(
  node: SyntaxNode,
  cursorPos: number | undefined
): SyntaxNode {
  if (!cursorPos) {
    return node;
  }
  let next = node;
  if (node.type.name === "Object" || node.type.name === "Array") {
    next = node.firstChild!;
  } else {
    next = node!.parent!.firstChild!;
  }
  while (next.nextSibling && next.nextSibling.from < cursorPos) {
    next = next.nextSibling;
  }
  return next;
}

// todo: this function has a ton of overlap with the object version, maybe combine?
const addElementAsSiblingInArray: ModifyCmd<addElementAsSiblingInArrayEvent> = (
  ...args
) => {
  const output = addElementAsSiblingInArrayPre(...args);

  const skips = (output?.value || "")
    .split("\n")
    .map((x) => x.replace(/\s/g, ""))
    .map((x, idx, arr) => {
      if (idx === 0 || idx === arr.length - 1) {
        return false;
      }
      return x.length === 0 ? idx : false;
    });
  const value = output!.value
    .split("\n")
    .filter((_, idx) => !skips[idx])
    .join("\n");

  return output ? { ...output, value } : undefined;
};

// cases
// [|]
// [|1]
// [1|]
// [1,|2]
// [1,|]
const addElementAsSiblingInArrayPre: ModifyCmd<
  addElementAsSiblingInArrayEvent
> = (event, node, text, cursorPos) => {
  const { payload } = event;
  // retarget to the object if we're somewhere inside
  let syntaxNode = node;
  if (!hasType(syntaxNode, "Array")) {
    syntaxNode = syntaxNode.parent!;
    if (!hasType(syntaxNode, "Array")) {
      throw Error("Add Array Element error");
    }
  }

  let approxTarget = rotateToAdaptivePosition(
    syntaxNode.firstChild || syntaxNode,
    cursorPos
  );
  if (approxTarget.nextSibling && hasType(approxTarget.nextSibling, "⚠")) {
    approxTarget = approxTarget.nextSibling;
  }
  const nextSib = approxTarget.nextSibling!;
  const prevSib = approxTarget.prevSibling!;

  const { prevSep, nextSep } = computeSeparations(
    prevSib,
    approxTarget,
    nextSib,
    text
  );
  const indentation = "";
  const prefixA = (hasType(prevSib, "[") ? "" : ",") + prevSep;
  let suffix =
    (hasType(nextSib, "]") || hasType(approxTarget, "]") ? "" : ",") + nextSep;

  if (hasType(approxTarget, "⚠")) {
    return {
      value: `${prefixA}${indentation}${payload}${suffix}`,
      from: prevSib.to,
      to: nextSib.from - (hasType(nextSib, "]") ? 1 : 0),
    };
  }
  if (hasType(approxTarget, "]")) {
    return {
      value: `${prefixA}${indentation}${payload}${suffix}`,
      from: prevSib.to,
      to: approxTarget.to - 1,
    };
  }

  const prefixB = (hasType(approxTarget, "[") ? "" : ",") + prevSep;

  if (hasType(approxTarget, "[")) {
    return {
      value: `${prefixB}${indentation}${payload}${suffix}`,
      from: approxTarget.from + 1,
      to: nextSib.from,
    };
  }
  return {
    value: `${prefixB}${indentation}${payload}${suffix}`,
    from: approxTarget.to,
    to: nextSib!.from,
  };
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
  try {
    const targetNode = possiblyModifyChosenNode(value, syntaxNode);
    const result = CmdTable[value.type](
      value,
      targetNode,
      currentText,
      cursorPos
    );
    return result || { from: 0, to: 0, value: "" };
  } catch (e) {
    console.error("Modify code by command error", value, e);
    return { from: 0, to: 0, value: "" };
  }
};
