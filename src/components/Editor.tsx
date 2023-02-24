import * as React from "react";
import { useEffect, useRef, useState } from "react";

import { json } from "@codemirror/lang-json";
import { Compartment } from "@codemirror/state";
import { basicSetup } from "codemirror";
import { EditorView, ViewUpdate, keymap } from "@codemirror/view";
import { indentWithTab } from "@codemirror/commands";
import { EditorState } from "@codemirror/state";
import { syntaxHighlighting } from "@codemirror/language";

import { widgetsPlugin } from "../lib/widgets";
import SyntaxHighlighting from "../lib/syntax-highlighting";
import { Projection } from "../lib/projections";
import {
  cmStatePlugin,
  setSchema,
  setProjections,
  cmStateView,
} from "../lib/cmState";
import PopoverPlugin from "../lib/popover-menu";
import ProjectionPlugin from "../lib/projections";
import { simpleUpdate } from "../lib/utils";
import Panel from "../lib/dock";

type Props = {
  onChange: (code: string) => void;
  code: string;
  schema: any; // TODO fix
  projections?: Projection[];
  height?: string;
};

const languageConf = new Compartment();
export type SchemaMap = Record<string, any>;

export default function Editor(props: Props) {
  const { schema, code, onChange, projections, height } = props;

  const [view, setView] = useState<EditorView | null>(null);
  const cmParent = useRef<HTMLDivElement>(null);

  // primary effect, initialize the editor etc
  useEffect(() => {
    const localExtension = EditorView.updateListener.of((v: ViewUpdate) => {
      if (v.docChanged) {
        const newCode = v.state.doc.toString();
        onChange(newCode);
      }
    });
    const editorState = EditorState.create({
      extensions: [
        PopoverPlugin(),
        ProjectionPlugin(),
        basicSetup,
        languageConf.of(json()),
        keymap.of([indentWithTab]),
        Panel(),
        cmStatePlugin,
        cmStateView,
        widgetsPlugin,
        localExtension,
        syntaxHighlighting(SyntaxHighlighting),
      ],
      doc: code,
    })!;
    const view = new EditorView({
      state: editorState,
      parent: cmParent.current!,
    });
    setView(view);
    return () => view.destroy();
    // eslint-disable-next-line
  }, []);

  useEffect(() => {
    // hack :(
    setTimeout(() => {
      view?.dispatch({ effects: [setSchema.of(schema)] });
    }, 100);
  }, [schema, view]);
  useEffect(() => {
    // hack :(
    setTimeout(() => {
      view?.dispatch({ effects: [setProjections.of(projections || [])] });
    }, 100);
  }, [projections, view]);

  useEffect(() => {
    if (view && view.state.doc.toString() !== code) {
      simpleUpdate(view, 0, view.state.doc.length, code);
    }
  }, [code, view]);
  return (
    <div className="editor-container" style={height ? { height } : {}}>
      <div ref={cmParent} className="editor-target" />
    </div>
  );
}
