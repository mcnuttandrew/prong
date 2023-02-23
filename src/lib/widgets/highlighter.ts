import { Decoration } from "@codemirror/view";
import { SimpleWidget } from "../widgets";
import { cmStatePlugin } from "../cmState";
import { popOverState } from "../popover-menu/PopoverState";
import { classNames, codeStringState } from "../utils";
import { SyntaxNode } from "@lezer/common";

const simpleTypes = new Set([
  // "{",
  // "}",
  // "[",
  // "]",
  "String",
  "PropertyName",
  "Number",
  "Boolean",
  "Null",
  "True",
  "False",
]);

const toParents = new Set([
  "[",
  "]",
  "{",
  "}",
  "⚠",
  // "PropertyName",
  "PropertyValue",
]);
export const targTypes = new Set([
  "Object",
  "Property",
  "Array",
  "String",
  "Number",
  "Null",
  "False",
  "True",
]);
export function pickNodetoHighlight(node: SyntaxNode): SyntaxNode {
  const type = node.type.name;
  if (toParents.has(type)) {
    return node.parent!;
  }

  return node;
}

const Highlighter: SimpleWidget = {
  checkForAdd: (type, view, node) => {
    const { schemaTypings, diagnostics } = view.state.field(cmStatePlugin);
    const { highlightNode } = view.state.field(popOverState);
    const isTargetableType = simpleTypes.has(node.type.name);
    const hasTyping = schemaTypings[`${node.from}-${node.to}`];
    const hasDiagnosticError = !!diagnostics.find(
      (x) => x.from === node.from && x.to === node.to
    );
    const isTarget =
      !!highlightNode &&
      highlightNode.from === node.from &&
      highlightNode.to === node.to;

    return (
      (hasTyping && hasTyping.length) ||
      isTargetableType ||
      hasDiagnosticError ||
      isTarget
    );
  },
  addNode: (view, from, to, node) => {
    const { diagnostics } = view.state.field(cmStatePlugin);
    const { highlightNode } = view.state.field(popOverState);
    const hasDiagnosticError = !!diagnostics.find(
      (x) => x.from === node.from && x.to === node.to
    );
    const l2 = new Set(["x"]);
    // const l2 = new Set(["Property"]);
    // const l3 = new Set(["Object", "Array"]);
    const l3 = new Set(["X"]);
    const levelNumber = [simpleTypes, l2, l3].findIndex((x) =>
      x.has(node.type.name)
    );
    const level = `${levelNumber >= 0 ? levelNumber + 1 : 4}`;
    const isHighlightNode =
      !!highlightNode &&
      highlightNode.from === node.from &&
      highlightNode.to === node.to;
    if (level === "4" && !hasDiagnosticError && !isHighlightNode) {
      return [];
    }
    const highlight = Decoration.mark({
      attributes: {
        class: classNames({
          "cm-annotation-highlighter": true,
          "cm-annotation-highlighter-selected": isHighlightNode,
          [`cm-annotation-highlighter-${level}`]: true,
          "cm-linter-highlight": hasDiagnosticError,
        }),
      },
    });

    return from !== to ? [highlight.range(from, to)] : [];
  },
  eventSubscriptions: {},
};
export default Highlighter;
