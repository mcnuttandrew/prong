import * as React from "react";
import * as ReactDOM from "react-dom";
import { WidgetType, Decoration } from "@codemirror/view";
import { ColorWidget } from "./color-picker";
import { SimpleWidget } from "../widgets";
import { isArgToSpecialFunc, codeString, colorNames } from "../utils";
import ColorNamePicker from "../../components/CustomColorNamePicker";

// https://gist.github.com/olmokramer/82ccce673f86db7cda5e#gistcomment-2029233
export const colorRegex =
  /(#(?:[0-9a-f]{2}){2,4}|#[0-9a-f]{3}|(?:rgba?|hsla?)\((?:\d+%?(?:deg|rad|grad|turn)?(?:,|\s)+){2,3}[\s\/]*[\d\.]+%?\))/i;

export class ColorNameWidget extends WidgetType {
  constructor(readonly initColor: string, readonly from: number) {
    super();
  }

  eq(other: ColorWidget) {
    return this.from === other.from && this.initColor === other.initColor;
  }

  toDOM() {
    const wrap = document.createElement("button");
    wrap.dataset.from = this.from.toString();
    wrap.className = "cm-color-widget";
    wrap.style.background = this.initColor;

    let active = false;

    wrap.onclick = () => {
      active = !active;

      let pickerWrap = document.getElementById("color-name-picker");
      if (!pickerWrap) {
        pickerWrap = document.createElement("div");
        pickerWrap.id = "color-name-picker";
        document.body.prepend(pickerWrap);
      } else {
        ReactDOM.unmountComponentAtNode(pickerWrap);
      }

      if (active) {
        const cb = (newColor: string | null) => {
          if (newColor) {
            const event = new CustomEvent("colorChosen", {
              bubbles: true,
              detail: newColor,
            });
            wrap.dispatchEvent(event);
          }
          ReactDOM.unmountComponentAtNode(pickerWrap!);
          active = false;
        };

        ReactDOM.render(
          React.createElement(ColorNamePicker, {
            cb,
            initColor: this.initColor,
            wrap,
          }),
          pickerWrap
        );
      }
    };
    return wrap;
  }

  ignoreEvent() {
    return false;
  }
}

const SimpleColorNameWidget: SimpleWidget = {
  checkForAdd: (type, view, currentNode) =>
    type.name === "String" && !isArgToSpecialFunc(view, currentNode),
  addNode: (view, from, to) => {
    // + 1 and - 1 to avoid the quotation marks
    const val = codeString(view, from + 1, to - 1);

    if (val.match(colorRegex)) {
      const deco = Decoration.widget({
        widget: new ColorWidget(val, from),
        side: 1,
      });
      return [deco.range(to)];
    } else if (Object.keys(colorNames).includes(val.toLowerCase())) {
      const deco = Decoration.widget({
        widget: new ColorNameWidget(val.toLowerCase(), from),
        side: 1,
      });
      return [deco.range(to)];
    } else {
      return [];
    }
  },
  eventSubscriptions: {},
};
export default SimpleColorNameWidget;
