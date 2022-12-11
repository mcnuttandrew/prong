import { StateEffect, StateField } from "@codemirror/state";
import { ViewPlugin, EditorView, ViewUpdate } from "@codemirror/view";
import { JSONSchema } from "./JSONSchemaTypes";
import { Projection } from "./projections";
import { createNodeMap } from "./utils";
import { lintCode } from "./Linter";
import isEqual from "lodash.isequal";

export const setSchema = StateEffect.define<JSONSchema>();
export const setProjections = StateEffect.define<Projection[]>();
export const setSchemaTypings = StateEffect.define<Record<string, any>>();
export const setDiagnostics = StateEffect.define<any[]>();

export const initialCmState = {
  schema: {} as JSONSchema,
  projections: [] as Projection[],
  schemaTypings: {} as Record<string, any>,
  diagnostics: [] as any[],
};

const simpleSet = (
  key: keyof typeof initialCmState,
  value: any,
  state: typeof initialCmState
) => ({ ...state, [key]: value });

export const cmStatePlugin = StateField.define({
  create: () => initialCmState,
  update(state, tr) {
    for (const effect of tr.effects) {
      if (effect.is(setSchema)) {
        return simpleSet("schema", effect.value, state);
      }
      if (effect.is(setProjections)) {
        return simpleSet("projections", effect.value, state);
      }
      if (effect.is(setSchemaTypings)) {
        return simpleSet("schemaTypings", effect.value, state);
      }
      if (effect.is(setDiagnostics)) {
        return simpleSet("diagnostics", effect.value, state);
      }
    }
    return state;
  },
  provide: (field) => [],
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
      ]).then((effects) => view.dispatch({ effects }));
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
