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
// import {range}
import isEqual from "lodash.isequal";

import { codeString } from "./utils";
import SimpleBoolWidget from "./widgets/bool-widget";
import SimpleColorNameWidget from "./widgets/color-name-widget";
import SimpleColorWidget from "./widgets/color-picker";
import ClickTargetWidget from "./widgets/click-target-widget";
import { cmStatePlugin } from "./cmState";

import InlineProjectWidgetFactory from "./widgets/inline-projection-widget";
import Highlighter from "./widgets/highlighter";

// type Range<A> = A;

export interface ProjectionProps {
  view: EditorView;
  node: SyntaxNode;
  keyPath: (string | number)[];
  currentValue: any;
}

export interface Projection {
  query: string[];
  type: "tooltip" | "inline";
  projection: (props: ProjectionProps) => JSX.Element;
  hasInternalState: boolean;
}

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
  const { projections } = view.state.field(cmStatePlugin);
  for (const { from, to } of view.visibleRanges) {
    syntaxTree(view.state).iterate({
      from,
      to,
      // enter: (type, from, to, get) => {
      enter: (currentNodeRef) => {
        const currentNode = currentNodeRef.node;
        const from = currentNodeRef.from;
        const to = currentNodeRef.to;
        const type = currentNodeRef.type;
        // const currentNode = get();
        const inlineProjections = projections.filter(
          (proj) => proj.type === "inline"
        );
        const currentCodeSlice = codeString(view, from, to);
        // calculate inline projection
        let hasProjection = false;
        const baseRange = view.state.selection.ranges[0];
        inlineProjections.forEach((projection) => {
          const projWidget = InlineProjectWidgetFactory(
            projection,
            currentCodeSlice,
            currentNode
          );
          if (!projWidget.checkForAdd(type, view, currentNode)) {
            return;
          }

          if (
            !projection.hasInternalState &&
            baseRange &&
            baseRange.from >= from &&
            baseRange.from <= to
          ) {
            return;
          }
          hasProjection = true;
          projWidget
            .addNode(view, from, to, currentNode)
            .forEach((w) => widgets.push(w));
        });
        if (hasProjection) {
          return;
        }

        simpleWidgets.forEach(({ checkForAdd, addNode }) => {
          if (!checkForAdd(type, view, currentNode)) {
            return;
          }
          addNode(view, from, to, currentNode).forEach((w) => widgets.push(w));
        });
      },
    });
  }
  try {
    return Decoration.set(
      widgets.sort((a, b) => {
        return a.from - b.from;
      })
    );
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
      if (update.docChanged || update.viewportChanged || stateValuesChanged) {
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
