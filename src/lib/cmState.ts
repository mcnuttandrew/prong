import { StateEffect, StateField } from "@codemirror/state";

export type CmState = {};

export const initialCmState = {};

function reducer(state: CmState, effect: StateEffect<any>) {
  return state;
}

export const cmStatePlugin = StateField.define({
  create: () => initialCmState,
  update(state, tr) {
    let newState = state;
    for (const effect of tr.effects) {
      newState = reducer(newState, effect);
    }
    return newState;
  },
});
