import React, { useState } from "react";
import ReactMarkdown from "react-markdown";
import { EditorView } from "@codemirror/view";
import isequal from "lodash.isequal";
import { SyntaxNode } from "@lezer/common";

import { syntaxNodeToKeyPath, keyPathMatchesQuery } from "../utils";
import { Projection } from "../widgets";

type JSONSchema = any;
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

interface MenuProps {
  content: JSONSchema;
  keyPath: (string | number)[];
  projections: Projection[];
  view: EditorView;
  syntaxNode: SyntaxNode;
  currentCodeSlice: string;
}
export function ContentToMenuItem(props: MenuProps) {
  const { content, keyPath, projections, view, syntaxNode, currentCodeSlice } =
    props;
  let localContent: JSONSchema = {};
  if (content?.length > 1) {
    localContent = { anyOf: content };
  } else if (content?.length === 1) {
    localContent = content[0];
  }
  const type = syntaxNode.type.name;
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
  if (localContent && localContent.enum) {
    contentBasedItem = menuSwitch.EnumPicker;
  } else if (localContent && localContent.type === "object") {
    contentBasedItem = menuSwitch.ObjPicker;
  } else if (localContent && localContent.anyOf) {
    contentBasedItem = menuSwitch.AnyOfPicker;
  }
  return (
    <div style={{ maxWidth: "400px" }}>
      {localContent && contentDescriber(localContent?.description)}
      {localContent &&
        !!contentBasedItem &&
        contentBasedItem({ ...props, content: localContent })}
      {typeBasedProperty && typeBasedProperty({ ...props })}
      {projections
        .filter((proj) => keyPathMatchesQuery(proj.query, keyPath))
        .filter((proj) => proj.type === "tooltip")
        .map((proj) =>
          proj.projection({
            view,
            node: syntaxNode,
            keyPath,
            currentValue: currentCodeSlice,
          })
        )}
    </div>
  );
  // };
}
