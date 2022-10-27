import {
  Decoration,
  DecorationSet,
  EditorView,
  Range,
  ViewPlugin,
  ViewUpdate,
} from "@codemirror/view";
import { syntaxTree } from "@codemirror/language";
import { NodeType, SyntaxNode } from "@lezer/common";
import isEqual from "lodash.isequal";

// import { getMatchingSchemas } from "./from-vscode/validator";
import { codeString } from "./utils";
// import SimpleSliderWidget from "./widgets/slider-widget";
import SimpleBoolWidget from "./widgets/bool-widget";
import SimpleColorNameWidget from "./widgets/color-name-widget";
import SimpleColorWidget from "./widgets/color-picker";
// import SimpleNumWidget from "./widgets/num-widget";
import { cmStatePlugin } from "./cmState";

import InlineProjectWidgetFactory from "./widgets/inline-projection-widget";
// import AnnotationWidget from "./widgets/annotation-widget";

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
  // SimpleSliderWidget,
];

function createWidgets(
  view: EditorView,
  schema: any,
  projections: Projection[]
) {
  // const schemaMapLoader = createNodeMap(view, schema);
  const widgets: Range<Decoration>[] = [];
  for (const { from, to } of view.visibleRanges) {
    syntaxTree(view.state).iterate({
      from,
      to,
      enter: (type, from, to, get) => {
        const currentNode = get();
        const inlineProjections = projections.filter(
          (proj) => proj.type === "inline"
        );
        const currentCodeSlice = codeString(view, from, to);
        // calculate inline projection
        let hasProjection = false;
        inlineProjections.forEach((projection) => {
          const projWidget = InlineProjectWidgetFactory(
            projection,
            currentCodeSlice,
            currentNode,
            view
          );
          if (!projWidget.checkForAdd(type, view, currentNode)) {
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
    return Decoration.set(widgets);
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
  {
    simpleSwap: (e, view) => {
      const {
        detail: { from, value, to },
      } = e as any;
      view.dispatch({ changes: { from, to, insert: value } });
    },
  }
);
// build the widgets
export const widgetsPlugin = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet;

    constructor(view: EditorView) {
      const { schema, projections } = view.state.field(cmStatePlugin);
      this.decorations = createWidgets(view, schema, projections);
    }

    update(update: ViewUpdate) {
      const stateValuesChanged = !isEqual(
        update.startState.field(cmStatePlugin),
        update.state.field(cmStatePlugin)
      );
      if (update.docChanged || update.viewportChanged || stateValuesChanged) {
        const { schema, projections } = update.state.field(cmStatePlugin);
        this.decorations = createWidgets(update.view, schema, projections);
      }
    }
  },
  { decorations: (v) => v.decorations, eventHandlers }
);
