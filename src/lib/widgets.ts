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

import { codeString } from "./utils";
import SimpleSliderWidget from "./widgets/slider-widget";
import SimpleBoolWidget from "./widgets/bool-widget";
import SimpleColorNameWidget from "./widgets/color-name-widget";
import SimpleColorWidget from "./widgets/color-picker";
import SimpleNumWidget from "./widgets/num-widget";

import isEqual from "lodash.isequal";
import { cmStatePlugin } from "./cmState";

import { getLanguageService } from "vscode-json-languageservice";
import { TextDocument } from "vscode-languageserver-textdocument";
import AnnotationWidget from "./widgets/annotation-widget";

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
  SimpleNumWidget,
  SimpleColorNameWidget,
  SimpleColorWidget,
  SimpleSliderWidget,
];

function createNodeMap(view: EditorView, schema: any) {
  const doc = TextDocument.create("/ex.json", "json", 0, codeString(view, 0));
  return service
    .getMatchingSchemas(doc, service.parseJSONDocument(doc), schema)
    .then((matches) => {
      return matches.reduce((acc, { node, schema }) => {
        const [from, to] = [node.offset, node.offset + node.length];
        acc[`${from}-${to}`] = (acc[`${from}-${to}`] || []).concat(schema);
        return acc;
      }, {} as { [x: string]: any });
    });
}

function createWidgets(view: EditorView, schema: any) {
  const schemaMapLoader = createNodeMap(view, schema);
  const widgets: Range<Decoration>[] = [];
  for (const { from, to } of view.visibleRanges) {
    syntaxTree(view.state).iterate({
      from,
      to,
      enter: (type, from, to, get) => {
        const currentNode = get();
        const annConfig = (replace: boolean) => ({
          widget: new AnnotationWidget(
            from,
            to,
            schemaMapLoader,
            codeString(view, from, to),
            type,
            replace,
            currentNode
          ),
        });
        const replaceTypes = new Set(["PropertyName"]);
        if (replaceTypes.has(type.name)) {
          widgets.push(Decoration.replace(annConfig(true)).range(from, to));
        } else {
          widgets.push(
            Decoration.widget({ ...annConfig(false), side: 1 }).range(from)
          );
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
  return Decoration.set(widgets);
}

const service = getLanguageService({});
const subscriptions = simpleWidgets.reduce((acc, row) => {
  Object.entries(row.eventSubscriptions).forEach(([eventName, sub]) => {
    acc[eventName] = (acc[eventName] || []).concat(sub);
  });
  return acc;
}, {} as { [eventName: string]: any[] });
const eventHandlers = Object.entries(subscriptions).reduce(
  (handlers: EventSubs, [eventName, subs]) => {
    handlers[eventName] = (event, view) => {
      console.log(eventName);
      subs.forEach((sub) => sub(event, view));
    };

    return handlers;
  },
  {
    // TODO connect each of the event subscription objects here
    simpleSwap: (e, view) => {
      const {
        detail: { from, value, to },
        target,
      } = e as any;
      view.dispatch({ changes: { from, to, insert: value } });
    },
  }
);
export const widgetsPlugin = (schema: any) =>
  ViewPlugin.fromClass(
    class {
      decorations: DecorationSet;

      constructor(view: EditorView) {
        this.decorations = createWidgets(view, schema);
      }

      update(update: ViewUpdate) {
        // TODO: i think this probably isn't valid now that were not toggling widgets
        if (
          update.docChanged ||
          update.viewportChanged ||
          !isEqual(
            update.startState.field(cmStatePlugin),
            update.state.field(cmStatePlugin)
          )
        )
          this.decorations = createWidgets(update.view, schema);
      }
    },
    {
      decorations: (v) => v.decorations,
      // provide: {},
      eventHandlers,
    }
  );
