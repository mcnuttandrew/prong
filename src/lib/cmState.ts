import { StateEffect, StateField } from "@codemirror/state";
import { JSONSchema } from "./JSONSchemaTypes";
import { Projection } from "./widgets";

export const setSchema = StateEffect.define<JSONSchema>();
export const setProjections = StateEffect.define<Projection[]>();
// export type CmState = {};

export const initialCmState = {
  schema: {} as JSONSchema,
  projections: [] as Projection[],
};

export const cmStatePlugin = StateField.define({
  create: () => initialCmState,
  update(state, tr) {
    for (const effect of tr.effects) {
      if (effect.is(setSchema)) {
        return {
          projections: state.projections,
          schema: effect.value as JSONSchema,
        };
      }
      if (effect.is(setProjections)) {
        return {
          schema: state.schema,
          projections: effect.value as Projection[],
        };
      }
    }
    return state;
  },
});
