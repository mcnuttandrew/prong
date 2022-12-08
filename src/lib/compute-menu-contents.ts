import isequal from "lodash.isequal";
import { SyntaxNode } from "@lezer/common";
import * as Json from "jsonc-parser";

import { MenuEvent, boundCheck } from "./utils";
import { SchemaMap } from "../components/Editor";
import { JSONSchema7 } from "json-schema";

// type JSONSchema = any;

export type MenuRow = { label: string; elements: MenuElement[] };
export type MenuElement =
  | { type: "button"; label?: string; content: string; onSelect: MenuEvent }
  | { type: "dropdown"; content: string[]; onSelect: MenuEvent }
  | { type: "display"; label?: string; content: string }
  | { type: "free-input"; label: string }
  | { type: "projection"; label?: string; element: JSX.Element };
interface ComponentProps {
  content: JSONSchema7;
  parsedContent: any;
  node: SyntaxNode;
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

function simpleFillOut(content: JSONSchema7) {
  const simpleTypes: Record<string, string> = {
    string: '""',
    object: `{}`,
    number: "0",
    boolean: "true",
  };
  if ((content as any).type in simpleTypes) {
    return simpleTypes[(content as any).type];
  } else if (content.anyOf && content.anyOf.length) {
    const childTypes = content.anyOf.map((x: any) => x.type);
    return childTypes.every((x: string) => childTypes[0] === x) &&
      childTypes[0] in simpleTypes
      ? simpleTypes[childTypes[0]]
      : null;
  } else if (content.enum) {
    // doesn't do anything rn
    return content.enum.filter((x) => typeof x === "string")[0];
  } else {
    return null;
  }
}

const ObjPicker: Component = (props) => {
  const { content, parsedContent } = props;
  const currentKeys = new Set(Object.keys(parsedContent || {}));
  // TODO this gets this wrong if coming from { / }
  return [
    {
      label: "Add Fields",
      elements: Object.entries(content.properties || {})
        .filter((x) => !currentKeys.has(x[0]))
        .map(([content, prop]: any) => {
          console.log(content, simpleFillOut(prop));
          return {
            type: "button",
            content,
            onSelect: {
              type: "addObjectKey",
              payload: {
                key: `"${content}"`,
                value: `${simpleFillOut(prop)}` as any,
              },
            },
          };
        }),
    },
    {
      label: "Add Custom Fields",
      elements: [
        {
          type: "free-input",
          label: "Add field",
          onSelect: {
            type: "addObjectKey",
            payload: { key: "$$INPUT_BIND", value: "null" },
          },
        },
      ],
    },
  ];
};

// TODO flatten nested anyOfs and remove duplicates
function flattenAnyOf(content: JSONSchema7): any {
  if (!content || !content.anyOf) {
    return content;
  }
  return content.anyOf.reduce((acc: any[], row: any) => {
    if (row.description) {
      acc.push({ description: row.description });
    }
    return acc.concat(row.anyOf ? flattenAnyOf(row) : row);
  }, []);
}

function removeDupsInAnyOf(content: JSONSchema7[]) {
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

function AnyOfObjOptionalFieldPicker(
  // content: JSONSchema7,
  content: any,
  node: SyntaxNode
): MenuRow[] {
  const requiredProps = new Set<string>(
    Array.isArray(content.required) ? content.required : []
  );
  const requiredPropsArr = Array.from(requiredProps);

  const requiredPropObject = JSON.stringify(
    Object.fromEntries(
      requiredPropsArr.map((x) => [
        x,
        content?.properties[x] ? simpleFillOut(content.properties[x]) : "null",
      ])
    )
  );

  const isObject: boolean = new Set(["{", "}", "Object"]).has(node.type.name);
  const addProps = deduplicateAndSortArray(
    Object.keys(content?.properties || {}).concat(requiredPropsArr)
  );
  return [
    content.$$labeledType && {
      label: "JSON Schema Type",
      elements: [{ type: "display", content: content.$$labeledType }],
    },
    !isObject && {
      label: "Switch to",
      elements: [
        requiredPropsArr.length > 0 && {
          type: "button",
          onSelect: { type: "simpleSwap", payload: requiredPropObject },
          content: "object with required types",
        },
        requiredPropsArr.length === 0 && {
          type: "button",
          onSelect: { type: "simpleSwap", payload: "{}" },
          content: "blank object",
        },
      ],
    },
    isObject && {
      label: "Add",
      elements: addProps.map((x) => ({
        type: "button",
        content: x,
        onSelect: {
          type: "addObjectKey",
          payload: { key: x, value: "null" },
        },
      })),
    },
  ].filter((x) => x) as MenuRow[];
}

const deduplicateAndSortArray = (arr: string[]): string[] => {
  return Array.from(new Set(arr)).sort((a, b) => a.localeCompare(b));
};

function AnyOfArray(content: JSONSchema7, node: SyntaxNode): MenuRow[] {
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

  const output: MenuRow[] = [
    {
      label: "JSON Schema Type",
      elements: [{ type: "display", content: "TODO SLIDER" }],
    },
  ];
  if (arrayType) {
    output.push({
      label: "arrr",
      elements: [
        {
          type: "button",
          content: "Switch to array",
          onSelect: { type: "simpleSwap", payload: "[]" },
        },
      ],
    });
  } else {
    const payload = JSON.stringify(
      [...new Array(numElements)].map(() => arrayTypeDefaults[arrayType])
    );
    output.push({
      label: "arrrX",
      elements: [
        {
          type: "button",
          content: `Switch to array of ${numElements} ${JSON.stringify(
            arrayTypeDefaults[arrayType]
          )}s`,
          onSelect: { type: "simpleSwap", payload },
        },
      ],
    });
  }
  return output;
}

const AnyOfPicker: Component = (props) => {
  const { content, node } = props;
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
    const isOfDescribedType =
      (opt?.type || "").toLowerCase() === node.type.name.toLowerCase();

    const optionRow = [
      opt.description && {
        label: "JSON Schema Type",
        elements: [{ type: "display", content: opt.description }],
      },
      opt?.enum?.length && {
        label: "Replace with",
        elements: opt.enum.map((val: string) => ({
          type: "button",
          content: val,
          onSelect: { type: "simpleSwap", payload: `"${val}"` },
        })),
      },
      ...(opt.type === "object" ? AnyOfObjOptionalFieldPicker(opt, node) : []),
      ...(opt.type === "array" ? AnyOfArray(opt, node) : []),
      simpleType.has(opt.type) &&
        !isOfDescribedType && {
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
    return optionRow;
  });
  return rows;
};

const makeSimpleComponent: (x: string) => Component = (content) => (props) => {
  return [
    { label: "Inferred JSON Type", elements: [{ type: "display", content }] },
  ];
};

const GenericComponent = makeSimpleComponent("hi generic");

const PropertyNameComponent: Component = (props) => {
  const { parsedContent, node } = props;
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
        ...directionalMoves(node),
      ],
    },
  ];
};

const ObjectComponent: Component = () => [
  {
    label: "Add Field",
    elements: [
      {
        type: "free-input",
        label: "Add field",
        onSelect: {
          type: "addObjectKey",
          payload: { key: "$$INPUT_BIND", value: "null" },
        },
      },
    ],
  },
];

const ParentIsPropertyComponent = makeSimpleComponent("hi property");

const directionalMoves = (node: SyntaxNode): MenuElement[] => {
  const outputDirections: MenuElement[] = [];
  const bounds = boundCheck(node);
  if (!bounds.isFirst) {
    outputDirections.push({
      type: "button",
      content: "Move item left",
      onSelect: { type: "decreaseItemIdx" },
    });
    // {
    //   type: "button",
    //   content: "Set item as Last",
    //   onSelect: { type: "moveItemToEnd" },
    // },
  }
  if (!bounds.isLast) {
    outputDirections.push({
      type: "button",
      content: "Move item right",
      onSelect: { type: "increaseItemIdx" },
    });
    // {
    //   type: "button",
    //   content: "Set item as First",
    //   onSelect: { type: "moveItemToStart" },
    // },
  }
  return outputDirections;
};

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
        ...directionalMoves(props.node),
      ],
    },
  ];
};

const BooleanComponent: Component = () => [
  {
    label: "Set to",
    elements: ["true", "false"].map((payload) => ({
      type: "button",
      content: payload,
      onSelect: { type: "simpleSwap", payload },
    })),
  },
];

const menuSwitch: componentContainer = {
  EnumPicker,
  ObjPicker,
  AnyOfPicker,
  GenericComponent,
};
const typeBasedComponents: componentContainer = {
  Object: ObjectComponent,
  PropertyName: PropertyNameComponent,
  Array: makeSimpleComponent("array"),
  String: makeSimpleComponent("string"),
  Number: makeSimpleComponent("number"),
  False: BooleanComponent,
  True: BooleanComponent,
  Null: makeSimpleComponent("null"),
};
const parentResponses: componentContainer = {
  Property: ParentIsPropertyComponent,
  Array: ParentIsArrayComponent,
  // TODO: do i need to fill in all the other options for this?
  // what other options are there?
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
  if (new Set(["⚠", "{", "}", "[", "]"]).has(node.type.name)) {
    targetNode = node.parent!;
  } else if (node.type.name === "PropertyName") {
    targetNode = node.nextSibling!;
  }
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
      label: "JSON Schema Type",
      elements: [{ type: "display", content: schemaChunk.description }],
    });
  }
  const componentProps = {
    parsedContent,
    content: schemaChunk,
    node: syntaxNode,
  };
  if (schemaChunk && !!contentBasedItem) {
    contentBasedItem(componentProps).forEach((x) => content.push(x));
  }
  if (typeBasedProperty) {
    typeBasedProperty(componentProps).forEach((x) => content.push(x));
  }

  // const parentType = syntaxNode.parent!.type.name;
  const parentType = retargetToAppropriateNode(syntaxNode).parent!.type.name;
  if (parentResponses[parentType]) {
    parentResponses[parentType](componentProps).forEach((x) => content.push(x));
  }
  return simpleMerge(content.filter((x) => x));
}

function deduplicate(rows: any[]): any[] {
  const hasSeen: Set<string> = new Set([]);
  return rows.filter((x) => {
    const key = JSON.stringify(x);
    if (hasSeen.has(key)) {
      return false;
    }
    hasSeen.add(key);
    return true;
  });
}

function simpleMerge(content: MenuRow[]): MenuRow[] {
  const groups = content.reduce((acc: Record<string, any[]>, row) => {
    acc[row.label] = (acc[row.label] || []).concat(row.elements);
    return acc;
  }, {});

  return Object.entries(groups).map(
    ([label, elements]) =>
      ({ label, elements: deduplicate(elements).filter((x) => x) } as MenuRow)
  );
}
