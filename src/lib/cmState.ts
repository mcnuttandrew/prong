import { StateEffect, StateField } from "@codemirror/state";
import { JSONSchema } from "./JSONSchemaTypes";
import { Projection } from "./widgets";

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
) => {
  return { ...state, [key]: value };
};

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
