import { Decoration } from "@codemirror/view";
import { SimpleWidget } from "../widgets";
import { cmStatePlugin } from "../cmState";
import { popOverState } from "../popover-menu/PopoverState";
import { classNames } from "../utils";
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

function checkIfShouldMarkAsInBound(
  node: SyntaxNode | null,
  from: number,
  to: number
): boolean {
  if (!node) {
    return false;
  }
  return node.from === from && node.to === to;
}

const Highlighter: SimpleWidget = {
  checkForAdd: (type, view, node) => {
    const { schemaTypings, diagnostics } = view.state.field(cmStatePlugin);
    const { targetNode } = view.state.field(popOverState);
    const isSimpleType = simpleTypes.has(node.type.name);
    const hasTyping = schemaTypings[`${node.from}-${node.to}`];
    const hasDiagnosticError = !!diagnostics.find(
      (x) => x.from === node.from && x.to === node.to
    );
    const isTarget =
      !!targetNode &&
      targetNode.from === node.from &&
      targetNode.to === node.to;

    return (
      (hasTyping && hasTyping.length) ||
      isSimpleType ||
      hasDiagnosticError ||
      isTarget
    );
  },
  addNode: (view, from, to, node) => {
    const { diagnostics } = view.state.field(cmStatePlugin);
    const { targetNode } = view.state.field(popOverState);
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
    // const inBound =
    //   !!targetNode && targetNode.from === from && targetNode.to === to;
    const inBound = checkIfShouldMarkAsInBound(targetNode, from, to);
    if (level === "4" && !hasDiagnosticError) {
      return [];
    }
    const highlight = Decoration.mark({
      attributes: {
        class: classNames({
          "cm-annotation-highlighter": true,
          "cm-annotation-highlighter-selected": inBound,
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
