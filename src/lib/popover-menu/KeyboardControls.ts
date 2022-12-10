import { KeyBinding, EditorView } from "@codemirror/view";
import { simpleUpdate, codeString } from "../utils";

import {
  popOverState,
  setPopoverUsage,
  setPopoverVisibility,
  setRouting,
  SelectionRoute,
} from "./PopoverState";

import { MenuRow, MenuElement } from "../compute-menu-contents";
import { modifyCodeByCommand } from "../modify-json";

type dir = "left" | "right" | "down" | "up";
const changeSelectionRoute = (direction: dir) => (view: EditorView) => {
  const { showPopover, popOverInUse, selectedRouting, menuContents } =
    view.state.field(popOverState);
  // pop over not visible
  if (!showPopover) {
    return false;
  }

  if (!popOverInUse) {
    return false;
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
      targetNode!,
      codeString(view, 0)
    );
    if (update) {
      simpleUpdate(view, update.from, update.to, update.value);
    }

    view.dispatch({
      effects: [
        setPopoverUsage.of(false),
        setPopoverVisibility.of(false),
        setRouting.of([0, 0]),
      ],
    });
  }
  return true;
}

function forceClose(view: EditorView) {
  view.dispatch({
    effects: [setPopoverUsage.of(false), setPopoverVisibility.of(false)],
  });
  return true;
}

function forceOpen(view: EditorView) {
  view.dispatch({
    effects: [setPopoverUsage.of(true), setPopoverVisibility.of(true)],
  });
  return true;
}

function engageWithPopover(view: EditorView) {
  view.dispatch({ effects: [setPopoverUsage.of(true)] });
  return true;
}

export const popOverCompletionKeymap: readonly KeyBinding[] = [
  //   { key: "Ctrl-Space", run: startCompletion },
  { key: "Cmd-.", run: forceOpen },
  { key: "Escape", run: forceClose },
  { key: "Cmd-ArrowDown", run: engageWithPopover, preventDefault: true },
  { key: "ArrowDown", run: changeSelectionRoute("down") },
  { key: "ArrowUp", run: changeSelectionRoute("up") },
  { key: "ArrowLeft", run: changeSelectionRoute("left") },
  { key: "ArrowRight", run: changeSelectionRoute("right") },
  { key: "Enter", run: runSelection },
];
