import isequal from "lodash.isequal";
import { SyntaxNode } from "@lezer/common";
import * as Json from "jsonc-parser";

import { MenuEvent } from "./utils";
import { SchemaMap } from "../components/Editor";
import { JSONSchema7 } from "json-schema";

// type JSONSchema = any;

export type MenuRow = { label: string; elements: MenuElement[] };
export type MenuElement =
  | { type: "display"; label?: string; content: string }
  | { type: "button"; label?: string; content: string; onSelect: MenuEvent }
  | { type: "projection"; label?: string; element: JSX.Element };

interface ComponentProps {
  content: JSONSchema7;
  parsedContent: any;
  //   parentType: string; // todo this type can be improved
}
type Component = (props: ComponentProps) => MenuRow[];
type componentContainer = Record<string, Component>;

const EnumPicker: Component = (props) => {
  const { content } = props;
  return [
    {
      label: "content",
      elements: (content.enum as any[]).map((val: string) => ({
        type: "button",
        content: val,
        onSelect: { type: "simpleSwap", payload: `"${val}"` },
      })),
    },
  ];
};

function simpleFillout(content: JSONSchema7) {
  const simpleTypes: Record<string, any> = {
    string: "",
    object: {},
    number: 0,
    boolean: true,
  };
  if ((content as any).type in simpleTypes) {
    return simpleTypes[(content as any).type];
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
  const { content, parsedContent } = props;
  const currentKeys = new Set(Object.keys(parsedContent || {}));
  return [
    {
      label: "Add Fields",
      elements: Object.entries(content.properties || {})
        .filter((x) => !currentKeys.has(x[0]))
        .map(([content, prop]: any) => ({
          type: "button",
          content,
          onSelect: {
            type: "addObjectKey",
            payload: { key: `"${content}"`, value: simpleFillout(prop) as any },
          },
        })),
    },
    {
      label: "Add Fields XX",
      elements: [
        {
          type: "button",
          content: "XX",
          onSelect: {
            type: "addObjectKey",
            payload: { key: '"squid"', value: '"dough"' },
          },
        },
      ],
    },
  ];
  //   return {
  //     type: "row",
  //     direction: "horizontal",
  //     element: [
  //       { type: "display", content: "add fields" },
  //       ...,
  //     ],
  //   };
};

// TODO flatten nested anyOfs and remove duplicates
function flattenAnyOf(content: JSONSchema7): any {
  if (!content || !content.anyOf) {
    return content;
  }
  return content.anyOf.reduce(
    (acc: any[], row: any) => acc.concat(row.anyOf ? flattenAnyOf(row) : row),
    []
  );
}

function removeDupsInAnyOf(
  // content: JSONSchema[]
  content: JSONSchema7[]
) {
  return content.filter((row, idx) =>
    content.slice(idx + 1).every((innerRow) => !isequal(row, innerRow))
  );
}

function bundleConstsToEnum(content: JSONSchema7[]) {
  const consts = content.filter((x) => x.const);
  const nonConsts = content.filter((x) => !x.const);
  return [...nonConsts, { enum: consts.map((x) => x.const) }];
}

// function generateValueForObjProp(prop: any) {
//   const simple: any = { number: 0, string: "", object: {} };
//   if (prop.enum) {
//     return prop.enum[0];
//   } else if (simple.hasOwnProperty(prop.type)) {
//     return simple[prop.type];
//   } else {
//     console.log("not covered", prop.type, simple[prop.type]);
//     return null;
//   }
// }
// // what do these exisit
// const addToSet = (set: Set<string>, key: string) =>
//   new Set([...Array.from(set), key]);

// const removeFromSet = (set: Set<string>, key: string) =>
//   new Set(Array.from(set).filter((x) => x !== key));

function AnyOfObjOptionalFieldPicker(
  // content: JSONSchema7,
  content: any,
  containerIdx: number
): MenuElement[] {
  //   const requiredProps = new Set<string>(
  //     Array.isArray(content.required) ? content.required : []
  //   );

  //   const [selectedOptions, setSelectedOptions] = useState<Set<string>>(
  //     new Set(Array.from(requiredProps))
  //   );
  return [
    content.$$labeledType && {
      type: "display",
      content: content.$$labeledType,
    },
    // {type: 'button', content: }
  ].filter((x) => x);
  //   return (
  //     <div style={{ display: "flex", flexDirection: "column" }}>
  //     //   {content.$$labeledType && (
  //     //     <span style={{ fontSize: "9px" }}>{content.$$labeledType}</span>
  //     //   )}
  //       <div className="flex">
  //         <button
  //           onClick={() => {
  //             const val = Object.fromEntries(
  //               Array.from(selectedOptions).map((key) => {
  //                 return [key, generateValueForObjProp(content.properties[key])];
  //               })
  //             );
  //             eventDispatch({ type: "simpleSwap", payload: JSON.stringify(val) });
  //           }}
  //         >
  //           Switch to obj with
  //         </button>
  //         // <div>
  //         //   {Object.keys(content?.properties || {}).map((key) => {
  //         //     const selected = selectedOptions.has(key);
  //         //     const required = requiredProps.has(key);
  //         //     const name = `${key}-${containerIdx}`;
  //         //     const onChange = required
  //         //       ? () => {}
  //         //       : () =>
  //         //           selected
  //         //             ? setSelectedOptions(removeFromSet(selectedOptions, key))
  //         //             : setSelectedOptions(addToSet(selectedOptions, key));
  //         //     return (
  //         //       <span>
  //         //         <label htmlFor={name}>{key}</label>
  //         //         <input
  //         //           type="checkbox"
  //         //           checked={required || selected}
  //         //           onChange={onChange}
  //         //           name={name}
  //         //         />
  //         //       </span>
  //         //     );
  //         //   })}
  //         // </div>
  //       </div>
  //     </div>
  //   );
}

function AnyOfArray(content: JSONSchema7, idx: number): MenuElement[] {
  //   const [numElements, setNumbElements] = useState<number>(1);
  const numElements = 5;
  const arrayTypeDefaults: any = {
    boolean: true,
    string: "",
    number: 0,
    object: {},
    array: [],
  };
  const arrayType = (content?.items as any)?.type;
  //   const sliderName = `numElements${idx}`;
  return [
    !arrayType && {
      type: "button",
      content: "Switch to array",
      onSelect: { type: "simpleSwap", payload: "[]" },
    },
    arrayType && {
      type: "button",
      content: `Switch to array of ${numElements} ${JSON.stringify(
        arrayTypeDefaults[arrayType]
      )}s`,
      onSelect: {
        type: "simpleSwap",
        payload: JSON.stringify(
          [...new Array(numElements)].map(() => arrayTypeDefaults[arrayType])
        ),
      },
    },
    { type: "display", content: "TODO SLIDER" },
  ].filter((x) => x) as MenuElement[];
  //   return (
  //     <div className="flex">
  //   {!arrayType && (
  //     <button
  //       onClick={() => eventDispatch({ type: "simpleSwap", payload: "[]" })}
  //     >
  //       Switch to array
  //     </button>
  //   )}
  //       {arrayType && (
  //         <div>
  //           <button
  //             onClick={() =>
  //               eventDispatch({
  //                 type: "simpleSwap",
  //                 payload: JSON.stringify(
  //                   [...new Array(numElements)].map(
  //                     () => arrayTypeDefaults[arrayType]
  //                   )
  //                 ),
  //               })
  //             }
  //           >
  //             {`Switch to array of ${numElements} ${JSON.stringify(
  //               arrayTypeDefaults[arrayType]
  //             )}s`}
  //           </button>
  //           <div className="flex">
  //             <input
  //               type="range"
  //               id={sliderName}
  //               name={sliderName}
  //               min="0"
  //               max="11"
  //               value={numElements}
  //               onChange={(e) => setNumbElements(Number(e.target.value))}
  //             />
  //             <label htmlFor={sliderName}>num</label>
  //           </div>
  //         </div>
  //       )}
  //     </div>
  //   );
}

const AnyOfPicker: Component = (props) => {
  const { content } = props;
  const simpleType = new Set(["string", "number", "boolean", "null"]);
  const simpleTypeMap: Record<string, string> = {
    string: '""',
    number: "0",
    boolean: "true",
    null: "null",
  };
  const anyOptions = bundleConstsToEnum(
    removeDupsInAnyOf(flattenAnyOf(content))
  );
  const rows = anyOptions.flatMap((opt: any, idx) => {
    const asd = [
      opt.description && {
        label: "DESC",
        elements: [{ type: "display", content: opt.description }],
      },
      opt?.enum?.length && {
        label: "PICK",
        elements: opt.enum.map((val: string) => ({
          type: "button",
          content: val,
          onSelect: { type: "simpleSwap", payload: `"${val}"` },
        })),
      },
      // think these might be wrong
      ...(opt.type === "object" ? AnyOfObjOptionalFieldPicker(opt, idx) : []),
      ...(opt.type === "array" ? AnyOfArray(opt, idx) : []),
      simpleType.has(opt.type) && {
        label: "STUFF",
        elements: [
          opt.$$labeledType && {
            type: "display",
            content: opt.$$labeledType,
          },
          {
            type: "button",
            content: `switch to ${opt.type}`,
            onSelect: {
              type: "simpleSwap",
              // payload: "null"
              payload: simpleTypeMap[opt.type],
            },
          },
        ].filter((x) => x) as MenuRow[],
      },
    ].filter((x) => x);
    return asd;
  });
  return rows;
  //   return {
  //     // type: "row",
  //     // direction: "horizontal",
  //     label: "????",
  //     elements: ;
  //     }),
  //   };
  // );
};

// function contentDescriber(description: string | null) {
//   if (!description) {
//     return null;
//   }
//   return (
//     <div style={{ maxHeight: "200px", overflowY: "auto" }}>
//       <ReactMarkdown>{description}</ReactMarkdown>
//     </div>
//   );
// }
const makeSimpleComponent: (x: string) => Component = (content) => (props) => {
  return [{ label: "TYPE", elements: [{ type: "display", content }] }];
};

const GenericComponent = makeSimpleComponent("hi generic");

const PropertyNameComponent: Component = (props) => {
  const { parsedContent } = props;
  return [
    {
      label: "PROPERTY",
      elements: [
        { type: "display", content: `${parsedContent}` },
        {
          type: "button",
          content: "remove key",
          onSelect: { type: "removeObjectKey" },
        },
      ],
    },
  ];
};

const ObjectComponent: Component = (props) => {
  //   const [keyVal, setKeyVal] = React.useState("");
  //   const [valueVal, setValueVal] = React.useState("");
  //   const newKeyVal = (key: string, value: any) => ({
  //     type: "addObjectKey",
  //     payload: { key, value },
  //   });
  return [
    { label: "TYPE", elements: [{ type: "display", content: "add field" }] },
  ];
  //   return (
  //     <div>
  //       <div>Add field</div>
  //       <div>
  //         <span>Key</span>
  //         <input value={keyVal} onChange={(e) => setKeyVal(e.target.value)} />
  //         <span>Value</span>
  //         <input value={valueVal} onChange={(e) => setValueVal(e.target.value)} />
  //         <button onClick={() => newKeyVal(keyVal, valueVal)}>
  //           Add new entry
  //         </button>
  //       </div>
  //     </div>
  //   );
};

const ParentIsPropertyComponent = makeSimpleComponent("hi property");

const nullInsert: MenuEvent = { type: "nullEvent" };
const ParentIsArrayComponent: Component = (props) => {
  return [
    {
      label: "PROPERTY",
      elements: [
        {
          type: "button",
          content: "Remove Item",
          onSelect: { type: "removeElementFromArray" },
        },
        {
          type: "button",
          content: "Move item forward",
          onSelect: { ...nullInsert },
        },
        {
          type: "button",
          content: "Move item backward",
          onSelect: { ...nullInsert },
        },
        {
          type: "button",
          content: "Set item as Last",
          onSelect: { ...nullInsert },
        },
        {
          type: "button",
          content: "Set item as First",
          onSelect: { ...nullInsert },
        },
      ],
    },
  ];
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
  Array: makeSimpleComponent("hi array"),
  String: makeSimpleComponent("hi string"),
  Number: makeSimpleComponent("hi number"),
  BooleanComponent: makeSimpleComponent("hi boolean"),
  Null: makeSimpleComponent("hi null"),
};
const parentResponses: componentContainer = {
  Property: ParentIsPropertyComponent,
  Array: ParentIsArrayComponent,
  // TODO: do i need to fill in all the other options for this?
};

function simpleParse(content: any) {
  try {
    return Json.parse(content);
  } catch (e) {
    return {};
  }
}
export function retargetToAppropriateNode(node: SyntaxNode): SyntaxNode {
  let targetNode = node;
  if (new Set(["⚠", "{", "}"]).has(node.type.name)) {
    targetNode = node.parent!;
  }
  // else if (node.type.name === "PropertyName") {
  //   targetNode = node.nextSibling!;
  // }
  return targetNode;
}

function getSchemaForRetargetedNode(
  node: SyntaxNode,
  schemaMap: SchemaMap
): JSONSchema7 {
  let targetNode = retargetToAppropriateNode(node);

  const from = targetNode.from;
  const to = targetNode.to;

  let schemaChunk: JSONSchema7[] = schemaMap[`${from}-${to}`];
  if (schemaChunk?.length > 1) {
    return { anyOf: schemaChunk };
  } else if (schemaChunk?.length === 1) {
    return schemaChunk[0];
  }
  // implying that its not an array?
  return schemaChunk as any as JSONSchema7;
}

export function generateMenuContent(
  currentCodeSlice: string,
  syntaxNode: SyntaxNode,
  schemaMap: SchemaMap
): MenuRow[] {
  const schemaChunk = getSchemaForRetargetedNode(syntaxNode, schemaMap);

  //   TODO these should be functions
  const type = syntaxNode.type.name;
  let typeBasedProperty: Component | null = null;
  if (typeBasedComponents[type]) {
    typeBasedProperty = typeBasedComponents[type];
  } else if (!schemaChunk) {
    console.log("missing imp for", type);
  } else if (typeBasedProperty && !typeBasedProperty[type]) {
    console.log("missing type imp for", type);
  }

  const parentType = syntaxNode.parent!.type.name;
  let contentBasedItem: Component | null = null;
  // TODO work through options listed in the validate wip
  if (schemaChunk && schemaChunk.enum) {
    contentBasedItem = menuSwitch.EnumPicker;
  } else if (schemaChunk && schemaChunk.type === "object") {
    contentBasedItem = menuSwitch.ObjPicker;
  } else if (schemaChunk && schemaChunk.anyOf) {
    contentBasedItem = menuSwitch.AnyOfPicker;
  }

  //   assemble the content for display
  const parsedContent = simpleParse(currentCodeSlice);
  const content: MenuRow[] = [];
  if (schemaChunk?.description) {
    content.push({
      label: "DESC",
      elements: [{ type: "display", content: schemaChunk.description }],
    });
  }
  if (schemaChunk && !!contentBasedItem) {
    contentBasedItem({
      parsedContent,
      content: schemaChunk,
    }).forEach((x) => content.push(x));
  }
  if (typeBasedProperty) {
    typeBasedProperty({
      parsedContent,
      content: schemaChunk,
    }).forEach((x) => content.push(x));
  }

  if (parentResponses[parentType]) {
    parentResponses[parentType]({
      parsedContent,
      content: schemaChunk,
    }).forEach((x) => content.push(x));
  }
  return content;
}
