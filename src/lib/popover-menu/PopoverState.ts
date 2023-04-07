import { StateField, StateEffect, EditorState } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import createTooltip from "./PopoverMenu";
import { SyntaxNode } from "@lezer/common";
import { Transaction } from "@codemirror/state";
import { showTooltip } from "@codemirror/view";
import { cmStatePlugin } from "../cmState";
import {
  codeStringState,
  getMenuTargetNode,
  syntaxNodeToKeyPath,
} from "../utils";
import { potentiallyFilterContentForGesture } from "../search";
import { runProjectionQuery } from "../query";
import {
  Projection,
  ProjectionFullTooltip,
  ProjectionTooltip,
} from "../projections";
import { prepDiagnostics } from "../compute-menu-contents";
import { pickNodetoHighlight } from "../widgets/highlighter";

import {
  generateMenuContent,
  MenuRow,
  MenuElement,
} from "../compute-menu-contents";

export type UpdateDispatch = { from: number; to: number; value: string };
export type SelectionRoute = [number, number];

export interface PopoverMenuState {
  menuState: popOverSMState;
  targetNode: SyntaxNode | null;
  highlightNode: SyntaxNode | null;
  targetedTypings: [];
  tooltip: any;
  selectedRouting: [number, number];
  menuContents: MenuRow[];
  hasProjectionContent: boolean;
}
export const popoverMenuState: PopoverMenuState = {
  // menuState: "preFirstUse",
  menuState: "hardClosed",
  targetNode: null,
  highlightNode: null,
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

// function selectionInsideProjection(tr: Transaction, pos: number) {
//   const { projectionsInUse } = tr.state.field(projectionState);
//   const posInsideOfInUseRange = projectionsInUse.some(
//     ({ from, to }) => pos >= from && pos <= to
//   );
//   return posInsideOfInUseRange;
// }

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

const specialPriority: Record<string, number> = {
  Description: 100,
  "Lint error": 99,
};

function computeContents(tr: Transaction, targetNode: SyntaxNode) {
  const { schemaTypings, diagnostics } = tr.state.field(cmStatePlugin);
  const fullCode = tr.state.doc.toString();

  let contents = [
    ...generateMenuContent(targetNode, schemaTypings, fullCode),
    ...prepDiagnostics(diagnostics, targetNode),
  ] as MenuRow[];

  return potentiallyFilterContentForGesture(
    targetNode,
    fullCode,
    contents
  ).sort(
    (b, a) => (specialPriority[a.label] || 0) - (specialPriority[b.label] || 0)
  );
}

function getTypings(tr: Transaction, targetNode: SyntaxNode) {
  const { schemaTypings } = tr.state.field(cmStatePlugin);

  return schemaTypings[`${targetNode.from}-${targetNode.to}`] || [];
}

const tooltipTypes = new Set(["tooltip", "full-tooltip"]);
function getProjectionContents(
  state: EditorState,
  targetNode: SyntaxNode,
  targetNodeValue: string
): Projection[] {
  const { projections, schemaTypings } = state.field(cmStatePlugin);
  const keyPath = syntaxNodeToKeyPath(targetNode, codeStringState(state, 0));
  const typings = schemaTypings[`${targetNode.from}-${targetNode.to}`];
  return projections
    .filter((proj) =>
      // todo covert these args to named args
      runProjectionQuery(
        proj.query,
        keyPath,
        targetNodeValue,
        typings,
        targetNode.type.name,
        // @ts-ignore
        proj.id
      )
    )
    .filter((proj) => tooltipTypes.has(proj.type));
}

export function buildProjectionsForMenu(props: {
  fullCode: string;
  node: SyntaxNode | null;
  state: EditorState;
  view: EditorView;
  currentCodeSlice: string;
}): MenuRow[] {
  const { fullCode, state, node, currentCodeSlice, view } = props;
  const { schemaTypings, diagnostics } = state.field(cmStatePlugin);
  if (!node) {
    return [] as MenuRow[];
  }
  const keyPath = syntaxNodeToKeyPath(node, fullCode);
  return getProjectionContents(state, node!, currentCodeSlice).map((proj) => ({
    label: (proj as ProjectionFullTooltip | ProjectionTooltip).name,
    elements: [
      {
        type: "projection",
        projectionType: proj.type,
        element: (proj as ProjectionFullTooltip | ProjectionTooltip).projection(
          {
            node,
            keyPath,
            currentValue: currentCodeSlice,
            setCode: (code) => {
              view.dispatch({
                changes: { from: 0, to: fullCode.length, insert: code },
                // selection: state.selection,
              });
            },
            fullCode,
            diagnosticErrors: diagnostics.filter(
              (x) => x.from === node.from && x.to === node.to
            ),
            typings: schemaTypings[`${node.from}-${node.to}`],
            cursorPositions: [...view.state.selection.ranges],
          }
        ),
      },
    ],
  }));
}

export function maybeFilterToFullProjection(menuRows: MenuRow[]): MenuRow[] {
  let noFullProjection = true;
  let projection: null | MenuElement = null;
  let projLabel: null | string = null;
  menuRows.forEach((row) =>
    row.elements.forEach((el) => {
      if (el.type === "projection" && el.projectionType === "full-tooltip") {
        noFullProjection = false;
        projection = el;
        projLabel = row.label;
      }
    })
  );
  return noFullProjection
    ? menuRows
    : ([{ elements: [projection!], label: projLabel! }] as MenuRow[]);
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
    // if (!cursorBehaviorIsValid(tr) || selectionInsideProjection(tr, pos)) {
    if (!cursorBehaviorIsValid(tr)) {
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

    // TODO ADD CACHEING FOR THE MENU HERE, cachekey: targetNode (from, to), code, ?

    // if were not showing the popover bail
    // cant do that because the docked menu might need stuff
    // if (!visibleStates.has(menuState)) {
    //   return { ...state, tooltip: null };
    // }
    const tooltip = createTooltip(popOverState);
    const currentCodeSlice = codeStringState(
      tr.state,
      targetNode.from,
      targetNode.to
    );
    const hasProjectionContent =
      getProjectionContents(tr.state, targetNode, currentCodeSlice).length > 0;

    return {
      ...state,
      hasProjectionContent,
      menuContents: computeContents(tr, targetNode),
      menuState,
      selectedRouting,
      targetNode,
      highlightNode: pickNodetoHighlight(targetNode),
      targetedTypings: getTypings(tr, targetNode),
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
