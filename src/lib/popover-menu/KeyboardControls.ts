import { KeyBinding, EditorView } from "@codemirror/view";
import { simpleUpdate, codeString, modifyCodeByCommand } from "../utils";
import {
  popOverState,
  setPopoverUsage,
  setPopoverVisibility,
  setRouting,
  SelectionRoute,
} from "./PopoverState";

import { MenuRow, MenuElement } from "../compute-menu-contents";

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
