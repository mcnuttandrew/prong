import { StateEffect, StateField } from "@codemirror/state";
import { ViewPlugin, EditorView, ViewUpdate } from "@codemirror/view";
import { JSONSchema } from "./JSONSchemaTypes";
import { Projection } from "./projections";
import { createNodeMap } from "./utils";
import { lintCode, LintError } from "./Linter";
import isEqual from "lodash.isequal";

export const setSchema = StateEffect.define<JSONSchema>();
export const setProjections = StateEffect.define<Projection[]>();
export const setSchemaTypings = StateEffect.define<Record<string, any>>();
export const setDiagnostics = StateEffect.define<any[]>();
export const setUpdateHook = StateEffect.define<any[]>();

export const initialCmState = {
  schema: {} as JSONSchema,
  projections: [] as Projection[],
  schemaTypings: {} as Record<string, any>,
  diagnostics: [] as LintError[],
  codeUpdateHook: (_code: string) => {},
};

const simpleSet = (
  key: keyof typeof initialCmState,
  value: any,
  state: typeof initialCmState
) => ({ ...state, [key]: value });

export const cmStatePlugin = StateField.define({
  create: () => initialCmState,
  update(state, tr) {
    let didUpdate = false;
    let newState = state;
    for (const effect of tr.effects) {
      if (effect.is(setSchema)) {
        didUpdate = true;
        newState = simpleSet("schema", effect.value, newState);
      }
      if (effect.is(setProjections)) {
        didUpdate = true;
        newState = simpleSet(
          "projections",
          effect.value.map((x, id) => ({ ...x, id })),
          newState
        );
      }
      if (effect.is(setSchemaTypings)) {
        didUpdate = true;
        newState = simpleSet("schemaTypings", effect.value, newState);
      }
      if (effect.is(setDiagnostics)) {
        didUpdate = true;
        newState = simpleSet("diagnostics", effect.value, newState);
      }
      if (effect.is(setUpdateHook)) {
        didUpdate = true;
        newState = simpleSet("codeUpdateHook", effect.value[0], newState);
      }
    }
    if (didUpdate) {
      return newState;
    }
    return state;
  },
});

export const cmStateView = ViewPlugin.fromClass(
  class {
    constructor() {
      this.run = this.run.bind(this);
    }

    run(view: EditorView) {
      const { schema } = view.state.field(cmStatePlugin);
      const code = view.state.doc.toString();
      Promise.all([
        createNodeMap(schema, code).then((schemaMap) =>
          setSchemaTypings.of(schemaMap)
        ),
        lintCode(schema, code).then((diagnostics) =>
          setDiagnostics.of(diagnostics)
        ),
      ])
        .then((effects) => view.dispatch({ effects }))
        .catch((e) => {
          console.error(e);
        });
    }

    update(update: ViewUpdate) {
      const stateValuesChanged = !isEqual(
        update.startState.field(cmStatePlugin),
        update.state.field(cmStatePlugin)
      );
      if (stateValuesChanged || update.docChanged) {
        this.run(update.view);
      }
    }
  }
);
