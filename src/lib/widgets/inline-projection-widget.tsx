import * as React from "react";
import * as ReactDOM from "react-dom";
import { WidgetType, EditorView, Decoration } from "@codemirror/view";
import { SyntaxNode } from "@lezer/common";
import { syntaxNodeToKeyPath, codeStringState } from "../utils";
import { runProjectionQuery } from "../query";
import { ProjectionInline } from "../projections";
import { SimpleWidget } from "../widgets";
import isEqual from "lodash.isequal";

class InlineProjectionWidget extends WidgetType {
  widgetContainer: HTMLDivElement | null;
  constructor(
    readonly from: number,
    readonly to: number,
    readonly projection: ProjectionInline,
    readonly syntaxNode: SyntaxNode,
    readonly view: EditorView,
    readonly currentCodeSlice: string
  ) {
    super();
    this.widgetContainer = null;
  }

  eq(other: InlineProjectionWidget): boolean {
    // const nameTheSame = other.projection.name === this.projection.name;
    const codeTheSame = this.currentCodeSlice === other.currentCodeSlice;
    if (!isEqual(other.projection, this.projection)) {
      return false;
    }
    // is this wrong?
    return this.projection.hasInternalState ? codeTheSame : false;
  }

  toDOM(): HTMLDivElement {
    const wrap = document.createElement("div");
    wrap.className = "cm-projection-widget position-relative";
    wrap.innerText = this.currentCodeSlice;
    this.widgetContainer = wrap;

    const view = this.view;

    const element = React.createElement(this.projection.projection, {
      keyPath: syntaxNodeToKeyPath(
        this.syntaxNode,
        codeStringState(this.view.state, 0)
      ),
      node: this.syntaxNode,
      currentValue: this.currentCodeSlice,
      setCode: (code) => {
        // todo untested, may mess stuff up
        const fullCode = view.state.doc.toString();
        view.dispatch({
          changes: {
            from: 0,
            to: fullCode.length,
            insert: code,
          },
          selection: view.state.selection,
        });
      },
      fullCode: this.view.state.doc.toString(),
    });

    ReactDOM.render(element, wrap);

    return wrap;
  }

  ignoreEvent(e: Event): boolean {
    return true;
  }
  destroy() {
    if (this.widgetContainer) {
      ReactDOM.unmountComponentAtNode(this.widgetContainer);
      this.widgetContainer = null;
    }
  }
}

const ProjectionWidgetFactory = (
  projection: ProjectionInline,
  currentCodeSlice: string,
  syntaxNode: SyntaxNode,
  typings: any
): SimpleWidget => ({
  checkForAdd: (type, view, currentNode) => {
    const keyPath = syntaxNodeToKeyPath(
      syntaxNode,
      codeStringState(view.state, 0)
    );
    const currentCodeSlice = codeStringState(
      view.state,
      currentNode.from,
      currentNode.to
    );
    return runProjectionQuery(
      projection.query,
      keyPath,
      currentCodeSlice,
      typings
    );
  },
  addNode: (view, from, to) => {
    const widget = new InlineProjectionWidget(
      from,
      to,
      projection,
      syntaxNode,
      view,
      currentCodeSlice
    );
    if (projection.mode === "replace") {
      return [Decoration.replace({ widget }).range(from, to)];
    } else {
      const target = projection.mode === "prefix" ? from : to;
      return [Decoration.widget({ widget }).range(target)];
    }
  },
  eventSubscriptions: {
    mousedown: (e) => {
      console.log("what", e);
    },
  },
});
export default ProjectionWidgetFactory;
