import * as React from "react";
import { useEffect, useRef, useState } from "react";

import { json } from "@codemirror/lang-json";
import { Compartment } from "@codemirror/state";
import { basicSetup, EditorState } from "@codemirror/basic-setup";
import { EditorView, keymap, ViewUpdate } from "@codemirror/view";
import { indentWithTab } from "@codemirror/commands";
import { jsonLinter } from "../lib/Linter";

import { ASTKeyBinding } from "../lib/ASTKeyBinding";

import { widgetsPlugin, Projection } from "../lib/widgets";
import { cmStatePlugin, setSchema, setProjections } from "../lib/cmState";

type Props = {
  onChange: (code: string) => void;
  code: string;
  schema: any; // TODO fix
  projections?: Projection[];
};

const languageConf = new Compartment();

export default function Editor(props: Props) {
  const { schema, code, onChange, projections } = props;
  const cmParent = useRef<HTMLDivElement>(null);

  const [view, setView] = useState<EditorView | null>(null);
  useEffect(() => {
    console.log("mount", "here");
  }, []);
  useEffect(() => {
    console.log("this was run");

    setView(
      new EditorView({
        state: EditorState.create({
          extensions: [
            jsonLinter,
            keymap.of(ASTKeyBinding),
            basicSetup,
            languageConf.of(json()),
            keymap.of([indentWithTab]),
            cmStatePlugin,
            widgetsPlugin,
            // TODO move language analysis stuff to here as a facet (?)
            // computeN? how does async work such a thing?
            EditorView.updateListener.of((v: ViewUpdate) => {
              // TODO fix
              if (v.docChanged) {
                onChange(v.state.doc.toString());
              }

              // move analysis here?, doc changes -> recompute annotations
              // dispatch annotations into state
            }),
          ],
          doc: code,
        }),
        parent: cmParent.current!,
      })
    );
  }, [code]);

  useEffect(() => {
    if (view) {
      view.dispatch({ effects: [setSchema.of(schema)] });
    }
  }, [schema, view]);
  useEffect(() => {
    if (view) {
      view.dispatch({ effects: [setProjections.of(projections || [])] });
    }
  }, [projections, view]);

  useEffect(() => {
    if (view && view.state.doc.toString() !== code) {
      const tr = view.state.update({
        changes: {
          from: 0,
          to: view.state.doc.length,
          insert: code,
        },
      });
      view.dispatch(tr);
    }
  }, [code]);

  return (
    <div>
      <div ref={cmParent} />
    </div>
  );
}
