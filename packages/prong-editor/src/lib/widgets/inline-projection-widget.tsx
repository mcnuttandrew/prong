import * as ReactDOM from "react-dom";
import { createElement } from "react";
import { WidgetType, Decoration } from "@codemirror/view";
import { EditorState } from "@codemirror/state";
import { SyntaxNode } from "@lezer/common";
import { syntaxNodeToKeyPath, codeStringState } from "../utils";
import { runProjectionQuery } from "../query";
import { ProjectionInline } from "../projections";
import { SimpleWidgetStateVersion } from "../widgets";
import isEqual from "lodash.isequal";
import { cmStatePlugin } from "../cmState";

class InlineProjectionWidget extends WidgetType {
  widgetContainer: HTMLDivElement | null;
  constructor(
    readonly from: number,
    readonly to: number,
    readonly projection: ProjectionInline,
    readonly syntaxNode: SyntaxNode,
    readonly state: EditorState,
    readonly currentCodeSlice: string,
    readonly setCode: (code: string) => void
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
    const { schemaTypings, diagnostics } = this.state.field(cmStatePlugin);
    const from = this.from;
    const to = this.to;
    const element = createElement(this.projection.projection, {
      keyPath: syntaxNodeToKeyPath(
        this.syntaxNode,
        codeStringState(this.state, 0)
      ),
      node: this.syntaxNode,
      currentValue: this.currentCodeSlice,
      setCode: (code) => this.setCode(code),
      fullCode: this.state.doc.toString(),
      diagnosticErrors: diagnostics.filter(
        (x) => x.from === from && x.to === to
      ),
      typings: schemaTypings[`${from}-${to}`],
      cursorPositions: [...this.state.selection.ranges],
    });

    ReactDOM.render(element, wrap);

    return wrap;
  }

  ignoreEvent(): boolean {
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
  typings: any,
  setCode: (code: string) => void
): SimpleWidgetStateVersion => ({
  checkForAdd: (_type, state, currentNode) => {
    const keyPath = syntaxNodeToKeyPath(syntaxNode, codeStringState(state, 0));
    const currentCodeSlice = codeStringState(
      state,
      currentNode.from,
      currentNode.to
    );
    return runProjectionQuery({
      query: projection.query,
      keyPath,
      nodeValue: currentCodeSlice,
      typings,
      nodeType: currentNode.type.name,
      // @ts-ignore
      projId: projection.id,
      cursorPosition: state.selection.ranges[0].from,
      nodePos: { start: syntaxNode.from, end: syntaxNode.to },
    });
  },
  addNode: (state, from, to) => {
    const widget = new InlineProjectionWidget(
      from,
      to,
      projection,
      syntaxNode,
      state,
      currentCodeSlice,
      setCode
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
