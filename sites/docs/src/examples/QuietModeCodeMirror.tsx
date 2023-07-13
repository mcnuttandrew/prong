import { useEffect, useRef, useState } from "react";
import { syntaxTree } from "@codemirror/language";
import { WidgetType } from "@codemirror/view";
import { json } from "@codemirror/lang-json";
import { basicSetup } from "codemirror";
import {
  EditorView,
  ViewUpdate,
  ViewPlugin,
  DecorationSet,
  Decoration,
} from "@codemirror/view";
import { EditorState, Range } from "@codemirror/state";

const coloring: Record<string, string> = {
  String: "#0551A5",
  Number: "#17885C",
  Boolean: "#0551A5",
  PropertyName: "#A21615",
  Null: "#0551A5",
};

const trim = (x: string) =>
  x.at(0) === '"' && x.at(-1) === '"' ? x.slice(1, x.length - 1) : x;

function QuietModeCodeMirror(props: {
  onChange: (code: string) => void;
  code: string;
}) {
  const { code, onChange } = props;
  const cmParent = useRef<HTMLDivElement>(null);

  const [view, setView] = useState<EditorView | null>(null);
  useEffect(() => {
    const localExtension = EditorView.updateListener.of((v: ViewUpdate) => {
      if (v.docChanged) {
        onChange(v.state.doc.toString());
      }
    });

    const editorState = EditorState.create({
      extensions: [basicSetup, quietMode, json(), localExtension],
      doc: code,
    })!;
    const view = new EditorView({
      state: editorState,
      parent: cmParent.current,
    });
    setView(view);
    return () => view.destroy();
    // eslint-disable-next-line
  }, []);

  useEffect(() => {
    if (view && view.state.doc.toString() !== code) {
      view.dispatch(
        view.state.update({
          changes: { from: 0, to: view.state.doc.length, insert: code },
        })
      );
    }
  }, [code, view]);
  return (
    <div className="expression-editor">
      <div ref={cmParent} />
    </div>
  );
}

class QuietWidget extends WidgetType {
  constructor(
    readonly content: string,
    readonly nodeType: string
  ) {
    super();
  }

  eq(other: QuietWidget): boolean {
    return this.content === other.content;
  }

  toDOM(): HTMLDivElement {
    const wrap = document.createElement("div");
    wrap.setAttribute(
      "style",
      `display: inline-block; color:${coloring[this.nodeType]}`
    );
    wrap.innerText = trim(this.content);
    return wrap;
  }
}
const quietMode = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet;
    constructor(view: EditorView) {
      this.decorations = this.makeQuietRepresentation(view);
    }

    makeQuietRepresentation(view: EditorView) {
      const widgets: Range<Decoration>[] = [];
      const code = view.state.doc.sliceString(0);
      syntaxTree(view.state).iterate({
        from: 0,
        to: code.length,
        enter: ({ node, from, to, type }) => {
          if (coloring[node.type.name]) {
            const widget = new QuietWidget(code.slice(from, to), type.name);
            widgets.push(Decoration.replace({ widget }).range(from, to));
          }
        },
      });
      try {
        return Decoration.set(widgets.sort((a, b) => a.from - b.from));
      } catch (e) {
        console.log("problem creating widgets", e);
        return Decoration.set([]);
      }
    }

    update(update: ViewUpdate) {
      if (update.docChanged || update.viewportChanged) {
        this.decorations = this.makeQuietRepresentation(update.view);
      }
    }
  },
  { decorations: (v) => v.decorations }
);

export default QuietModeCodeMirror;
