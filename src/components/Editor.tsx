import * as React from "react";
import { useEffect, useRef, useState } from "react";

import { json } from "@codemirror/lang-json";
import { Compartment } from "@codemirror/state";
import { basicSetup } from "codemirror";
import { EditorView, ViewUpdate, keymap } from "@codemirror/view";
import { indentWithTab } from "@codemirror/commands";
import { EditorState } from "@codemirror/state";

import { lintCode } from "../lib/Linter";
import { createNodeMap } from "../lib/utils";
import { widgetsPlugin } from "../lib/widgets";
import { Projection } from "../lib/projections";
import {
  cmStatePlugin,
  setSchema,
  setProjections,
  setSchemaTypings,
  setDiagnostics,
} from "../lib/cmState";
import PopoverPlugin from "../lib/popover-menu";
import ProjectionPlugin from "../lib/projections";

type Props = {
  onChange: (code: string) => void;
  code: string;
  schema: any; // TODO fix
  projections?: Projection[];
};

const languageConf = new Compartment();
export type SchemaMap = Record<string, any>;

function runTypings(schema: any, code: string, view: EditorView) {
  createNodeMap(schema, code).then((schemaMap) => {
    view.dispatch({
      effects: [setSchemaTypings.of(schemaMap)],
    });
  });
}

function runLints(schema: any, code: string, view: EditorView) {
  lintCode(schema, code).then((diagnostics) => {
    view.dispatch({
      effects: [setDiagnostics.of(diagnostics)],
    });
  });
}

export default function Editor(props: Props) {
  const { schema, code, onChange, projections } = props;
  const cmParent = useRef<HTMLDivElement>(null);

  const [view, setView] = useState<EditorView | null>(null);
  const simpleUpdate = (
    view: EditorView,
    from: number,
    to: number,
    insert: string
  ) => {
    view.dispatch(view!.state.update({ changes: { from, to, insert } }));
  };

  // primary effect, initialize the editor etc
  useEffect(() => {
    const localExtension = EditorView.updateListener.of((v: ViewUpdate) => {
      if (v.docChanged) {
        const newCode = v.state.doc.toString();
        onChange(newCode);

        // TODO wrap these is a debounce
        // TODO move these into the cmState
        runTypings(schema, newCode, view);
        runLints(schema, newCode, view);
      }
    });
    const editorState = EditorState.create({
      extensions: [
        PopoverPlugin(),
        ProjectionPlugin(),
        basicSetup,
        languageConf.of(json()),
        keymap.of([indentWithTab]),
        cmStatePlugin,
        widgetsPlugin,
        localExtension,
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
    if (view) {
      view.dispatch({ effects: [setSchema.of(schema)] });
      runTypings(schema, code, view);
      runLints(schema, code, view);
    }
  }, [schema, view]);
  useEffect(() => {
    if (view) {
      // hack :(
      setTimeout(() => {
        view.dispatch({ effects: [setProjections.of(projections || [])] });
      }, 100);
    }
  }, [projections, view]);

  useEffect(() => {
    if (view && view.state.doc.toString() !== code) {
      simpleUpdate(view, 0, view.state.doc.length, code);
    }
  }, [code, view]);
  return (
    <div className="editor-container">
      <div ref={cmParent} />
    </div>
  );
}
