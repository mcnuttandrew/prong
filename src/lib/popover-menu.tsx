import React from "react";
import ReactDOM from "react-dom";

import { Prec, Extension, StateField, StateEffect } from "@codemirror/state";
import PopOverMenu from "../components/PopoverMenu";
import { SyntaxNode } from "@lezer/common";

import {
  KeyBinding,
  keymap,
  EditorView,
  showTooltip,
  TooltipView,
} from "@codemirror/view";
import { cmStatePlugin } from "./cmState";
import {
  getMenuTargetNode,
  simpleUpdate,
  codeString,
  modifyCodeByCommand,
} from "./utils";

import {
  generateMenuContent,
  MenuRow,
  MenuElement,
} from "./compute-menu-contents";

export type UpdateDispatch = { from: number; to: number; value: string };
export type SelectionRoute = [number, number];

interface PopoverMenuState {
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
      ...diagnostics.map((lint) => ({
        label: "LINT ERROR",
        elements: [{ type: "display", content: lint.message }],
      })),
    ] as MenuRow[];

    const tooltip = {
      pos: targetNode.from,
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

class Tooltip {
  dom: HTMLElement;
  constructor(
    readonly view: EditorView,
    readonly stateField: StateField<PopoverMenuState>
  ) {
    this.dom = document.createElement("div");
    this.dom.className = "cm-tooltip-autocomplete";
    this.update();
  }

  update() {
    const { projections } = this.view.state.field(cmStatePlugin);
    const { targetNode, showPopover, selectedRouting, menuContents } =
      this.view.state.field(this.stateField);
    // TODO: dont show if target is projection
    if (
      !targetNode ||
      targetNode.type.name === "JsonText" ||
      !showPopover ||
      !menuContents.length
    ) {
      ReactDOM.unmountComponentAtNode(this.dom);
      return;
    }
    // TODO add a bunch of guards to see if equivalent inputs have actually changed or not

    const codeUpdate = (codeUpdate: UpdateDispatch) => {
      console.log("update?", codeUpdate);
      simpleUpdate(this.view, codeUpdate.from, codeUpdate.to, codeUpdate.value);
    };
    const closeMenu = () =>
      this.view.dispatch({ effects: [setPopoverVisibility.of(false)] });

    const setSelectedRouting = (route: [number, number]) =>
      this.view.dispatch({ effects: [setRouting.of(route)] });

    const element = React.createElement(PopOverMenu, {
      closeMenu,
      codeUpdate,
      menuContents,
      projections,
      selectedRouting,
      setSelectedRouting,
      syntaxNode: targetNode,
      view: this.view,
    });
    // this might be too aggressive a rendering scheme?

    ReactDOM.render(element, this.dom);
  }
}

export function createTooltip(stateField: StateField<typeof popoverMenuState>) {
  return (view: EditorView): TooltipView => new Tooltip(view, stateField);
}

type dir = "left" | "right" | "down" | "up";
const changeSelectionRoute = (direction: dir) => (view: EditorView) => {
  const { showPopover, popOverInUse, selectedRouting, menuContents } =
    view.state.field(popOverState);
  // pop over not visible
  if (!showPopover) {
    return false;
  }
  console.log(direction, { showPopover, popOverInUse });
  // popover visible but not selected
  if (direction !== "down" && !popOverInUse) {
    return false;
  }

  if (direction === "down" && !popOverInUse) {
    view.dispatch({ effects: [setPopoverUsage.of(true)] });
    return true;
  }
  const updatedCursor = buildMoveCursor(
    direction,
    menuContents,
    selectedRouting
  );
  if (!updatedCursor) {
    view.dispatch({
      effects: [setPopoverUsage.of(false), setPopoverVisibility.of(false)],
    });
  } else {
    view.dispatch({ effects: [setRouting.of(updatedCursor)] });
  }
  return true;
};

function buildMoveCursor(
  dir: dir,
  content: MenuRow[],
  route: SelectionRoute
): SelectionRoute | false {
  let row = route[0];
  let col = route[1];

  const leafGroupSize = content[row].elements?.length;
  const numRows = content.length;

  if (dir === "up" && row - 1 < 0) {
    return false;
  }
  if (dir === "up" && row - 1 >= 0) {
    row -= 1;
    col = 0;
  }
  if (dir === "down" && row < numRows - 1) {
    row += 1;
    col = 0;
  }
  if (dir === "left") {
    col = Math.max(col - 1, 0);
  }
  if (dir === "right") {
    col = Math.min(col + 1, leafGroupSize);
  }

  return [row, col];
}

function closePopover(view: EditorView) {
  view.dispatch({
    effects: [setPopoverUsage.of(false), setPopoverVisibility.of(false)],
  });
  return true;
}

const traverseContentTreeToNode: (
  tree: MenuRow[],
  path: SelectionRoute
) => MenuElement | MenuRow | null = (tree, [row, col]) =>
  tree[row].elements[col - 1];

function runSelection(view: EditorView) {
  const { menuContents, selectedRouting, targetNode } =
    view.state.field(popOverState);
  let target = traverseContentTreeToNode(menuContents, selectedRouting);
  if (!target) {
    return false;
  }
  if ((target as MenuRow).label) {
    return false;
  }
  target = target as MenuElement;
  if (target.type === "button") {
    const update = modifyCodeByCommand(
      target.onSelect,
      targetNode,
      codeString(view, 0)
    );
    if (update) {
      simpleUpdate(view, update.from, update.to, update.value);
    }
    // hack
    // setTimeout(() => closeMenu(), 30);
    view.dispatch({
      effects: [setPopoverUsage.of(false), setPopoverVisibility.of(false)],
    });
  }
  return true;
}

export const popOverCompletionKeymap: readonly KeyBinding[] = [
  //   { key: "Ctrl-Space", run: startCompletion },
  { key: "Escape", run: closePopover },
  { key: "ArrowDown", run: changeSelectionRoute("down") },
  { key: "ArrowUp", run: changeSelectionRoute("up") },
  { key: "ArrowLeft", run: changeSelectionRoute("left") },
  { key: "ArrowRight", run: changeSelectionRoute("right") },
  { key: "Enter", run: runSelection },
];

export default function popoverPlugin(): Extension {
  return [
    keymap.of(popOverCompletionKeymap),
    popOverState,
    // PopoverPlugin,
  ];
}

// export const PopoverPlugin = ViewPlugin.fromClass(
//   class implements PluginValue {
//     constructor() {}
//     update(update: ViewUpdate) {
//       const state = update.view.state;
//       const { schemaTypings } = state.field(cmStatePlugin)!;
//       //   const possibleTargets = getMenuTargetNode(update.view);
//       //   console.log(schemaTypings, update, possibleTargets);
//       //   if ()
//     }
//   },
//   {
//     eventHandlers: {
//       blur() {},
//       popStart() {},
//       popEnd() {},
//     },
//   }
// );
