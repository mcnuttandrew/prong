import { Decoration, WidgetType } from "@codemirror/view";
import { SimpleWidget } from "../widgets";

type ContainerType = "{" | "[";
export class ClickTarget extends WidgetType {
  constructor(readonly from: number, readonly type: ContainerType) {
    super();
  }

  eq(other: ClickTarget) {
    return this.from === other.from;
  }

  toDOM() {
    const wrap = document.createElement("div");
    wrap.dataset.from = this.from.toString();
    wrap.className = "cm-container-click-target";
    const btn = document.createElement("button");
    btn.innerText = "❒";

    btn.className = `cm-container-click-target___${this.type}`;
    wrap.appendChild(btn);
    return wrap;
  }

  ignoreEvent() {
    return false;
  }
}

const targets = new Set(["{", "["]);
const ClickTargetWidget: SimpleWidget = {
  checkForAdd: (type) => targets.has(type.name),
  addNode: (view, from, to, node) => [
    Decoration.widget({
      widget: new ClickTarget(from, node.type.name as ContainerType),
    }).range(to),
  ],
  eventSubscriptions: {
    mousedown: (e, view) => {
      console.log("mousedown capture");
      return "X";
    },
  },
};
export default ClickTargetWidget;
