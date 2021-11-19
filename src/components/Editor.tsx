import * as React from "react";
import { useEffect, useRef, useState } from "react";

import { json } from "@codemirror/lang-json";
import { Compartment } from "@codemirror/state";
import { basicSetup, EditorState } from "@codemirror/basic-setup";
import { EditorView, keymap, ViewUpdate } from "@codemirror/view";
import { indentWithTab } from "@codemirror/commands";

import { widgetsPlugin } from "../lib/widgets";
// import { cmStatePlugin } from "../lib/cmState";

type Props = {
  onChange: (code: string) => void;
  code: string;
  schema: any; // TODO fix
};

const languageConf = new Compartment();

export default function Editor(props: Props) {
  const {
    schema,
    code,
    // onChange
  } = props;
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
            basicSetup,
            languageConf.of(json()),
            keymap.of([indentWithTab]),
            // cmStatePlugin,
            widgetsPlugin(schema),
            EditorView.updateListener.of((v: ViewUpdate) => {
              // TODO fix
              // if (v.docChanged) {
              //   onChange(v.state.doc.toString());
              // }
            }),
          ],
          doc: code,
        }),
        parent: cmParent.current!,
      })
    );
  }, [code]);

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

  return <div ref={cmParent} />;
}
