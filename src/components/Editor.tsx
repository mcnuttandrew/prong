import * as React from "react";
import { useEffect, useRef, useState } from "react";

import { json } from "@codemirror/lang-json";
import { Compartment } from "@codemirror/state";
import { basicSetup, EditorState } from "@codemirror/basic-setup";
import { EditorView, keymap, ViewUpdate } from "@codemirror/view";
import { indentWithTab } from "@codemirror/commands";
import { jsonLinter } from "../lib/Linter";

import { ContentToMenuItem } from "../lib/widgets/popover-menu";

import { codeString } from "../lib/utils";
import { getMatchingSchemas } from "../lib/from-vscode/validator";

import { syntaxTree } from "@codemirror/language";

// import { ASTKeyBinding } from "../lib/ASTKeyBinding";
import { MenuTriggerKeyBinding } from "../lib/MenuTriggerKeyBinding";

import { widgetsPlugin, Projection } from "../lib/widgets";
import { cmStatePlugin, setSchema, setProjections } from "../lib/cmState";

type Props = {
  onChange: (code: string) => void;
  code: string;
  schema: any; // TODO fix
  projections?: Projection[];
};

const languageConf = new Compartment();

function createNodeMap(view: EditorView, schema: any) {
  return getMatchingSchemas(schema, codeString(view, 0)).then((matches) => {
    return matches.reduce((acc, { node, schema }) => {
      const [from, to] = [node.offset, node.offset + node.length];
      acc[`${from}-${to}`] = (acc[`${from}-${to}`] || []).concat(schema);
      return acc;
    }, {} as { [x: string]: any });
  });
}

const triggerSelectionCheck =
  (
    setMenu: (menu: any) => void,
    setSchemaMap: (schemaMap: any) => void,
    schema: any
  ) =>
  (x: any): void => {
    if (!x) {
      setMenu(null);
      return;
    }

    createNodeMap(x, schema).then((schemaMap) => setSchemaMap(schemaMap));
    const possibleMenuTargets: any[] = [];
    for (const { from, to } of x.visibleRanges) {
      syntaxTree(x.state).iterate({
        from,
        to,
        enter: (type, from, to, get) => {
          const ranges = x.state.selection.ranges;
          if (ranges.length !== 1 && ranges[0].from !== ranges[0].to) {
            return;
          }
          const node = get();
          if (from <= ranges[0].from && to >= ranges[0].from) {
            const bbox = x.coordsAtPos(from);
            possibleMenuTargets.push({
              x: bbox.left,
              y: bbox.top,
              node,
              from,
              to,
            });
          }
        },
      });
      const smallMenuTarget = possibleMenuTargets.reduce(
        (acc, row) => {
          const dist = row.to - row.from;
          return dist < acc.dist ? { dist, target: row } : acc;
        },
        { dist: Infinity, target: null }
      );
      setMenu(smallMenuTarget.target);
    }
  };

export default function Editor(props: Props) {
  const { schema, code, onChange, projections } = props;
  const cmParent = useRef<HTMLDivElement>(null);

  const [view, setView] = useState<EditorView | null>(null);
  const [menu, setMenu] = useState<{ x: number; y: number; node: any } | null>(
    null
  );
  const [schemaMap, setSchemaMap] = useState<Record<string, any>>({});

  useEffect(() => {
    setView(
      new EditorView({
        state: EditorState.create({
          extensions: [
            // jsonLinter,
            // keymap.of(ASTKeyBinding),
            keymap.of(
              MenuTriggerKeyBinding(
                triggerSelectionCheck(setMenu, setSchemaMap, schema)
              )
            ),
            basicSetup,
            languageConf.of(json()),
            keymap.of([indentWithTab]),
            cmStatePlugin,
            widgetsPlugin,
            EditorView.updateListener.of((v: ViewUpdate) => {
              // TODO fix
              if (v.docChanged) {
                onChange(v.state.doc.toString());
              }
            }),
          ],
          doc: code,
        }),
        parent: cmParent.current!,
      })
    );
  }, []);

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
    <div className="editor-container">
      <div ref={cmParent} />
      {menu && (
        <div
          className="cm-annotation-menu"
          style={{ top: menu.y - 30, left: menu.x }}
        >
          <ContentToMenuItem
            content={schemaMap[`${menu.node.from}-${menu.node.to}`]}
            keyPath={[]}
            projections={projections || []}
            view={view!}
            syntaxNode={menu.node}
            currentCodeSlice={""}
          />
        </div>
      )}
    </div>
  );
}
