import { WidgetType, Decoration } from "@codemirror/view";
import { SimpleWidget } from "../widgets";
import { codeString, unwrap } from "../utils";
// The `from` position is used to identify a node in the program.
// Don't want to store `to` position, because would need to update
// it if source code rewrite affects length (e.g. "true" to "false").
// Instead, to determine `to`, rely on widget position (via `posAtDOM`),
// or invariants about the source node (e.g. "true" or "false").
//
// Widget positions don't affect character positions in the doc.
class BoolWidget extends WidgetType {
  constructor(readonly initVal: boolean, readonly from: number) {
    super();
  }

  eq(other: BoolWidget) {
    return this.from === other.from && this.initVal === other.initVal;
  }

  toDOM() {
    const theWidget = document.createElement("div");
    theWidget.dataset.from = this.from.toString();
    theWidget.className = "cm-bool-widget";

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.className = "cm-bool-checkbox-widget"; // TODO better name
    checkbox.checked = this.initVal;

    theWidget.appendChild(checkbox);
    return theWidget;
  }

  ignoreEvent() {
    return false;
  }
}

const SimpleColorNameWidget: SimpleWidget = {
  checkForAdd: (type, view, currentNode) => type.name === "BooleanLiteral",
  addNode: (view, from, to) => {
    const initVal = codeString(view, from).startsWith("true");
    const deco = Decoration.widget({
      widget: new BoolWidget(initVal, from),
      side: 1,
    });
    return [deco.range(from)]; // `from` to draw widget on left
  },
  eventSubscriptions: {
    click: (e, view) => {
      const target = e.target as HTMLElement;
      if (target.classList.contains("cm-bool-checkbox-widget")) {
        // TODO
        const from = parseInt(
          unwrap(
            target.parentElement!.dataset.from,
            "Missing 'from' dataset value"
          )
        );
        const b = codeString(view, from).startsWith("true");
        view.dispatch({
          changes: {
            from,
            to: from + b.toString().length,
            insert: (!b).toString(),
          },
        });
      }
    },
  },
};
export default SimpleColorNameWidget;
