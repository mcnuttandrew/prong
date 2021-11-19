import * as React from "react";
import { useState } from "react";
import * as ReactDOM from "react-dom";
import { WidgetType } from "@codemirror/view";
import { Thenable } from "vscode-json-languageservice";
import ReactMarkdown from "react-markdown";
import WidgetPlacer from "../../components/WidgetPlacer";
import { SyntaxNode, NodeType } from "@lezer/common";
import isequal from "lodash.isequal";
// import { JSONSchema7Object } from "@types/json-schema";

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

// TODO flatten nested anyOfs and remove duplicates
function flattenAnyOf(content: any) {
  if (!content || !content.anyOf) {
    return content;
  }
  return content.anyOf.reduce(
    (acc: any[], row: any) => acc.concat(row.anyOf ? flattenAnyOf(row) : row),
    []
  );
}

function removeDupsInAnyOf(content: any[]) {
  return content.filter((row, idx) =>
    content.slice(idx + 1).every((innerRow) => !isequal(row, innerRow))
  );
}

function bundleConstsToEnum(content: any[]) {
  const consts = content.filter((x) => x.const);
  const nonConsts = content.filter((x) => !x.const);
  return [...nonConsts, { enum: consts.map((x) => x.const) }];
}

function generateValueForObjProp(prop: any) {
  const simple: any = { number: 0, string: "", object: {} };
  if (prop.enum) {
    return prop.enum[0];
  } else if (simple.hasOwnProperty(prop.type)) {
    return simple[prop.type];
  } else {
    console.log("not covered", prop.type, simple[prop.type]);
    return null;
  }
}

// function prepObjForSwap(content: any) {
//   // todo this is not the whole required spec
//   console.log(content.required);
//   if (typeof content.require !== "object") {
//     return {};
//   }
//   return content.required.reduce((acc: any, key: string) => {
//     acc[key] = generateValueForObjProp(content.properties[key]);
//     return acc;
//   }, {});
// }

const addToSet = (set: Set<string>, key: string) =>
  new Set([...Array.from(set), key]);

const removeFromSet = (set: Set<string>, key: string) =>
  new Set(Array.from(set).filter((x) => x !== key));

function AnyOfObjOptionalFieldPicker(content: any, cb: any) {
  const requiredProps = new Set<string>(
    Array.isArray(content.required) ? content.required : []
  );
  const [selectedOptions, setSelectedOptions] = useState<Set<string>>(
    new Set(Array.from(requiredProps))
  );
  return (
    <div style={{ display: "flex" }}>
      <button
        onClick={() => {
          const val = Object.fromEntries(
            Array.from(selectedOptions).map((key) => {
              return [key, generateValueForObjProp(content.properties[key])];
            })
          );
          cb({ type: "simpleSwap", payload: JSON.stringify(val) });
        }}
      >
        Switch to obj with
      </button>
      <div>
        {Object.keys(content.properties).map((key) => {
          const selected = selectedOptions.has(key);
          const onChange = requiredProps.has(key)
            ? () => {}
            : () =>
                selected
                  ? setSelectedOptions(addToSet(selectedOptions, key))
                  : setSelectedOptions(removeFromSet(selectedOptions, key));
          return (
            <span>
              <label>{key}</label>
              <input
                type="checkbox"
                value={selected ? "checked" : undefined}
                onChange={onChange}
              />
            </span>
          );
        })}
      </div>
    </div>
  );
}

function AnyOfPicker(props: ComponentProps) {
  const { content, cb } = props;
  return (
    <div>
      {bundleConstsToEnum(removeDupsInAnyOf(flattenAnyOf(content))).map(
        (opt, idx) => {
          return (
            <div key={idx}>
              {contentDescriber(opt.description)}
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
                <div>{AnyOfObjOptionalFieldPicker(opt, cb)}</div>
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
        }
      )}
    </div>
  );
}

function contentDescriber(description: string | null) {
  if (!description) {
    return <div />;
  }
  return (
    <div style={{ maxHeight: "200px", overflowY: "auto" }}>
      <ReactMarkdown>{description}</ReactMarkdown>
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
      <div>
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
        {content && contentDescriber(props?.content?.description)}
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

            const objNode = this.syntaxNode!.parent!;
            // todo: some subtlty about deleting
            // probably need to actually delete from the end of the previous property
            // up to the next one
            console.log({
              objNode,
              pref: objNode.prevSibling,
              next: objNode.nextSibling,
            });
            const delFrom = objNode.prevSibling
              ? objNode.prevSibling.to + 1
              : objNode.from;
            const delTo = objNode.nextSibling
              ? objNode.nextSibling.from - 1
              : objNode.to;
            // const delTo = objNode.nextSibling
            //   ? objNode.nextSibling.from
            //   : objNode.to;
            event = new CustomEvent("simpleSwap", {
              bubbles: true,
              detail: { value: "", from: delFrom, to: delTo },
            });
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
