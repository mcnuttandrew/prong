import {
  Decoration,
  DecorationSet,
  EditorView,
  ViewPlugin,
  ViewUpdate,
} from "@codemirror/view";
import { syntaxTree } from "@codemirror/language";
import { NodeType, SyntaxNode } from "@lezer/common";

import { Range, EditorState } from "@codemirror/state";
import isEqual from "lodash.isequal";

import { cmStatePlugin } from "./cmState";
import { popOverState } from "./popover-menu/PopoverState";

import Highlighter from "./widgets/highlighter";
import { getInUseRanges, projectionState } from "./projections";

type EventSubs = { [x: string]: (e: MouseEvent, view: EditorView) => any };
export interface SimpleWidget {
  checkForAdd: (
    type: NodeType,
    view: EditorView,
    currentNode: SyntaxNode
  ) => boolean;
  addNode: (
    view: EditorView,
    from: number,
    to: number,
    currentNode: SyntaxNode
  ) => Range<Decoration>[];
  eventSubscriptions: EventSubs;
}
export interface SimpleWidgetStateVersion {
  checkForAdd: (
    type: NodeType,
    state: EditorState,
    currentNode: SyntaxNode
  ) => boolean;
  addNode: (
    state: EditorState,
    from: number,
    to: number,
    currentNode: SyntaxNode
  ) => Range<Decoration>[];
  eventSubscriptions: EventSubs;
}

function createWidgets(view: EditorView) {
  const widgets: Range<Decoration>[] = [];
  // todo maybe this won't break?
  const { projectionsInUse } = view.state.field(projectionState);
  const blockedRanges = getInUseRanges(projectionsInUse);
  for (const { from, to } of view.visibleRanges) {
    syntaxTree(view.state).iterate({
      from,
      to,
      enter: ({ node, from, to, type }) => {
        if (blockedRanges.has(`${from}-${to}`)) {
          return false;
        }
        [Highlighter].forEach(({ checkForAdd, addNode }) => {
          if (!checkForAdd(type, view, node)) {
            return;
          }
          addNode(view, from, to, node).forEach((w) => widgets.push(w));
        });
      },
    });
  }
  try {
    return Decoration.set(
      widgets.sort((a, b) => {
        const delta = a.from - b.from;
        const relWidth = 0;
        // const relWidth = a.to - a.from - (b.to - b.from);
        return delta || relWidth;
      })
    );
  } catch (e) {
    console.log(e);
    console.log("problem creating widgets");
    return Decoration.set([]);
  }
}

// create event handler for all in play widgets
// const subscriptions = simpleWidgets.reduce((acc, row) => {
//   Object.entries(row.eventSubscriptions).forEach(([eventName, sub]) => {
//     acc[eventName] = (acc[eventName] || []).concat(sub);
//   });
//   return acc;
// }, {} as { [eventName: string]: any[] });
// const eventHandlers = Object.entries(subscriptions).reduce(
//   (handlers: EventSubs, [eventName, subs]) => {
//     handlers[eventName] = (event, view) => {
//       subs.forEach((sub) => sub(event, view));
//     };

//     return handlers;
//   },
//   {}
// );
// build the widgets
export const widgetsPlugin = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet;

    constructor(view: EditorView) {
      this.decorations = createWidgets(view);
    }

    update(update: ViewUpdate) {
      const stateValuesChanged = !isEqual(
        update.startState.field(cmStatePlugin),
        update.state.field(cmStatePlugin)
      );
      const targetChanged = !isEqual(
        update.startState.field(popOverState).targetNode,
        update.state.field(popOverState).targetNode
      );
      if (
        update.docChanged ||
        update.viewportChanged ||
        stateValuesChanged ||
        targetChanged
      ) {
        this.decorations = createWidgets(update.view);
      }
    }

    // todo maybe need to add destroy and force
  },
  {
    decorations: (v) => v.decorations,
    // eventHandlers,
  }
);
