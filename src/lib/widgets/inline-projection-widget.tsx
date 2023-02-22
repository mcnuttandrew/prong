import * as React from "react";
import * as ReactDOM from "react-dom";
import { WidgetType, Decoration } from "@codemirror/view";
import { EditorState } from "@codemirror/state";
import { SyntaxNode } from "@lezer/common";
import { syntaxNodeToKeyPath, codeStringState } from "../utils";
import { runProjectionQuery } from "../query";
import { ProjectionInline } from "../projections";
import { SimpleWidgetStateVersion } from "../widgets";
import isEqual from "lodash.isequal";

class InlineProjectionWidget extends WidgetType {
  widgetContainer: HTMLDivElement | null;
  constructor(
    readonly from: number,
    readonly to: number,
    readonly projection: ProjectionInline,
    readonly syntaxNode: SyntaxNode,
    readonly state: EditorState,
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

    // const view = this.view;
    const state = this.state;
    const element = React.createElement(this.projection.projection, {
      keyPath: syntaxNodeToKeyPath(
        this.syntaxNode,
        codeStringState(this.state, 0)
      ),
      node: this.syntaxNode,
      currentValue: this.currentCodeSlice,
      setCode: (code) => {
        // todo untested, may mess stuff up
        const fullCode = state.doc.toString();
        console.log("this is now broken", state);
        // view.dispatch({
        //   changes: {
        //     from: 0,
        //     to: fullCode.length,
        //     insert: code,
        //   },
        //   selection: state.selection,
        // });
      },
      fullCode: this.state.doc.toString(),
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
): SimpleWidgetStateVersion => ({
  checkForAdd: (type, state, currentNode) => {
    const keyPath = syntaxNodeToKeyPath(syntaxNode, codeStringState(state, 0));
    const currentCodeSlice = codeStringState(
      state,
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
  addNode: (state, from, to) => {
    const widget = new InlineProjectionWidget(
      from,
      to,
      projection,
      syntaxNode,
      state,
      currentCodeSlice
    );
    if (
      projection.mode === "replace" ||
      projection.mode === "replace-multiline"
    ) {
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
