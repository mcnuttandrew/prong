import {
  Decoration,
  DecorationSet,
  EditorView,
  ViewPlugin,
  ViewUpdate,
} from "@codemirror/view";
import { syntaxTree } from "@codemirror/language";
import { NodeType, SyntaxNode } from "@lezer/common";
import { Range } from "@codemirror/state";
import isEqual from "lodash.isequal";

import SimpleBoolWidget from "./widgets/bool-widget";
import SimpleColorNameWidget from "./widgets/color-name-widget";
import SimpleColorWidget from "./widgets/color-picker";
import ClickTargetWidget from "./widgets/click-target-widget";
import { cmStatePlugin } from "./cmState";
import { popOverState } from "./popover-menu/PopoverState";
import { projectionState, getInUseRanges } from "./projections";

import Highlighter from "./widgets/highlighter";

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
const simpleWidgets: SimpleWidget[] = [
  SimpleBoolWidget,
  // SimpleNumWidget,
  SimpleColorNameWidget,
  SimpleColorWidget,
  Highlighter,
  ClickTargetWidget,
  // SimpleSliderWidget,
];

function createWidgets(view: EditorView) {
  const widgets: Range<Decoration>[] = [];
  const { projectionsInUse } = view.state.field(projectionState);
  const inUseRanges = getInUseRanges(projectionsInUse);
  for (const { from, to } of view.visibleRanges) {
    syntaxTree(view.state).iterate({
      from,
      to,
      enter: ({ node, from, to, type }) => {
        if (inUseRanges.has(`${from}-${to}`)) {
          return;
        }
        simpleWidgets.forEach(({ checkForAdd, addNode }) => {
          if (!checkForAdd(type, view, node)) {
            return;
          }
          addNode(view, from, to, node).forEach((w) => widgets.push(w));
        });
      },
    });
  }
  try {
    return Decoration.set(widgets.sort((a, b) => a.from - b.from));
  } catch (e) {
    console.log(e);
    console.log("problem creating widgets");
    return Decoration.set([]);
  }
}

// create event handler for all in play widgets
const subscriptions = simpleWidgets.reduce((acc, row) => {
  Object.entries(row.eventSubscriptions).forEach(([eventName, sub]) => {
    acc[eventName] = (acc[eventName] || []).concat(sub);
  });
  return acc;
}, {} as { [eventName: string]: any[] });
const eventHandlers = Object.entries(subscriptions).reduce(
  (handlers: EventSubs, [eventName, subs]) => {
    handlers[eventName] = (event, view) => {
      subs.forEach((sub) => sub(event, view));
    };

    return handlers;
  },
  {}
);
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
    eventHandlers,
  }
);
