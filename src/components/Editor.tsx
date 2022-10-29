import * as React from "react";
import { useEffect, useRef, useState } from "react";

import { json } from "@codemirror/lang-json";
import { Compartment, EditorSelection } from "@codemirror/state";
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
  (view: any): void => {
    if (!view) {
      setMenu(null);
      return;
    }

    createNodeMap(view, schema).then((schemaMap) => setSchemaMap(schemaMap));
    const possibleMenuTargets: any[] = [];
    for (const { from, to } of view.visibleRanges) {
      syntaxTree(view.state).iterate({
        from,
        to,
        enter: (type, from, to, get) => {
          const ranges = view.state.selection.ranges;
          if (ranges.length !== 1 && ranges[0].from !== ranges[0].to) {
            return;
          }
          const node = get();
          if (from <= ranges[0].from && to >= ranges[0].from) {
            const bbox = view.coordsAtPos(from);
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

function calcWidgetRangeSets(v: any) {
  const decSets = (v.view as any).docView.decorations
    .map((x: any) => x.chunk[0])
    .filter((x: any) => x)
    .map((x: any) => x.value);

  const seeet = decSets.find((decSet: any) =>
    decSet.some((dec: any) => dec.widget)
  );
  if (!seeet) {
    return {};
  }
  const ranges = seeet.reduce((acc: any, row: any) => {
    acc[`${row.widget.from}____${row.widget.to}`] = true;
    return acc;
  }, {});
  return ranges;
}

export default function Editor(props: Props) {
  const { schema, code, onChange, projections } = props;
  const cmParent = useRef<HTMLDivElement>(null);
  const viewUpdate = useRef((v: ViewUpdate) => {
    // TODO fix
    if (v.docChanged) {
      onChange(v.state.doc.toString());
      setWidgetRangeSets(calcWidgetRangeSets(v));
    }
  });

  const [view, setView] = useState<EditorView | null>(null);
  const [menu, setMenu] = useState<{ x: number; y: number; node: any } | null>(
    null
  );
  const [schemaMap, setSchemaMap] = useState<Record<string, any>>({});
  const [widgetRangeSets, setWidgetRangeSets] = useState<
    Record<string, boolean>
  >({});
  const [selectionLocal, setSelection] = useState<any>(null);
  const [insideDecRange, setInsideRecRange] = useState<false | string>(false);

  const simpleUpdate = (
    view: EditorView,
    from: number,
    to: number,
    insert: string
  ) =>
    view.dispatch(
      view!.state.update({
        // changes: { from, to, insert: view!.state.sliceDoc(from, to) },
        changes: { from, to, insert },
      })
    );

  // THIS TRIO OF EFFECTS HANDLES THE On/Off projection stuff, and it is very cursed, be warned
  // figure out the range sets for the projections
  useEffect(() => {
    const baseRange = selectionLocal && selectionLocal.ranges[0];
    if (!baseRange || baseRange.from !== baseRange.to) {
      return;
    }
    const insiderDecRange = Object.keys(widgetRangeSets).find((range) => {
      const [from, to] = range.split("____");
      return baseRange.from >= Number(from) && baseRange.from <= Number(to);
    });
    if (insiderDecRange) {
      setInsideRecRange(insiderDecRange);
    }
  }, [widgetRangeSets, selectionLocal]);
  // deactivate the projections if necessary
  useEffect(() => {
    if (!view || !insideDecRange) {
      return;
    }
    const [from, to] = insideDecRange.split("____").map((x) => Number(x));
    simpleUpdate(view, from, to, view!.state.sliceDoc(from, to));
  }, [insideDecRange]);
  // reactivate them if necessary
  useEffect(() => {
    if (!insideDecRange) {
      return;
    }
    const [from, to] = insideDecRange.split("____").map((x) => Number(x));
    const baseRange = selectionLocal.ranges[0];
    if (baseRange.from < from || baseRange.to > to) {
      setInsideRecRange(false);
      simpleUpdate(view!, from, to, view!.state.sliceDoc(from, to));
    }
  }, [insideDecRange, selectionLocal]);

  // primary effect, initialize the editor etc
  useEffect(() => {
    const view = new EditorView({
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
          // could make the projections tell us where they are
          // and if the selection enters one of those ranges, trigger a doc change?
          widgetsPlugin,
          EditorView.updateListener.of((v: ViewUpdate) => {
            // TODO fix
            if (v.docChanged) {
              onChange(v.state.doc.toString());
              setWidgetRangeSets(calcWidgetRangeSets(v));
            } else {
              setSelection(v.view.state.selection);
            }
          }),
        ],
        doc: code,
      }),
      parent: cmParent.current!,
    });
    setView(view);
    // HACK:
    // we want to trigger an update after the widgets are initially computed in order to capture their ranges in the on change event
    // maybe could be an effect, but we'll see
    setTimeout(() => simpleUpdate(view, 0, view.state.doc.length, code), 500);
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
        changes: { from: 0, to: view.state.doc.length, insert: code },
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
            codeUpdate={(codeUpdate: {
              from: number;
              to: number;
              value: string;
            }) => {
              console.log("here", codeUpdate, view);
              simpleUpdate(
                view!,
                codeUpdate.from,
                codeUpdate.to,
                codeUpdate.value
              );
            }}
          />
        </div>
      )}
    </div>
  );
}
