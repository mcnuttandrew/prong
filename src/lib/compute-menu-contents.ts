import isequal from "lodash.isequal";
import { SyntaxNode } from "@lezer/common";

import { MenuEvent, boundCheck } from "./modify-json";
import { SchemaMap } from "../components/Editor";
import { JSONSchema7, JSONSchema7Definition } from "json-schema";
import { simpleParse } from "./utils";

// type JSONSchema = any;

export type MenuRow = { label: string; elements: MenuElement[] };
export type MenuElement =
  | {
      type: "button";
      label?: string;
      content: string;
      onSelect: MenuEvent;
    }
  | {
      type: "dropdown";
      content: string[];
      onSelect: MenuEvent;
    }
  | { type: "display"; label?: string; content: string }
  | { type: "free-input"; label: string }
  | { type: "projection"; label?: string; element: JSX.Element };
interface ComponentProps {
  content: JSONSchema7;
  node: SyntaxNode;
  fullCode: string;
}
type Component = (props: ComponentProps) => MenuRow[];
type componentContainer = Record<string, Component>;

export const nodeToId = (node: SyntaxNode): `${number}-${number}` =>
  `${node.from}-${node.to}`;
const EnumPicker: Component = (props) => {
  const { content, node } = props;
  // TODO dont switch if this is the current value?
  return [
    {
      label: "content",
      elements: (content.enum as any[]).map((val: string) => ({
        type: "button",
        content: val,
        onSelect: {
          type: "simpleSwap",
          payload: `"${val}"`,
          nodeId: nodeToId(node),
        },
      })),
    },
  ];
};

function simpleFillOut(content: JSONSchema7) {
  const simpleTypes: Record<string, string> = {
    string: "",
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

const parseContent = (node: SyntaxNode, fullCode: string, defaultVal?: any) => {
  const slice = fullCode.slice(node.from, node.to);
  return simpleParse(slice, defaultVal);
};

const ObjPicker: Component = (props) => {
  const { content, node, fullCode } = props;
  const containerNode = getContainingObject(node);
  const parsedContent = parseContent(containerNode, fullCode, {});
  const currentKeys = new Set(Object.keys(parsedContent));
  // TODO this gets this wrong if coming from { / }
  const addFieldEntries: MenuElement[] = Object.entries(
    content.properties || {}
  )
    .filter((x) => !currentKeys.has(x[0]))
    .map(([content, prop]: any) => {
      return {
        type: "button",
        content,
        onSelect: {
          type: "addObjectKey",
          payload: {
            key: `"${content}"`,
            value: `${simpleFillOut(prop)}` as any,
          },
          nodeId: nodeToId(node),
        },
      };
    });
  return [
    addFieldEntries.length && {
      label: "Add",
      elements: addFieldEntries,
    },
    {
      label: "Add Field",
      elements: [
        {
          type: "free-input",
          label: "Add field",
          onSelect: {
            type: "addObjectKey",
            nodeId: nodeToId(node),
            payload: { key: "$$INPUT_BIND", value: "null" },
          },
        },
      ],
    },
  ].filter((x) => x) as MenuRow[];
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

// goes anything not an object up to it's container, only to be used below
const getContainingObject = (node: SyntaxNode): SyntaxNode => {
  return node.type.name === "Object" ? node : getContainingObject(node.parent!);
};

const getUsedPropertiesForContainer = (node: SyntaxNode): SyntaxNode[] => {
  const props: SyntaxNode[] = [];
  let pointer = node.firstChild;
  while (pointer) {
    props.push(pointer);
    pointer = pointer.nextSibling;
  }
  return props;
};

function materializeRequiredProps(content: any): string[] {
  const requiredProps = new Set<string>(
    Array.isArray(content.required) ? content.required : []
  );
  return Array.from(requiredProps);
}
function materializeAnyOfOption(content: any): string {
  const requiredPropsArr = materializeRequiredProps(content);
  return JSON.stringify(
    Object.fromEntries(
      requiredPropsArr.map((x) => [
        x,
        x in (content?.properties || {})
          ? simpleFillOut(content.properties[x])
          : "null",
      ])
    )
  );
}

function AnyOfObjOptionalFieldPicker(
  content: any,
  node: SyntaxNode,
  fullCode: string
): MenuRow[] {
  const requiredPropsArr = materializeRequiredProps(content);
  const requiredPropObject = materializeAnyOfOption(content);

  const isObject: boolean = new Set(["{", "}", "Object"]).has(node.type.name);
  const addProps = deduplicateAndSortArray(
    Object.keys(content?.properties || {}).concat(requiredPropsArr)
  );

  const containerNode = getContainingObject(node);
  const containerProps = getUsedPropertiesForContainer(containerNode);
  const slice = fullCode.slice(containerNode.from, containerNode.to);
  const inUseKeys = new Set(Object.keys(simpleParse(slice, {})));
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
          onSelect: {
            type: "simpleSwap",
            nodeId: nodeToId(node),
            payload: requiredPropObject,
          },
          label: requiredPropObject,
          content: `object`,
        },
        requiredPropsArr.length === 0 && {
          type: "button",
          onSelect: {
            type: "simpleSwap",
            nodeId: nodeToId(node),
            payload: "{}",
          },
          content: "empty object",
        },
      ],
    },
    isObject && {
      label: "Remove",
      elements: Array.from(inUseKeys).map((x, idx) => ({
        type: "button",
        content: x,
        onSelect: {
          type: "removeObjectKey",
          nodeId: nodeToId(containerProps[idx + 1]),
        },
      })),
    },
    isObject && {
      label: "Add",
      elements: addProps
        .filter((x) => !inUseKeys.has(x))
        .map((x) => ({
          type: "button",
          content: x,
          onSelect: {
            type: "addObjectKey",
            nodeId: nodeToId(node),
            payload: { key: `"${x}"`, value: "null" },
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

  if (arrayType) {
    return [
      {
        label: "Switch to",
        elements: [
          {
            type: "button",
            content: "Empty array",

            onSelect: {
              type: "simpleSwap",
              nodeId: nodeToId(node),
              payload: "[]",
            },
          },
        ],
      },
    ];
  }
  // i think this can be dropped in favor of just no return?
  const payload = JSON.stringify(
    [...new Array(numElements)].map(() => arrayTypeDefaults[arrayType])
  );
  return [
    {
      label: "arrrX",
      elements: [
        {
          type: "button",
          content: `Switch to array of ${numElements} ${JSON.stringify(
            arrayTypeDefaults[arrayType]
          )}s`,
          onSelect: { type: "simpleSwap", nodeId: nodeToId(node), payload },
        },
      ],
    },
  ];
}

const AnyOfPicker: Component = (props) => {
  const { content, node, fullCode } = props;
  const simpleType = new Set(["string", "number", "boolean", "null"]);
  const simpleTypeMap: Record<string, string> = {
    string: '""',
    number: "0",
    boolean: "true",
    null: "null",
  };
  const currentNodeType = typeof simpleParse(
    props.fullCode.slice(node.from, node.to),
    {}
  );
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
      ...(opt.type === "object"
        ? AnyOfObjOptionalFieldPicker(opt, node, fullCode)
        : []),
      ...(opt.type === "array" ? AnyOfArray(opt, node) : []),
      simpleType.has(opt.type) &&
        !isOfDescribedType && {
          label: "Switch to",
          elements: [
            opt.$$labeledType && {
              type: "display",
              content: opt.$$labeledType,
            },
            currentNodeType !== opt.type && {
              type: "button",
              content: `${opt.type}`,
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

const generateSubItem = (subItem: JSONSchema7Definition) => {
  if (typeof subItem !== "object" || subItem.type !== "object") {
    return false;
  }
  const payload = materializeAnyOfOption(subItem);
  return { content: payload, payload };
};

const ArrayItemBuilder: Component = ({ content, node }) => {
  const items = content.items;
  if (!items || typeof items === "boolean") {
    return [];
  }
  const elements = (Array.isArray(items) ? items : [items]).flatMap((item) => {
    if (typeof item === "boolean") {
      return [];
    }
    return (item.oneOf || []).flatMap((subItem) => {
      const result = generateSubItem(subItem);
      if (!result) {
        return [];
      }
      const { content, payload } = result;
      const element: MenuElement = {
        type: "button",
        content,
        onSelect: {
          type: "addElementAsSiblingInArray",
          payload,
          nodeId: nodeToId(node.parent?.lastChild?.prevSibling!),
        },
      };
      return element;
    });
  });

  return [{ label: "Insert", elements }];
};

const makeSimpleComponent: (x: string) => Component = (content) => (props) => {
  return [
    {
      label: "Inferred JSON Type",
      elements: [{ type: "display", content }],
    },
  ];
};

const GenericComponent = makeSimpleComponent("hi generic");

const PropertyNameComponent: Component = (props) => {
  const { node, fullCode } = props;
  return [
    {
      label: "PROPERTY",
      elements: [
        { type: "display", content: fullCode.slice(node.from, node.to) },
        {
          type: "button",
          content: "remove key",
          onSelect: { type: "removeObjectKey", nodeId: nodeToId(node) },
        },
        ...directionalMoves(node),
      ],
    },
  ];
};

const ObjectComponent: Component = ({ node }) => [
  {
    label: "Add Field",
    elements: [
      {
        type: "free-input",
        label: "Add field",
        onSelect: {
          type: "addObjectKey",
          nodeId: nodeToId(node),
          payload: { key: "$$INPUT_BIND", value: "null" },
        },
      },
    ],
  },
];

const ArrayComponent: Component = ({ node }) => {
  return [
    {
      label: "Add element",
      elements: [
        { label: "boolean", value: "false" },
        { label: "number", value: "0" },
        { label: "string", value: '""' },
        { label: "object", value: "{}" },
        { label: "array", value: "[]" },
      ].map(({ label, value }) => ({
        type: "button",
        content: label,
        onSelect: {
          type: "addElementAsSiblingInArray",
          payload: value,
          nodeId: nodeToId(node.lastChild?.prevSibling!),
        },
      })),
    },
  ];
};

const bracketComponent: Component = (props) =>
  ArrayComponent({ ...props, node: props.node.parent! });

const curlyBracketComponent: Component = (props) =>
  ObjectComponent({ ...props, node: props.node.parent! });

const ParentIsPropertyComponent = makeSimpleComponent("hi property");

const directionalMoves = (node: SyntaxNode): MenuElement[] => {
  const outputDirections: MenuElement[] = [];
  const bounds = boundCheck(node);
  if (!bounds.isFirst) {
    outputDirections.push({
      type: "button",
      content: "Move item left",
      onSelect: { type: "decreaseItemIdx", nodeId: nodeToId(node) },
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
      onSelect: { type: "increaseItemIdx", nodeId: nodeToId(node) },
    });
    // {
    //   type: "button",
    //   content: "Set item as First",
    //   onSelect: { type: "moveItemToStart" },
    // },
  }
  return outputDirections;
};

const ParentIsArrayComponent: Component = ({ node }) => {
  return [
    {
      label: "PROPERTY",
      elements: [
        {
          type: "button",
          content: "Remove Item",

          onSelect: { type: "removeElementFromArray", nodeId: nodeToId(node) },
        },
        ...directionalMoves(node),
      ],
    },
  ];
};

const BooleanComponent: Component = ({ node }) => [
  {
    label: "Set to",
    elements: ["true", "false"].map((payload) => ({
      type: "button",
      content: payload,
      onSelect: { type: "simpleSwap", nodeId: nodeToId(node), payload },
    })),
  },
];

const menuSwitch: componentContainer = {
  EnumPicker,
  ObjPicker,
  AnyOfPicker,
  GenericComponent,
  ArrayItemBuilder,
};
const typeBasedComponents: componentContainer = {
  Object: ObjectComponent,
  PropertyName: PropertyNameComponent,
  Array: ArrayComponent,
  String: makeSimpleComponent("string"),
  Number: makeSimpleComponent("number"),
  False: BooleanComponent,
  True: BooleanComponent,
  Null: makeSimpleComponent("null"),

  ...Object.fromEntries(["[", "]"].map((el) => [el, bracketComponent])),
  ...Object.fromEntries(["{", "}"].map((el) => [el, curlyBracketComponent])),
  "⚠": makeSimpleComponent("⚠"),
};
const parentResponses: componentContainer = {
  Property: ParentIsPropertyComponent,
  Array: ParentIsArrayComponent,
};

export const liminalNodeTypes = new Set(["⚠", "{", "}", "[", "]"]);
export function retargetToAppropriateNode(
  node: SyntaxNode | SyntaxNode
): SyntaxNode | SyntaxNode {
  let targetNode = node;
  if (liminalNodeTypes.has(node.type.name)) {
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

// todo remove first argument
export function generateMenuContent(
  currentCodeSlice: string,
  syntaxNode: SyntaxNode,
  schemaMap: SchemaMap,
  fullCode: string
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
  // not sure what this refers, but there are some missing options for sure, maybe explore the .type = X?
  if (schemaChunk && schemaChunk.enum) {
    contentBasedItem = menuSwitch.EnumPicker;
  } else if (schemaChunk && schemaChunk.type === "object") {
    contentBasedItem = menuSwitch.ObjPicker;
  } else if (schemaChunk && schemaChunk.anyOf) {
    contentBasedItem = menuSwitch.AnyOfPicker;
  } else if (schemaChunk && schemaChunk.type === "array") {
    contentBasedItem = menuSwitch.ArrayItemBuilder;
  }

  //   assemble the content for display
  const content: MenuRow[] = [];
  if (schemaChunk?.description) {
    content.push({
      label: "JSON Schema Type",
      elements: [{ type: "display", content: schemaChunk.description }],
    });
  }
  const componentProps: ComponentProps = {
    content: schemaChunk,
    node: syntaxNode,
    fullCode,
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
  const computedMenuContents = cleanSections(
    simpleMerge(content.filter((x) => x))
  );
  return computedMenuContents;
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

function cleanSections(content: MenuRow[]): MenuRow[] {
  return content.filter((x) => x.elements.length);
}
