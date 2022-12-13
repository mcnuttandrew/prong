import { WidgetType, Decoration } from "@codemirror/view";
import { SimpleWidget } from "../widgets";
import { codeString, colorNames } from "../utils";

// https://gist.github.com/olmokramer/82ccce673f86db7cda5e#gistcomment-2029233
const colorRegex =
  // eslint-disable-next-line no-useless-escape
  /(#(?:[0-9a-f]{2}){2,4}|#[0-9a-f]{3}|(?:rgba?|hsla?)\((?:\d+%?(?:deg|rad|grad|turn)?(?:,|\s)+){2,3}[\s\/]*[\d\.]+%?\))/i;

export class ColorWidget extends WidgetType {
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
    return wrap;
  }

  ignoreEvent() {
    return false;
  }
}

const SimpleColorNameWidget: SimpleWidget = {
  checkForAdd: (type) => type.name === "String",
  addNode: (view, from, to) => {
    // + 1 and - 1 to avoid the quotation marks
    const val = codeString(view, from + 1, to - 1);

    if (
      Object.keys(colorNames).includes(val.toLowerCase()) ||
      val.match(colorRegex)
    ) {
      const deco = Decoration.widget({
        widget: new ColorWidget(val, from),
      });
      return [deco.range(from)];
    } else {
      return [];
    }
  },
  eventSubscriptions: {},
};
export default SimpleColorNameWidget;
