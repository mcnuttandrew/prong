import { StateField, StateEffect, EditorState } from "@codemirror/state";
import createTooltip from "./PopoverMenu";
import { SyntaxNode } from "@lezer/common";
import { Transaction } from "@codemirror/state";
import { showTooltip } from "@codemirror/view";
import { cmStatePlugin } from "../cmState";
import { projectionState } from "../projections";
import {
  codeStringState,
  getMenuTargetNode,
  syntaxNodeToKeyPath,
} from "../utils";
import { runProjectionQuery } from "../query";
import { Projection } from "../projections";

import { generateMenuContent, MenuRow } from "../compute-menu-contents";

export type UpdateDispatch = { from: number; to: number; value: string };
export type SelectionRoute = [number, number];

export interface PopoverMenuState {
  menuState: popOverSMState;
  targetNode: SyntaxNode | null;
  targetedTypings: [];
  tooltip: any;
  selectedRouting: [number, number];
  menuContents: MenuRow[];
  hasProjectionContent: boolean;
}
export const popoverMenuState: PopoverMenuState = {
  menuState: "preFirstUse",
  targetNode: null,
  targetedTypings: [],
  tooltip: null,
  selectedRouting: [0, 0],
  menuContents: [],
  hasProjectionContent: false,
};

const simpleSet = (
  key: keyof PopoverMenuState,
  value: any,
  state: PopoverMenuState
) => ({ ...state, [key]: value });

function cursorBehaviorIsValid(tr: Transaction) {
  const ranges = tr.state.selection.ranges;
  const moreThanOneSelection = ranges.length > 1;
  const selectionWiderThanOne = ranges.some(({ from, to }) => from !== to);
  return !(moreThanOneSelection || selectionWiderThanOne);
}

function selectionInsideProjection(tr: Transaction, pos: number) {
  const { projectionsInUse } = tr.state.field(projectionState);
  const posInsideOfInUseRange = projectionsInUse.some(
    ({ from, to }) => pos >= from && pos <= to
  );
  return posInsideOfInUseRange;
}

function handleSimpleUpdate(
  state: PopoverMenuState,
  tr: Transaction
): { newState: PopoverMenuState; didUpdate: boolean } {
  let newState = state;
  let didUpdate = false;
  for (const effect of tr.effects) {
    if (effect.is(popoverEffectDispatch)) {
      didUpdate = true;
      const newMenuState = PopoverStateMachine(state.menuState, effect.value);
      newState = simpleSet("menuState", newMenuState, state);
    }
    if (effect.is(setRouting)) {
      didUpdate = true;
      newState = simpleSet("selectedRouting", effect.value, newState);
    }
  }
  return { newState, didUpdate };
}

export type popoverSMEvent =
  | "forceClose"
  | "forceOpen"
  | "open"
  | "close"
  | "use"
  | "stopUsing"
  | "firstUse";
export type popOverSMState =
  | "hardClosed"
  | "hidden"
  | "open"
  | "inUse"
  | "preFirstUse";
export const visibleStates = new Set<popOverSMState>(["open", "inUse"]);
type PartialRecord<K extends keyof any, T> = {
  [P in K]?: T;
};
const stateMap: Record<
  popOverSMState,
  PartialRecord<popoverSMEvent, popOverSMState>
> = {
  hardClosed: {
    forceOpen: "open",
  },
  hidden: {
    open: "open",
  },
  open: {
    forceClose: "hardClosed",
    close: "hidden",
    use: "inUse",
  },
  inUse: {
    forceClose: "hardClosed",
    stopUsing: "open",
    close: "hidden",
  },
  preFirstUse: {
    firstUse: "hidden",
  },
};

function PopoverStateMachine(
  state: popOverSMState,
  event: popoverSMEvent
): popOverSMState {
  try {
    return stateMap[state][event] || state;
  } catch (e) {
    console.log("error transitioning", e);
    return state;
  }
}

function computeContents(tr: Transaction, targetNode: SyntaxNode) {
  const { schemaTypings, diagnostics } = tr.state.field(cmStatePlugin);
  const fullCode = tr.state.doc.toString();

  return [
    ...generateMenuContent(targetNode, schemaTypings, fullCode),
    ...diagnostics
      .filter((x) => x.from === targetNode.from && x.to === targetNode.to)
      .map((lint) => ({
        label: "LINT ERROR",
        elements: [{ type: "display", content: lint.message }],
      })),
  ] as MenuRow[];
}

function materializeTypings(tr: Transaction, targetNode: SyntaxNode) {
  const { schemaTypings } = tr.state.field(cmStatePlugin);

  return schemaTypings[`${targetNode.from}-${targetNode.to}`] || [];
}

export function getProjectionContents(
  state: EditorState,
  targetNode: SyntaxNode,
  targetNodeValue: string
): Projection[] {
  const { projections } = state.field(cmStatePlugin);
  const keyPath = syntaxNodeToKeyPath(targetNode, codeStringState(state, 0));
  return projections
    .filter((proj) => runProjectionQuery(proj.query, keyPath, targetNodeValue))
    .filter((proj) => proj.type === "tooltip");
}

export const popOverState: StateField<PopoverMenuState> = StateField.define({
  create: () => popoverMenuState,
  update(state, tr) {
    const simpleUpdate = handleSimpleUpdate(state, tr);
    if (simpleUpdate.didUpdate) {
      return simpleUpdate.newState;
    }

    // main path
    const targetNode = getMenuTargetNode(tr.state);
    let pos = tr.state.selection.ranges[0].from;

    // dont show up before user initiates things
    if (state.menuState === "preFirstUse") {
      return !tr.selection
        ? state
        : {
            ...state,
            menuState: PopoverStateMachine(state.menuState, "firstUse"),
          };
    }

    // if there isn't (a real) target then bail and don't compute the menu
    if (!targetNode || targetNode.type.name === "JsonText") {
      return state;
    }
    // handle multi-cursor stuff appropriately and dont show popover through a projection
    if (!cursorBehaviorIsValid(tr) || selectionInsideProjection(tr, pos)) {
      return { ...state, tooltip: null };
    }

    const nodeIsActuallyNew = !(
      targetNode?.from === state?.targetNode?.from &&
      targetNode?.to === state?.targetNode?.to
    );
    const selectedRouting: SelectionRoute = nodeIsActuallyNew
      ? [0, 0]
      : state.selectedRouting;
    const menuState = PopoverStateMachine(state.menuState, "open");

    // if were not showing the popover bail
    if (!visibleStates.has(menuState)) {
      return { ...state, tooltip: null };
    }
    const tooltip = createTooltip(popOverState);
    const currentCodeSlice = codeStringState(
      tr.state,
      targetNode.from,
      targetNode.to
    );
    return {
      ...state,
      hasProjectionContent:
        getProjectionContents(tr.state, targetNode, currentCodeSlice).length >
        0,
      menuContents: computeContents(tr, targetNode),
      menuState,
      selectedRouting,
      targetNode,
      targetedTypings: materializeTypings(tr, targetNode),
      tooltip: {
        pos,
        create: tooltip,
        above: true,
      },
    };
  },
  provide: (f) => [showTooltip.from(f, (val) => val.tooltip)],
});
export const popoverEffectDispatch = StateEffect.define<popoverSMEvent>();
export const setRouting = StateEffect.define<[number, number]>();
