import { KeyBinding, EditorView } from "@codemirror/view";
import { simpleUpdate, codeString, getCursorPos } from "../utils";

import {
  popOverState,
  popoverEffectDispatch,
  setRouting,
  SelectionRoute,
  popoverSMEvent,
} from "./PopoverState";

import { MenuRow, MenuElement } from "../compute-menu-contents";
import { modifyCodeByCommand } from "../modify-json";

type dir = "left" | "right" | "down" | "up";
const changeSelectionRoute = (direction: dir) => (view: EditorView) => {
  const { menuState, selectedRouting, menuContents } =
    view.state.field(popOverState);
  // pop over not actively in use
  if (menuState !== "inUse") {
    return false;
  }

  const updatedCursor = buildMoveCursor(
    direction,
    menuContents,
    selectedRouting
  );
  const effect = updatedCursor
    ? setRouting.of(updatedCursor)
    : popoverEffectDispatch.of("stopUsing");
  view.dispatch({ effects: [effect] });

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

  // bail out of menu use
  if (dir === "up" && row - 1 < 0) {
    return false;
  }
  // modify menu selection
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
      codeString(view, 0),
      getCursorPos(view.state)
    );
    if (update) {
      simpleUpdate(view, update.from, update.to, update.value);
    }

    view.dispatch({
      effects: [popoverEffectDispatch.of("close"), setRouting.of([0, 0])],
    });
  }
  return true;
}
const simpleDispatch = (view: EditorView, action: popoverSMEvent) =>
  view.dispatch({ effects: [popoverEffectDispatch.of(action)] });

function forceClose(view: EditorView) {
  simpleDispatch(view, "forceClose");
  return true;
}

function forceOpen(view: EditorView) {
  simpleDispatch(view, "forceOpen");
  return true;
}

function engageWithPopover(view: EditorView) {
  simpleDispatch(view, "use");
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
