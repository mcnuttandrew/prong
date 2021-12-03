// see this file for examples
// https://github.com/codemirror/commands/blob/acab64fc3d911393b6728c1e8eacadf5c11cc9bf/src/commands.ts#L683
import {
  EditorState,
  EditorSelection,
  SelectionRange,
} from "@codemirror/state";
import { EditorView, KeyBinding } from "@codemirror/view";
import { syntaxTree } from "@codemirror/language";
import { SyntaxNode } from "@lezer/common";

function updateSel(
  sel: EditorSelection,
  by: (range: SelectionRange) => SelectionRange
) {
  return EditorSelection.create(sel.ranges.map(by), sel.mainIndex);
}

function setSel(
  state: EditorState,
  selection: EditorSelection | { anchor: number; head?: number }
) {
  return state.update({
    selection,
    scrollIntoView: true,
    userEvent: "select",
  });
}

function findAstNode(
  view: EditorView,
  targetRange: [number, number]
): SyntaxNode | null {
  const [targFrom, targTo] = targetRange;
  const { from, to } = view.visibleRanges[0];
  let smallestContainer: SyntaxNode | null = null;
  let smallestContainerSize = Infinity;
  const log: any = [];
  syntaxTree(view.state).iterate({
    from,
    to,
    enter: (type, from, to, get) => {
      const rangeSize = to - from;
      if (
        from <= targFrom &&
        to >= targTo &&
        rangeSize < smallestContainerSize
      ) {
        smallestContainerSize = rangeSize;
        smallestContainer = get();
        log.push(smallestContainer);
      }
    },
  });
  console.log(log);
  return smallestContainer;
}

function moveOnAst(
  view: EditorView,
  nextNode: (x: SyntaxNode) => SyntaxNode | null
) {
  const state = view.state;
  const targ = state.selection.ranges[0];
  const node = findAstNode(view, [targ.from, targ.to]); // or the whole thing

  if (!node) {
    console.log("nothing found");
    return true;
  }
  const next = nextNode(node);
  if (!next) {
    console.log("no next");
    return true;
  }

  let selection = updateSel(view.state.selection, (range) => {
    return EditorSelection.range(next.from, next.to);
  });
  view.dispatch(setSel(view.state, selection));
  return true;
}

const selectNextAstNode = (view: EditorView) =>
  moveOnAst(view, (x) => x.nextSibling);
const selectPrevAstNode = (view: EditorView) =>
  moveOnAst(view, (x) => x.prevSibling);
const selectChildAstNode = (view: EditorView) =>
  moveOnAst(view, (x) => {
    let child = x.firstChild;
    if (!child) {
      return child;
    }
    if (new Set(["{", "}"]).has(child.type.name)) {
      return child.nextSibling;
    }
    return child;
  });
const selectParentAstNode = (view: EditorView) =>
  moveOnAst(view, (x) => x.parent);

// to do:
// down -> go into element
// up -> go up an ast level
// left -> go to prev sibling or loop to end
// right -> go to next sibling or return to start
// enter -> open structure menu
// esc -> close structure menu or go up a level
// see https://developer.mozilla.org/en-US/docs/Web/API/KeyboardEvent/key
export const ASTKeyBinding: readonly KeyBinding[] = [
  {
    key: "Cmd-ArrowRight",
    run: selectNextAstNode,
    preventDefault: true,
  },
  {
    key: "Cmd-ArrowLeft",
    run: selectPrevAstNode,
    preventDefault: true,
  },
  {
    key: "Cmd-ArrowUp",
    run: selectParentAstNode,
    preventDefault: true,
  },
  {
    key: "Cmd-ArrowDown",
    run: selectChildAstNode,
    preventDefault: true,
  },
];

// Jet's Keybinding
// h:          ascend
// l:          descend
// j:          next sibling
// k:          previous sibling
// J:          move down (in array)
// K:          move up (in array)
// i:          enter edit mode (string/number)
// <C-s>:      save file
// <SPACE>:    toggle boolean
// <ESC>:      exit edit mode
// <BS>:       delete key/element
// <ENTER>:    add new key/element (object/array)
// <TAB>:      toggle fold
// f:          unfold all children
// F:          fold all children
// s:          replace element with string
// b:          replace element with bool
// n:          replace element with number
// N:          replace element with null
// a:          replace element with array
// o:          replace element with object
// u:          undo last change (undo buffer keeps 100 states)
// <C-r>:      redo from undo states
// y:          copy current value into buffer (and clipboard)
// p:          paste value from buffer over current value
// x:          cut a value, equivalent to a copy -> delete
// q | ctrl-c: quit without saving. Due to a bug, tap twice
