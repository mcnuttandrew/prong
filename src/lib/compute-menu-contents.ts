import isequal from "lodash.isequal";
import { SyntaxNode } from "@lezer/common";

import { MenuEvent, boundCheck } from "./modify-json";
import { SchemaMap } from "../components/Editor";
import { JSONSchema7, JSONSchema7Definition } from "json-schema";
import { simpleParse } from "./utils";
import { Projection } from "./projections";

import { LintError } from "./Linter";

export type MenuRow = { label: string; elements: MenuElement[] };
export type MenuElement =
  | {
      type: "button";
      label?: string;
      content: string;
      onSelect: MenuEvent;
    }
  | { type: "display"; label?: string; content: string }
  | { type: "free-input"; label: string }
  | {
      type: "projection";
      projectionType: Projection["type"];
      label?: string;
      element: JSX.Element;
    };
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
      label: "Replace with",
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

export function prepDiagnostics(
  diagnostics: LintError[],
  targetNode: SyntaxNode
) {
  return diagnostics
    .filter(
      (x) =>
        (x.from === targetNode.from || x.from === targetNode.from - 1) &&
        (x.to === targetNode.to || x.to === targetNode.to + 1)
      // more generous than we need to be with the linter errors
    )
    .map((lint) => ({
      label: "Lint error",
      elements: [
        { type: "display", content: lint.message },
        ...(lint.expected || []).map((expectation: string) => {
          return {
            type: "button",
            content: `Switch to ${expectation}`,
            onSelect: {
              type: "simpleSwap",
              payload: simpleTypes[expectation] || `"${expectation}"`,
              nodeId: nodeToId(targetNode),
            },
          };
        }),
      ],
    }))
    .filter((x) => x);
}
const simpleTypes: Record<string, any> = {
  string: "",
  object: `{ } `,
  number: 0,
  boolean: true,
  array: "[ ] ",
  null: '"null"',
};

function simpleFillOut(content: JSONSchema7) {
  if (!content) {
    return null;
  } else if ((content as any).type in simpleTypes) {
    return simpleTypes[(content as any).type];
  } else if (content.anyOf && content.anyOf.length) {
    const childTypes = content.anyOf.map((x: any) => x.type).filter((x) => x);
    const firstSimpleType = childTypes.find((x) => x in simpleTypes);
    return firstSimpleType ? simpleTypes[firstSimpleType] : null;
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

const focusTargetForObjPicker = (node: SyntaxNode): SyntaxNode => {
  if (node.type.name === "PropertyName") {
    return node.parent?.lastChild!;
  } else if (node.type.name === "Property") {
    return node.lastChild!;
  }
  return node;
};

const ObjPicker: Component = (props) => {
  const { content, fullCode } = props;
  const node = focusTargetForObjPicker(props.node);
  const containerNode = getContainingObject(node);
  const parsedContent = parseContent(containerNode, fullCode, {});
  const currentKeys = new Set(Object.keys(parsedContent));
  // TODO this gets this wrong if coming from { / }
  // i think this is fixed now?
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
            value: `${simpleFillOut(prop)}`,
          },
          nodeId: nodeToId(node),
        },
      };
    });
  return [
    addFieldEntries.length && {
      label: "Add Field",
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
  if (!content || !(content.anyOf || content.oneOf || content.allOf)) {
    return content;
  }
  return [
    ...(content.anyOf || []),
    ...(content.oneOf || []),
    ...(content.allOf || []),
  ].reduce((acc: any[], row: any) => {
    if (row.description) {
      acc.push({ description: row.description });
    }
    const hasNext = row.anyOf || row.oneOf || row.allOf || null;
    return acc.concat(hasNext ? flattenAnyOf(row) : row);
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
const targTypes = new Set(["Object", "JsonText"]);
const getContainingObject = (node: SyntaxNode): SyntaxNode => {
  return targTypes.has(node.type.name)
    ? node
    : getContainingObject(node.parent!);
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

function materializeRequiredProps(content: JSONSchema7): string[] {
  const requiredProps = new Set<string>(
    Array.isArray(content.required) ? content.required : []
  );
  return Array.from(requiredProps);
}
function materializeAnyOfOption(content: any): string {
  const requiredPropsArr = materializeRequiredProps(content);
  const props = requiredPropsArr.map((x) => {
    const val =
      x in (content?.properties || {})
        ? simpleFillOut(content.properties[x])
        : "null";
    return [x, val];
  });
  const payload = JSON.stringify(Object.fromEntries(props));
  return payload;
}

// todo this is the logic as that other function like this, merge?
const focusSwitchNodeForAnyOfObjField = (node: SyntaxNode): SyntaxNode => {
  if (node.type.name === "Property") {
    return node.lastChild!;
  } else if (node.type.name === "PropertyName") {
    return node.parent?.lastChild!;
  }
  return node;
};

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
  const switchNode = focusSwitchNodeForAnyOfObjField(node);
  return [
    // content.$$labeledType && {
    //   label: "Description",
    //   elements: [{ type: "display", content: content.$$labeledType }],
    // },
    !isObject && {
      label: "Switch to",
      elements: [
        requiredPropsArr.length > 0 && {
          type: "button",
          onSelect: {
            type: "simpleSwap",
            nodeId: nodeToId(switchNode),
            payload: requiredPropObject,
          },
          label: requiredPropObject,
          content: `object`,
        },
        requiredPropsArr.length === 0 && {
          type: "button",
          onSelect: {
            type: "simpleSwap",
            nodeId: nodeToId(switchNode),
            payload: "{ } ",
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
        .map((x) => {
          const props = content?.properties || {};
          const value = simpleFillOut(props[x]);
          return {
            type: "button",
            content: x,
            onSelect: {
              type: "addObjectKey",
              nodeId: nodeToId(node),
              payload: {
                key: `"${x}"`,
                value: value === "" ? '""' : value,
              },
            },
          };
        }),
    },
  ].filter((x) => x) as MenuRow[];
}

const deduplicateAndSortArray = (arr: string[]): string[] => {
  return Array.from(new Set(arr)).sort((a, b) => a.localeCompare(b));
};

const targetingForAnyOfArray = (node: SyntaxNode): SyntaxNode => {
  if (node.type.name === "PropertyName") {
    return node.parent?.lastChild!;
  }
  if (node.type.name === "Property") {
    return node.lastChild!;
  }
  return node;
};

function AnyOfArray(content: JSONSchema7, node: SyntaxNode): MenuRow[] {
  const arrayType = (content?.items as any)?.type;
  if (!arrayType) {
    return [];
  }

  return [
    {
      label: "Switch to",
      elements: [
        {
          type: "button",
          content: "Empty array",

          onSelect: {
            type: "simpleSwap",
            nodeId: nodeToId(targetingForAnyOfArray(node)),
            payload: "[]",
          },
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
        label: "Description",
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
            // opt.$$labeledType && {
            //   type: "display",
            //   content: opt.$$labeledType,
            // },
            currentNodeType !== opt.type && {
              type: "button",
              content: `${opt.type}`,
              onSelect: {
                type: "simpleSwap",
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

// pick element before the bracket
function retargetForArrayBuilder(node: SyntaxNode): SyntaxNode {
  if (node.type.name === "Array") {
    return node.lastChild?.prevSibling!;
  }
  if (node.type.name === "PropertyName") {
    return node.parent?.lastChild?.lastChild?.prevSibling!;
  }
  if (node.type.name === "[" || node.type.name === "]") {
    return node.parent?.lastChild?.prevSibling!;
  }
  // console.log("im confuse", node);
  return node;
}

const ArrayItemBuilder: Component = ({ content, node }) => {
  const items = content.items;
  if (!items || typeof items === "boolean") {
    return [];
  }
  const targetNode = retargetForArrayBuilder(node);

  if (!Array.isArray(items) && items.enum) {
    return [
      {
        label: "Insert",
        elements: (items.enum as any[]).map((content: string) => ({
          type: "button",
          content,
          onSelect: {
            type: "addElementAsSiblingInArray",
            payload: `"${content}"`,
            nodeId: nodeToId(targetNode),
          },
        })),
      },
    ];
  }
  const elements = (Array.isArray(items) ? items : [items]).flatMap((item) => {
    if (typeof item === "boolean") {
      return [];
    }
    let targets: JSONSchema7Definition[] = [];
    if (item.oneOf) {
      targets = item.oneOf;
    } else if (item.anyOf) {
      targets = item.anyOf;
    } else if (item.allOf) {
      targets = item.allOf;
    } else if (item.type === "object") {
      targets = [item];
    }
    return targets.flatMap((subItem) => {
      const result = generateSubItem(subItem);
      if (!result) {
        return [];
      }
      const { content, payload } = result;
      // if its array do one thing, otherwise its a bracket, then do another thing

      const element: MenuElement = {
        type: "button",
        content,
        onSelect: {
          type: "addElementAsSiblingInArray",
          payload,
          nodeId: nodeToId(targetNode),
        },
      };
      return element;
    });
  });
  const output: MenuRow[] = [{ label: "Insert", elements }];
  if (targetNode.parent?.type.name !== "array") {
    const inner: MenuElement = {
      type: "button",
      content: "Empty Array",
      onSelect: {
        type: "simpleSwap",
        payload: "[]",
        nodeId: nodeToId(node),
      },
    };
    output.push({ label: "Replace with", elements: [inner] });
  }
  return output;
};

const makeSimpleComponent: (x: string) => Component = (content) => (props) => {
  return [
    // {
    //   label: "Inferred JSON Type",
    //   elements: [{ type: "display", content }],
    // },
  ];
};

const GenericComponent = makeSimpleComponent("hi generic");

const PropertyNameComponent: Component = (props) => {
  const { node } = props;
  return [
    {
      label: "Utils",
      elements: [
        // { type: "display", content: fullCode.slice(node.from, node.to) },
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

const PropertyValueComponent: Component = (props) => {
  const { node } = props;
  return [
    {
      label: "Utils",
      elements: [
        // { type: "display", content: fullCode.slice(node.from, node.to) },
        {
          type: "button",
          content: "remove key",
          onSelect: {
            type: "removeObjectKey",
            nodeId: nodeToId(node.parent?.firstChild!),
          },
        },
        ...directionalMoves(node.parent?.firstChild!),
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

function createObjectMatchingInput(
  code: string,
  node: SyntaxNode
): string | false {
  const x = simpleParse(code.slice(node.from, node.to), undefined);
  if (!Array.isArray(x)) {
    return false;
  }
  const childTypes = new Set(x.map((el) => typeof el));
  if (childTypes.size > 1 || !childTypes.has("object")) {
    return false;
  }
  const keys = Array.from(new Set(x.flatMap((el) => Object.keys(el))));
  return JSON.stringify(Object.fromEntries(keys.map((el) => [el, ""])));
}

const retargetForArray = (node: SyntaxNode): SyntaxNode => {
  if (node.type.name === "[" || node.type.name === "]") {
    return node.parent?.lastChild?.prevSibling!;
  }
  if (node.type.name === "Array") {
    return node.lastChild?.prevSibling!;
  }
  return node;
};

const ArrayComponent: Component = (props) => {
  const elements = [
    { label: "boolean", value: "false" },
    { label: "number", value: "0" },
    { label: "string", value: '""' },
    { label: "object", value: "{ } " },
    { label: "array", value: "[ ] " },
  ];
  const targetNode = retargetForArray(props.node);
  const simpleObject = createObjectMatchingInput(props.fullCode, targetNode);
  if (simpleObject) {
    elements.push({ label: "inferred object", value: simpleObject });
  }
  return [
    {
      label: "Add element",
      elements: elements.map(({ label, value }) => ({
        type: "button",
        content: label,
        onSelect: {
          type: "addElementAsSiblingInArray",
          payload: value,
          nodeId: nodeToId(targetNode),
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

const directionalMoves = (syntaxNode: SyntaxNode): MenuElement[] => {
  const outputDirections: MenuElement[] = [];
  let node = syntaxNode;
  if (syntaxNode.type.name === "PropertyName") {
    node = syntaxNode.parent!;
  }

  const bounds = boundCheck(node);
  if (!bounds.isFirst) {
    outputDirections.push({
      type: "button",
      content: "Swap with prev",
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
      content: "Swap with next",
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
      label: "Utils",
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
    label: "Switch to",
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
  PropertyValue: PropertyValueComponent,
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

const safeStringify = (obj: any, indent = 2) => {
  let cache: any = [];
  const retVal = JSON.stringify(
    obj,
    (key, value) =>
      typeof value === "object" && value !== null
        ? cache.includes(value)
          ? undefined // Duplicate reference found, discard key
          : cache.push(value) && value // Store value in our collection
        : value,
    indent
  );
  cache = null;
  return retVal;
};

function deduplicate(rows: any[]): any[] {
  const hasSeen: Set<string> = new Set([]);
  return rows.filter((x) => {
    const key = safeStringify(x);
    if (hasSeen.has(key)) {
      return false;
    }
    hasSeen.add(key);
    return true;
  });
}

export function simpleMerge(content: MenuRow[]): MenuRow[] {
  const groups = content.reduce((acc: Record<string, any[]>, row) => {
    acc[row.label] = (acc[row.label] || []).concat(row.elements);
    return acc;
  }, {});

  return Object.entries(groups).map(
    ([label, elements]) =>
      ({ label, elements: deduplicate(elements).filter((x) => x) } as MenuRow)
  );
}

function getCompareString(element: MenuElement): string {
  switch (element.type) {
    case "button":
    case "display":
      return element.content;
    case "free-input":
    case "projection":
    default:
      return "ZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZ";
  }
}

function sortMenuContents(content: MenuRow[]): MenuRow[] {
  return content.map((row) => {
    return {
      ...row,
      elements: row.elements.sort((a, b) =>
        getCompareString(a).localeCompare(getCompareString(b))
      ),
    };
  });
}

const mergeFunctions =
  (a: any, b: any) =>
  (...args: any) =>
    [...a(...args), ...b(...args)];

export function generateMenuContent(
  syntaxNode: SyntaxNode,
  schemaMap: SchemaMap,
  fullCode: string
): MenuRow[] {
  const schemaChunk = getSchemaForRetargetedNode(syntaxNode, schemaMap);

  // TODO these should be functions
  const type = syntaxNode.type.name;
  let typeBasedProperty: Component | null = null;
  if (typeBasedComponents[type]) {
    typeBasedProperty = typeBasedComponents[type];
  } else if (!schemaChunk) {
    console.log("missing imp for", type);
  } else if (typeBasedProperty && !typeBasedProperty[type]) {
    console.log("missing type imp for", type);
  }

  if (
    syntaxNode.parent?.type.name === "Property" &&
    syntaxNode.type.name !== "PropertyName"
  ) {
    typeBasedProperty = typeBasedProperty
      ? mergeFunctions(typeBasedProperty, PropertyValueComponent)
      : PropertyValueComponent;
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

  // assemble the content for display
  const content: MenuRow[] = [];
  if (schemaChunk?.description) {
    content.push({
      label: "Description",
      elements: [{ type: "display", content: schemaChunk.description }],
    });
  }
  // @ts-ignore
  if (schemaChunk?.$$refName) {
    content.push({
      label: "Description",
      // @ts-ignore
      elements: [{ type: "display", content: schemaChunk.$$refName }],
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
  let computedMenuContents = simpleMerge(content.filter((x) => x)).filter(
    (x) => x.elements.length
  );
  computedMenuContents = sortMenuContents(computedMenuContents);
  return computedMenuContents;
}
