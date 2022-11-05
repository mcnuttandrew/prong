import { Decoration } from "@codemirror/view";
import { SimpleWidget } from "../widgets";
import { cmStatePlugin } from "../cmState";
import { classNames } from "../utils";

const Highlighter: SimpleWidget = {
  checkForAdd: (type, view, node) => {
    const { schemaTypings, diagnostics } = view.state.field(cmStatePlugin);
    const hasTyping = schemaTypings[`${node.from}-${node.to}`];
    const hasDiagnosticError = !!diagnostics.find(
      (x) => x.from === node.from && x.to === node.to
    );
    return (hasTyping && hasTyping.length) || hasDiagnosticError;
  },
  addNode: (view, from, to, node) => {
    const { schemaTypings, diagnostics } = view.state.field(cmStatePlugin);
    const hasDiagnosticError = !!diagnostics.find(
      (x) => x.from === node.from && x.to === node.to
    );
    const l1 = new Set([
      "{",
      "}",
      "[",
      "]",
      "String",
      "PropertyName",
      "Number",
      "Boolean",
      "Null",
      "True",
      "False",
    ]);

    const l2 = new Set(["Property"]);
    // const l3 = new Set(["Object", "Array"]);
    const l3 = new Set(["X"]);
    const levelNumber = [l1, l2, l3].findIndex((x) => x.has(node.type.name));
    const level = `${levelNumber >= 0 ? levelNumber + 1 : 4}`;

    if (level === "4") {
      return [];
    }
    const highlight = Decoration.mark({
      attributes: {
        class: classNames({
          "cm-annotation-highlighter": true,
          [`cm-annotation-highlighter-${level}`]: true,
          "cm-linter-highlight": hasDiagnosticError,
        }),
      },
    });
    return [highlight.range(from, to)];
  },
  eventSubscriptions: {},
};
export default Highlighter;
