import * as React from "react";
import * as ReactDOM from "react-dom";
import { WidgetType } from "@codemirror/view";
import { Thenable } from "vscode-json-languageservice";
import ReactMarkdown from "react-markdown";
import WidgetPlacer from "../../components/WidgetPlacer";
import { SyntaxNode, NodeType } from "@lezer/common";

// TODOs
// - normalize schema
// - clearer standalone component
// - menu-based tooltip component
// - more holistic parse of json schema (i.e. use some types idiot)
// - delete field

interface ComponentProps {
  cb: ({ payload: string, value: any }: any) => void;
  content: any;
  wrap: HTMLElement;
  parsedContent: any;
}

function EnumPicker(props: ComponentProps) {
  const { content, cb } = props;
  return (
    <div>
      {content.enum.map((val: string) => (
        <button
          key={val}
          onClick={() => cb({ type: "simpleSwap", payload: `"${val}"` })}
        >
          {val}
        </button>
      ))}
    </div>
  );
}

function simpleFillout(content: any) {
  const simpleTypes: { [x: string]: any } = {
    string: "",
    object: {},
    number: 0,
    boolean: true,
  };
  if (content.type in simpleTypes) {
    return simpleTypes[content.type];
  } else if (content.anyOf && content.anyOf.length) {
    const childTypes = content.anyOf.map((x: any) => x.type);
    console.log("??", childTypes);
    return childTypes.every((x: string) => childTypes[0] === x) &&
      childTypes[0] in simpleTypes
      ? simpleTypes[childTypes[0]]
      : null;
  } else {
    return null;
  }
}

function ObjPicker(props: ComponentProps) {
  const { content, parsedContent, cb } = props;
  const currentKeys = new Set(Object.keys(parsedContent || {}));
  const newKeyVal = (key: string, value: any) =>
    cb({ type: "addObjectKey", payload: { key, value } });
  return (
    <div>
      <div>Add fields</div>
      <div style={{ maxWidth: "400px", display: "flex", flexWrap: "wrap" }}>
        {Object.entries(content.properties || {})
          .filter((x) => !currentKeys.has(x[0]))
          .map(([propName, prop]) => {
            console.log(prop);
            return (
              <button
                key={propName}
                onClick={() => newKeyVal(propName, simpleFillout(prop))}
              >
                {propName}
              </button>
            );
          })}
      </div>
    </div>
  );
}

function AnyOfPicker(props: ComponentProps) {
  const { content, cb } = props;
  console.log({ content });
  return (
    <div>
      {(content.anyOf as any[]).map((opt, idx) => {
        return (
          <div key={idx}>
            {opt.enum &&
              opt.enum.map((val: string) => (
                <button
                  key={val}
                  onClick={() =>
                    cb({ type: "simpleSwap", payload: `"${val}"` })
                  }
                >
                  {val}
                </button>
              ))}
            {opt.type === "object" && (
              <button onClick={() => cb({ type: "simpleSwap", payload: "{}" })}>
                switch to object
              </button>
            )}
            {opt.type === "null" && (
              <button
                onClick={() => cb({ type: "simpleSwap", payload: "null" })}
              >
                switch to null
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}

function contentDescriber(props: ComponentProps) {
  return (
    <div style={{ maxHeight: "200px", overflowY: "auto" }}>
      <ReactMarkdown>{props?.content?.description || "?"}</ReactMarkdown>
    </div>
  );
}

function GenericComponent() {
  return <div>hi</div>;
}

function PropertyNameComponent(props: ComponentProps) {
  const { parsedContent, cb } = props;
  // TODO make this component smart
  // so that on delete if it observes that is part of an array, then also give an option to delete
  // all of that key in the array of objects
  return (
    <div>
      {parsedContent}
      <button onClick={() => cb({ type: "removeObjectKey", value: null })}>
        remove key
      </button>
    </div>
  );
}

function ObjectComponent(props: ComponentProps) {
  const { cb } = props;
  const [keyVal, setKeyVal] = React.useState("");
  const [valueVal, setValueVal] = React.useState("");
  const newKeyVal = (key: string, value: any) =>
    cb({ type: "addObjectKey", payload: { key, value } });
  return (
    <div>
      <div>Add field</div>
      <div style={{ display: "flex" }}>
        <span>Key</span>
        <input value={keyVal} onChange={(e) => setKeyVal(e.target.value)} />
        <span>Value</span>
        <input value={valueVal} onChange={(e) => setValueVal(e.target.value)} />
        <button onClick={() => newKeyVal(keyVal, valueVal)}>
          Add new entry
        </button>
      </div>
    </div>
  );
}

const menuSwitch = {
  EnumPicker,
  // InteractionComponent,
  ObjPicker,
  AnyOfPicker,
  GenericComponent,
};
const typeBasedComponents: any = {
  PropertyName: PropertyNameComponent,
  Object: ObjectComponent,
};

function contentToMenuItem(content: any, type: string) {
  let typeBasedProperty: any;
  if (typeBasedComponents[type]) {
    typeBasedProperty = typeBasedComponents[type];
  } else if (!content) {
    console.log("missing imp for", type);
  }

  let contentBasedItem: any;
  if (content && content.enum) {
    contentBasedItem = menuSwitch.EnumPicker;
  } else if (content && content.type === "object") {
    contentBasedItem = menuSwitch.ObjPicker;
  } else if (content && content.anyOf) {
    contentBasedItem = menuSwitch.AnyOfPicker;
  }
  return function Popover(props: ComponentProps) {
    return (
      <div style={{ maxWidth: "400px" }}>
        {content && contentDescriber(props)}
        {content && !!contentBasedItem && contentBasedItem(props)}
        {typeBasedProperty && typeBasedProperty(props)}
      </div>
    );
  };
}

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

function SchemaContentToIndicator(content: any) {
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
    readonly schemaMapDelivery: Thenable<any>,
    readonly currentCodeSlice: string,
    readonly type: NodeType,
    readonly replace: boolean,
    readonly syntaxNode: SyntaxNode
  ) {
    super();
  }

  eq(other: AnnotationWidget): boolean {
    // return true
    return this.currentCodeSlice === other.currentCodeSlice;
  }

  toDOM(): HTMLDivElement {
    const wrap = document.createElement("div");
    wrap.className = "cm-annotation-widget";
    wrap.innerText = this.replace ? this.currentCodeSlice : "";
    const parsedContent: any = tryToParse(this.currentCodeSlice);

    let active = false;
    this.schemaMapDelivery.then((newMap) => {
      let content = newMap[`${this.from}-${this.to}`];

      // merge ambiguous labels into a single blob
      if (content?.length > 1) {
        content = { anyOf: content };
      } else if (content?.length === 1) {
        content = content[0];
      }
      // add markers to relevant indicators
      if (content && !this.replace) {
        wrap.innerText = SchemaContentToIndicator(content);
      }

      wrap.onclick = () => {
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

        const from = this.from;
        const to = this.to;
        // todo lift this out?
        const cb = (value: { type: string; payload: any }) => {
          const { type, payload } = value;
          let event;
          if (type === "simpleSwap") {
            console.log(
              "simp swap",
              value,
              from,
              to,
              payload.length,
              this.currentCodeSlice.length
            );
            // const checkTo = Math.min(payload.length + from, to)
            event = new CustomEvent("simpleSwap", {
              bubbles: true,
              detail: { value: payload, from, to: to },
            });
          }
          if (type === "addObjectKey") {
            const value = JSON.stringify(
              { ...parsedContent, [payload.key]: payload.value },
              null,
              2
            );
            event = new CustomEvent("simpleSwap", {
              bubbles: true,
              detail: { value, from, to },
            });
          }
          if (type === "removeObjectKey") {
            console.log("???", this.currentCodeSlice, this.syntaxNode);
            // get full contents of parent (vis sliceString)
            // create a new object
            // replace at object position?
            // -> this loses any formatting on this object
          }
          event && wrap.dispatchEvent(event);
          ReactDOM.unmountComponentAtNode(annotationWrap!);
          active = false;
        };

        // actually do the rendering
        const widgProps = {
          cb,
          wrap,
          WrappedComponent: contentToMenuItem(content, this.type.name),
          content,
          parsedContent,
          offsetTop: 20,
          offsetLeft: -20,
        };
        ReactDOM.render(
          React.createElement(WidgetPlacer, widgProps),
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
