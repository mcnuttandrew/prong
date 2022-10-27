import * as React from "react";
import * as ReactDOM from "react-dom";
import { WidgetType, EditorView } from "@codemirror/view";

import WidgetPlacer from "../../components/WidgetPlacer";
import { SyntaxNode, NodeType } from "@lezer/common";
import { Dictionary } from "ts-essentials";
import { syntaxNodeToKeyPath, keyPathMatchesQuery } from "../utils";
import { Projection } from "../widgets";
// import {JSONSchema} from '../JSONSchemaTypes';
import { contentToMenuItem } from "./popover-menu";
type JSONSchema = any;

// TODOs
// - normalize schema
// - more holistic parse of json schema (i.e. use some types idiot)

function tryToParse(currentCodeSlice: string) {
  try {
    return JSON.parse(currentCodeSlice);
  } catch (e) {
    try {
      const tempContent = JSON.parse(`{${currentCodeSlice}}`);
      const [[key, value]] = Object.entries(tempContent);
      return { key, value };
    } catch (e2) {
      return null;
    }
  }
}

function SchemaContentToIndicator(content: JSONSchema) {
  if (!content) {
    return "";
  }
  if (content.enum) {
    return "▽";
  } else if (content.type === "object") {
    return "+";
  } else if (content.anyOf) {
    return "X";
  } else {
    return "?";
  }
}

export default class AnnotationWidget extends WidgetType {
  constructor(
    readonly from: number,
    readonly to: number,
    // readonly schemaMapDelivery: Promise<Dictionary<JSONSchema[]>>,
    readonly schemaMapDelivery: Promise<Dictionary<any>>,
    readonly currentCodeSlice: string,
    readonly type: NodeType,
    readonly replace: boolean,
    readonly syntaxNode: SyntaxNode,
    readonly view: EditorView,
    readonly projections: Projection[]
  ) {
    super();
  }

  eq(other: AnnotationWidget): boolean {
    // todo this is definately wrong
    return false;
    // return this.currentCodeSlice === other.currentCodeSlice;
  }

  eventDispatch(
    value: { type: string; payload: any },
    parsedContent: any
  ): { value: string; from: number; to: number } | undefined {
    const from = this.from;
    const to = this.to;
    const { type, payload } = value;
    if (type === "simpleSwap") {
      return { value: payload, from, to: to };
    }
    if (type === "addObjectKey") {
      // this should get smarter so that the formatting doesn't get borked
      const value = JSON.stringify(
        { ...parsedContent, [payload.key]: payload.value },
        null,
        2
      );
      return { value, from, to };
    }
    if (type === "removeObjectKey") {
      const objNode = this.syntaxNode!.parent!;
      const delFrom = objNode.prevSibling
        ? objNode.prevSibling.to
        : objNode.from;
      const delTo = objNode.nextSibling ? objNode.nextSibling.from : objNode.to;
      return { value: "", from: delFrom, to: delTo };
    }
    // TODO THESE ARE NOT YET WORKING
    if (type === "removeElementFromArray") {
      const objNode = this.syntaxNode;
      const delTo = objNode.nextSibling ? objNode.nextSibling.from : objNode.to;
      return { value: "", from: objNode.from, to: delTo };
    }
    if (type === "duplicateElementInArray") {
      const codeSlice = this.currentCodeSlice;
      return {
        value: `, ${codeSlice}`,
        from: to,
        to: to + codeSlice.length,
      };
    }
  }

  toDOM(): HTMLDivElement {
    // console.log(this)
    const wrap = document.createElement("div");
    wrap.className = "cm-annotation-widget";
    wrap.innerText = this.replace ? this.currentCodeSlice : "";
    // wrap.innerText = this.currentCodeSlice;
    // wrap.setAttribute("contenteditable", "true");
    const parsedContent: any = tryToParse(this.currentCodeSlice);

    let active = false;
    this.schemaMapDelivery.then((newMap) => {
      // merge ambiguous labels into a single blob
      let content = newMap[`${this.from}-${this.to}`];
      if (content?.length > 1) {
        content = { anyOf: content };
      } else if (content?.length === 1) {
        content = content[0];
      }
      // const content =
      //   contentContainer?.length > 1
      //     ? { anyOf: contentContainer }
      //     : contentContainer[0];

      // add markers to relevant indicators
      if (content && !this.replace) {
        // ADDS MARKERS
        // wrap.innerText = SchemaContentToIndicator(content);
      }

      wrap.onclick = () => {
        // TODO pick up the parent type and supply that to the element
        const keyPath = syntaxNodeToKeyPath(this.syntaxNode, this.view);
        const parentType = this.syntaxNode.parent?.type?.name || "null";
        active = !active;

        let annotationWrap = document.getElementById("annotation-widget");
        if (!annotationWrap) {
          annotationWrap = document.createElement("div");
          annotationWrap.id = "annotation-widget";
          document.body.prepend(annotationWrap);
        } else {
          ReactDOM.unmountComponentAtNode(annotationWrap);
        }

        if (!active) {
          return;
        }

        const cb = (value: { type: string; payload: any }) => {
          const eventDetails = this.eventDispatch(value, parsedContent);
          eventDetails &&
            wrap.dispatchEvent(
              new CustomEvent("simpleSwap", {
                bubbles: true,
                detail: eventDetails,
              })
            );
          ReactDOM.unmountComponentAtNode(annotationWrap!);
          active = false;
        };

        // actually do the rendering
        const widgetProps = {
          cb,
          wrap,
          WrappedComponent: contentToMenuItem(
            content,
            this.type.name,
            keyPath,
            this.projections,
            this.view,
            this.syntaxNode,
            this.currentCodeSlice
          ),
          content,
          parentType,
          parsedContent,
          offsetTop: 20,
          offsetLeft: -20,
        };
        ReactDOM.render(
          React.createElement(WidgetPlacer, widgetProps),
          annotationWrap
        );
      };
    });

    return wrap;
  }

  ignoreEvent(): boolean {
    return false;
  }
}
