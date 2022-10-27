import * as React from "react";
import * as ReactDOM from "react-dom";
import { WidgetType, EditorView, Decoration } from "@codemirror/view";
import { SyntaxNode } from "@lezer/common";
import { syntaxNodeToKeyPath, keyPathMatchesQuery } from "../utils";
import { Projection } from "../widgets";
import { SimpleWidget } from "../widgets";

class InlineProjectionWidget extends WidgetType {
  widgetContainer: HTMLDivElement | null;
  // todo make these less dumb
  constructor(
    readonly from: number,
    readonly to: number,
    readonly projection: Projection,
    readonly syntaxNode: SyntaxNode,
    readonly view: EditorView,
    readonly currentCodeSlice: string
  ) {
    super();
    this.widgetContainer = null;
  }

  eq(other: InlineProjectionWidget): boolean {
    // wrong
    return false;
  }

  toDOM(): HTMLDivElement {
    const wrap = document.createElement("div");
    wrap.className = "cm-projection-widget";
    wrap.innerText = this.currentCodeSlice;
    this.widgetContainer = wrap;

    ReactDOM.render(
      React.createElement(this.projection.projection, {
        keyPath: syntaxNodeToKeyPath(this.syntaxNode, this.view),
        node: this.syntaxNode,
        view: this.view,
        currentValue: this.currentCodeSlice,
      }),
      wrap
    );
    return wrap;
  }

  ignoreEvent(): boolean {
    return false;
  }
  destroy() {
    if (this.widgetContainer) {
      ReactDOM.unmountComponentAtNode(this.widgetContainer);
      this.widgetContainer = null;
    }
  }
}

const ProjectionWidgetFactor = (
  projection: Projection,
  currentCodeSlice: string,
  syntaxNode: SyntaxNode,
  view: EditorView
): SimpleWidget => ({
  checkForAdd: (type, view, currentNode) => {
    const keyPath = syntaxNodeToKeyPath(syntaxNode, view);
    return keyPathMatchesQuery(projection.query, keyPath);
    // return currentNode.type.name === "String";
  },
  addNode: (view, from, to) => {
    const decoDec = Decoration.replace({
      widget: new InlineProjectionWidget(
        from,
        to,
        projection,
        syntaxNode,
        view,
        currentCodeSlice
      ),
      //   side: 1,
    }).range(from, to);
    // const decoInc = Decoration.widget({
    //   widget: new InlineProjectionWidget(
    //     from,
    //     to,
    //     projection,
    //     syntaxNode,
    //     view,
    //     currentCodeSlice
    //   ),
    //   side: 1,
    // });
    // Negative sign, if any, is not part of this Number node, so
    // check `from` - 1 (disallowing spaces after unary negation operator)
    // console.log("got here", from, to, currentCodeSlice);
    // return [decoDec.range(from), decoDec.range(to)];
    // return [decoDec.range(from)];
    // return [decoDec.range(from, to)];
    return [decoDec];
  },
  eventSubscriptions: {
    // mousedown: (e, view) => {
    //   console.log("mousedown capture");
    //   const target = e.target as HTMLElement;
    //   if (
    //     target.classList.contains("cm-inc-widget") ||
    //     target.classList.contains("cm-dec-widget")
    //   ) {
    //     const from = unwrap(
    //       target.parentElement!.dataset.from,
    //       "Missing 'from' dataset value"
    //     );
    //     return changeNum(
    //       view,
    //       target.classList.contains("cm-inc-widget"),
    //       parseInt(from)
    //     );
    //   }
    // },
  },
});
export default ProjectionWidgetFactor;
