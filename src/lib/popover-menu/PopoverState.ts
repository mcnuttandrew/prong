import { StateField, StateEffect } from "@codemirror/state";
import createTooltip from "./PopoverMenu";
import { SyntaxNode } from "@lezer/common";

import { showTooltip } from "@codemirror/view";
import { cmStatePlugin } from "../cmState";
import { getMenuTargetNode } from "../utils";

import { generateMenuContent, MenuRow } from "../compute-menu-contents";

export type UpdateDispatch = { from: number; to: number; value: string };
export type SelectionRoute = [number, number];

export interface PopoverMenuState {
  showPopover: boolean;
  popOverInUse: boolean;
  targetNode: SyntaxNode | any;
  targetedTypings: [];
  tooltip: any;
  selectedRouting: [number, number];
  menuContents: MenuRow[];
}
export const popoverMenuState: PopoverMenuState = {
  showPopover: true,
  popOverInUse: false,
  targetNode: null,
  targetedTypings: [],
  tooltip: null,
  selectedRouting: [0, 0],
  menuContents: [],
};

const simpleSet = (
  key: keyof PopoverMenuState,
  value: any,
  state: PopoverMenuState
) => ({ ...state, [key]: value });

export const popOverState: StateField<PopoverMenuState> = StateField.define({
  create: () => popoverMenuState,
  update(state, tr) {
    for (const effect of tr.effects) {
      if (effect.is(setPopoverVisibility)) {
        return simpleSet("showPopover", effect.value, state);
      }
      if (effect.is(setPopoverUsage)) {
        return simpleSet("popOverInUse", effect.value, state);
      }
      if (effect.is(setRouting)) {
        return simpleSet("selectedRouting", effect.value, state);
      }
    }
    const targetNode = getMenuTargetNode(tr.state);

    // if there isn't (a real) target then bail and don't compute the menu
    if (!targetNode || targetNode.type.name === "JsonText") {
      return { ...state };
    }

    // maybe only compute this stuff if the menu is open
    const { schemaTypings, diagnostics } = tr.state.field(cmStatePlugin);
    const targetedTypings =
      schemaTypings[`${targetNode.from}-${targetNode.to}`] || [];

    // handle multi-cursor stuff appropriately
    const ranges = tr.state.selection.ranges;
    let pos = ranges[0].from;
    const moreThanOneSelection = ranges.length > 1;
    const selectionWiderThanOne = ranges.some(({ from, to }) => from !== to);
    if (moreThanOneSelection || selectionWiderThanOne) {
      return { ...state, tooltip: null };
    }

    const nodeIsActuallyNew = !(
      targetNode?.from === state?.targetNode?.from &&
      targetNode?.to === state?.targetNode?.to
    );
    let popOverInUse: boolean = state.popOverInUse;
    let showPopover: boolean = state.showPopover;
    let selectedRouting = state.selectedRouting;
    if (nodeIsActuallyNew) {
      selectedRouting = [0, 0];
      popOverInUse = false;
      showPopover = true;
    }
    // todo probably want to get an xstate type state machine here, this interaction will get pretty intense

    const menuContents = [
      ...generateMenuContent(
        tr.state.doc.sliceString(targetNode.from, targetNode.to),
        targetNode,
        schemaTypings
      ),
      // ...projections
      //   .filter((proj) => keyPathMatchesQuery(proj.query, keyPath))
      //   .filter((proj) => proj.type === "tooltip")
      //   .map(prepProjections(view, targetNode, keyPath, currentCodeSlice)),
      ...diagnostics
        .filter((x) => x.from === targetNode.from && x.to === targetNode.to)
        .map((lint) => ({
          label: "LINT ERROR",
          elements: [{ type: "display", content: lint.message }],
        })),
    ] as MenuRow[];

    const tooltip = {
      pos: pos,
      create: createTooltip(popOverState),
      above: true,
    };
    return {
      ...state,
      menuContents,
      popOverInUse,
      selectedRouting,
      showPopover,
      targetNode,
      targetedTypings,
      tooltip,
    };
  },
  provide: (f) => [showTooltip.from(f, (val) => val.tooltip)],
});
export const setPopoverVisibility = StateEffect.define<boolean>();
export const setPopoverUsage = StateEffect.define<boolean>();
export const setRouting = StateEffect.define<[number, number]>();
