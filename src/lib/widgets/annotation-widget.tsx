import * as React from "react";
import { useState } from "react";
import * as ReactDOM from "react-dom";
import { WidgetType, EditorView } from "@codemirror/view";
import ReactMarkdown from "react-markdown";
import WidgetPlacer from "../../components/WidgetPlacer";
import { SyntaxNode, NodeType } from "@lezer/common";
import isequal from "lodash.isequal";
import { Dictionary } from "ts-essentials";
import { syntaxNodeToKeyPath, keyPathMatchesQuery } from "../utils";
import { Projection } from "../widgets";
// import {JSONSchema} from '../JSONSchemaTypes';
type JSONSchema = any;

// TODOs
// - normalize schema
// - more holistic parse of json schema (i.e. use some types idiot)

interface ComponentProps {
  cb: ({ payload: string, value: any }: any) => void;
  content: JSONSchema;
  wrap: HTMLElement;
  parsedContent: any;
  parentType: string; // todo this type can be improved
}
type Component = (props: ComponentProps) => JSX.Element;
type componentContainer = { [x: string]: Component };

const EnumPicker: Component = (props) => {
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
};

function simpleFillout(content: JSONSchema) {
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
    return childTypes.every((x: string) => childTypes[0] === x) &&
      childTypes[0] in simpleTypes
      ? simpleTypes[childTypes[0]]
      : null;
  } else {
    return null;
  }
}

const ObjPicker: Component = (props) => {
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
};

// TODO flatten nested anyOfs and remove duplicates
function flattenAnyOf(content: JSONSchema) {
  if (!content || !content.anyOf) {
    return content;
  }
  return content.anyOf.reduce(
    (acc: any[], row: any) => acc.concat(row.anyOf ? flattenAnyOf(row) : row),
    []
  );
}

function removeDupsInAnyOf(content: JSONSchema[]) {
  return content.filter((row, idx) =>
    content.slice(idx + 1).every((innerRow) => !isequal(row, innerRow))
  );
}

function bundleConstsToEnum(content: JSONSchema[]) {
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
const addToSet = (set: Set<string>, key: string) =>
  new Set([...Array.from(set), key]);

const removeFromSet = (set: Set<string>, key: string) =>
  new Set(Array.from(set).filter((x) => x !== key));

function AnyOfObjOptionalFieldPicker(
  content: JSONSchema,
  cb: any,
  containerIdx: number
) {
  const requiredProps = new Set<string>(
    Array.isArray(content.required) ? content.required : []
  );

  const [selectedOptions, setSelectedOptions] = useState<Set<string>>(
    new Set(Array.from(requiredProps))
  );
  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      {content.$$labeledType && (
        <span style={{ fontSize: "9px" }}>{content.$$labeledType}</span>
      )}
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
          {Object.keys(content?.properties || {}).map((key) => {
            const selected = selectedOptions.has(key);
            const required = requiredProps.has(key);
            const name = `${key}-${containerIdx}`;
            const onChange = required
              ? () => {}
              : () =>
                  selected
                    ? setSelectedOptions(removeFromSet(selectedOptions, key))
                    : setSelectedOptions(addToSet(selectedOptions, key));
            return (
              <span>
                <label htmlFor={name}>{key}</label>
                <input
                  type="checkbox"
                  checked={required || selected}
                  onChange={onChange}
                  name={name}
                />
              </span>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function AnyOfArray(content: JSONSchema, cb: any, idx: number) {
  const [numElements, setNumbElements] = useState<number>(1);
  const arrayTypeDefaults: any = {
    boolean: true,
    string: "",
    number: 0,
    object: {},
    array: [],
  };
  const arrayType = content?.items?.type;
  const sliderName = `numElements${idx}`;
  return (
    <div style={{ display: "flex" }}>
      {!arrayType && (
        <button onClick={() => cb({ type: "simpleSwap", payload: "[]" })}>
          Switch to array
        </button>
      )}
      {arrayType && (
        <div>
          <button
            onClick={() =>
              cb({
                type: "simpleSwap",
                payload: JSON.stringify(
                  [...new Array(numElements)].map(
                    () => arrayTypeDefaults[arrayType]
                  )
                ),
              })
            }
          >
            {`Switch to array of ${numElements} ${JSON.stringify(
              arrayTypeDefaults[arrayType]
            )}s`}
          </button>
          <div style={{ display: "flex" }}>
            <input
              type="range"
              id={sliderName}
              name={sliderName}
              min="0"
              max="11"
              value={numElements}
              onChange={(e) => setNumbElements(Number(e.target.value))}
            />
            <label htmlFor={sliderName}>num</label>
          </div>
        </div>
      )}
    </div>
  );
}

const AnyOfPicker: Component = (props) => {
  const { content, cb } = props;
  const simpleType = new Set(["string", "number", "boolean", "null"]);
  const simpleTypeMap: any = {
    string: '""',
    number: "0",
    boolean: "true",
    null: "null",
  };
  const anyOptions = bundleConstsToEnum(
    removeDupsInAnyOf(flattenAnyOf(content))
  );
  return (
    <div>
      {anyOptions.map((opt, idx) => {
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
              <div>{AnyOfObjOptionalFieldPicker(opt, cb, idx)}</div>
            )}
            {opt.type === "array" && <div>{AnyOfArray(opt, cb, idx)}</div>}
            {simpleType.has(opt.type) && (
              <div style={{ display: "flex", flexDirection: "column" }}>
                {opt.$$labeledType && (
                  <span style={{ fontSize: "9px" }}>{opt.$$labeledType}</span>
                )}
                <button
                  onClick={() =>
                    cb({
                      type: "simpleSwap",
                      // payload: "null"
                      payload: simpleTypeMap[opt.type],
                    })
                  }
                >
                  {`switch to ${opt.type}`}
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

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

const GenericComponent: Component = () => {
  return <div>hi</div>;
};

const PropertyNameComponent: Component = (props) => {
  const { parsedContent, cb } = props;
  return (
    <div>
      {parsedContent}
      <button onClick={() => cb({ type: "removeObjectKey", value: null })}>
        remove key
      </button>
    </div>
  );
};

const ObjectComponent: Component = (props) => {
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
};

const ParentIsPropretyComponent: Component = (props) => {
  return <div>hi property</div>;
};
const ParentIsArrayComponent: Component = (props) => {
  const { cb } = props;
  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      <div style={{ display: "flex" }}>
        <button onClick={() => cb({ type: "removeElementFromArray" })}>
          Remove Item
        </button>
        <button onClick={() => cb({ type: "duplicateElementInArray" })}>
          Duplicate
        </button>
      </div>
      <div style={{ display: "flex" }}>
        <button>Set item as First</button>
        <button>Move item forward</button>
        <button>Move item backward</button>
        <button>Set item as Last</button>
      </div>
    </div>
  );
};

const ArrayComponent: Component = (props) => {
  return <div> hi array </div>;
};

const StringComponent: Component = (props) => {
  return <div> hi string </div>;
};

const NumberComponent: Component = (props) => {
  return <div> hi number </div>;
};

const BooleanComponent: Component = (props) => {
  return <div> hi boolean </div>;
};

const NullComponent: Component = (props) => {
  return <div> hi null </div>;
};

const menuSwitch: componentContainer = {
  EnumPicker,
  ObjPicker,
  AnyOfPicker,
  GenericComponent,
};
const typeBasedComponents: componentContainer = {
  Object: ObjectComponent,
  PropertyName: PropertyNameComponent,
  Array: ArrayComponent,
  String: StringComponent,
  Number: NumberComponent,
  BooleanComponent: BooleanComponent,
  Null: NullComponent,
};
const parentResponses: componentContainer = {
  Property: ParentIsPropretyComponent,
  Array: ParentIsArrayComponent,
  // TODO: do i need to fill in all the other options for this?
};
function contentToMenuItem(
  content: JSONSchema,
  type: string,
  keyPath: (string | number)[],
  projections: Projection[],
  view: EditorView,
  syntaxNode: SyntaxNode
) {
  let typeBasedProperty: any;
  if (typeBasedComponents[type]) {
    typeBasedProperty = typeBasedComponents[type];
  } else if (!content) {
    console.log("missing imp for", type);
  } else if (!typeBasedProperty[type]) {
    console.log("missing type imp for", type);
  }

  let contentBasedItem: any;
  // TODO work through options listed in the validate wip
  if (content && content.enum) {
    contentBasedItem = menuSwitch.EnumPicker;
  } else if (content && content.type === "object") {
    contentBasedItem = menuSwitch.ObjPicker;
  } else if (content && content.anyOf) {
    contentBasedItem = menuSwitch.AnyOfPicker;
  }
  return function Popover(props: ComponentProps) {
    // console.log(props.parentType);
    return (
      <div style={{ maxWidth: "400px" }}>
        {content && contentDescriber(props?.content?.description)}
        {content && !!contentBasedItem && contentBasedItem(props)}
        {typeBasedProperty && typeBasedProperty(props)}
        {parentResponses[props.parentType] &&
          parentResponses[props.parentType](props)}
        {projections
          .filter((proj) => keyPathMatchesQuery(proj.query, keyPath))
          .map((proj) => proj.projection({ view, node: syntaxNode, keyPath }))}
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
    const wrap = document.createElement("div");
    wrap.className = "cm-annotation-widget";
    wrap.innerText = this.replace ? this.currentCodeSlice : "";
    const parsedContent: any = tryToParse(this.currentCodeSlice);

    let active = false;
    this.schemaMapDelivery.then((newMap) => {
      // let contentContainer = newMap[`${this.from}-${this.to}`];
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
        wrap.innerText = SchemaContentToIndicator(content);
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
        const widgProps = {
          cb,
          wrap,
          WrappedComponent: contentToMenuItem(
            content,
            this.type.name,
            keyPath,
            this.projections,
            this.view,
            this.syntaxNode
          ),
          content,
          parentType,
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
