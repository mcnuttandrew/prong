import { Decoration, WidgetType, EditorView } from "@codemirror/view";
import { codeString, isArgToSpecialFunc, unwrap } from "../utils";
import { SimpleWidget } from "../widgets";
export class NumWidget extends WidgetType {
  // If the number literal is negative, `from` does _not_ include "-"
  constructor(readonly isInc: boolean, readonly from: number) {
    super();
  }

  eq(other: NumWidget) {
    return this.from === other.from;
  }

  toDOM() {
    const wrap = document.createElement("div");
    wrap.dataset.from = this.from.toString();
    wrap.className = "cm-num-widget";
    const btn = document.createElement("button");
    if (this.isInc) {
      btn.innerText = "+";
      btn.className = "cm-inc-widget";
    } else {
      btn.innerText = "−";
      btn.className = "cm-dec-widget";
    }
    wrap.appendChild(btn);
    return wrap;
  }

  ignoreEvent() {
    return false;
  }
}

function changeNum(view: EditorView, isInc: boolean, from: number) {
  const s = codeString(view, from)
    // eslint-disable-next-line no-useless-escape
    .match(/([0-9\-\.]+)([^0-9]?)/)!
    .splice(1)[0];
  const num =
    parseFloat(s) * (codeString(view, from - 1, from) === "-" ? -1 : 1);
  view.dispatch({
    changes: {
      // When the number is negative we need to overwrite the existing minus sign
      from: from - (num < 0 ? 1 : 0),
      to: from + s.length,
      insert: (isInc ? num + 1 : num - 1).toString(),
    },
  });
  return true;
}

const SimpleNumWidget: SimpleWidget = {
  checkForAdd: (type, view, currentNode) =>
    type.name === "Number" && !isArgToSpecialFunc(view, currentNode),
  addNode: (view, from, to) => {
    const decoDec = Decoration.widget({
      widget: new NumWidget(false, from),
      side: 1,
    });
    const decoInc = Decoration.widget({
      widget: new NumWidget(true, from),
      side: 1,
    });
    // Negative sign, if any, is not part of this Number node, so
    // check `from` - 1 (disallowing spaces after unary negation operator)

    return [
      decoDec.range(codeString(view, from - 1, from) === "-" ? from - 1 : from),
      decoInc.range(to),
    ];
  },
  eventSubscriptions: {
    mousedown: (e, view) => {
      console.log("mousedown capture");
      const target = e.target as HTMLElement;
      if (
        target.classList.contains("cm-inc-widget") ||
        target.classList.contains("cm-dec-widget")
      ) {
        const from = unwrap(
          target.parentElement!.dataset.from,
          "Missing 'from' dataset value"
        );
        return changeNum(
          view,
          target.classList.contains("cm-inc-widget"),
          parseInt(from)
        );
      }
    },
  },
};
export default SimpleNumWidget;
