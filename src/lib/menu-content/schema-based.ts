import { SyntaxNode } from "@lezer/common";
import isequal from "lodash.isequal";
import {
  MenuElement,
  nodeToId,
  MenuRow,
  simpleTypes,
  literalTypes,
} from "../compute-menu-contents";
import { simpleParse } from "../utils";
import { JSONSchema7, JSONSchema7Definition } from "json-schema";

type SchemaBasedComponent = (props: {
  content: JSONSchema7;
  node: SyntaxNode;
  fullCode: string;
}) => MenuRow[];

const EnumPicker: SchemaBasedComponent = (props) => {
  const { content, node } = props;
  // TODO dont switch if this is the current value?
  return [
    {
      label: "Switch to",
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

const ObjPicker: SchemaBasedComponent = (props) => {
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
          payload: { key: `"${content}"`, value: materializeAnyOfOption(prop) },
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

// TODO TREAT ALLOF SPECIALLY TO??
const HOFFlatten = (key: "anyOf" | "oneOf" | "allOf") => {
  const flattener = (content: any): any => {
    if (!content) {
      return content;
    }
    return (Array.isArray(content) ? content : content[key] || []).reduce(
      (acc: any[], row: any) => {
        if (row.description) {
          acc.push({ description: row.description });
        }
        return acc.concat(row[key] ? flattener(row[key]) : row);
      },
      []
    );
  };
  return flattener;
};
const flattenAnyOf = HOFFlatten("anyOf");
const flattenOneOf = HOFFlatten("oneOf");
// const flattenAllOf = HOFFlatten("allOf");

// // TODO flatten nested anyOfs and remove duplicates
// function flattenAnyOf(content: JSONSchema7): any {
//   // if (!content || !(content.anyOf || content.oneOf || content.allOf)) {
//   if (!content || !(content.anyOf || content.allOf)) {
//     return content;
//   }
//   return [
//     ...(content.anyOf || []),
//     // ...(content.oneOf || []),
//     ...(content.allOf || []),
//   ].reduce((acc: any[], row: any) => {
//     if (row.description) {
//       acc.push({ description: row.description });
//     }
//     const hasNext =
//       row.anyOf ||
//       // row.oneOf ||
//       row.allOf ||
//       null;
//     return acc.concat(hasNext ? flattenAnyOf(row) : row);
//   }, []);
// }

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

function simpleFillOut(content: JSONSchema7) {
  if (!content) {
    return null;
  }
  if ((content as any).type in simpleTypes) {
    return simpleTypes[(content as any).type];
  }
  if (content.anyOf && content.anyOf.length) {
    const childTypes = content.anyOf.map((x: any) => x.type).filter((x) => x);
    const firstSimpleType = childTypes.find((x) => x in simpleTypes);
    return firstSimpleType ? simpleTypes[firstSimpleType] : null;
  }
  if (content.oneOf && content.oneOf.length) {
    const childTypes = content.oneOf.map((x: any) => x.type).filter((x) => x);
    const firstSimpleType = childTypes.find((x) => x in simpleTypes);
    return firstSimpleType ? simpleTypes[firstSimpleType] : null;
  }
  if (content.enum) {
    // doesn't do anything rn
    return content.enum.filter((x) => typeof x === "string")[0];
  }
  return "null";
}

function materializeRequiredProps(content: any): string[] {
  const requiredProps = new Set<string>(
    Array.isArray(content.required) ? content.required : []
  );
  return Array.from(requiredProps);
}

export function materializeAnyOfOption(content: JSONSchema7): string {
  const targ = ((content?.oneOf && flattenOneOf(content.oneOf)[0]) ||
    (content?.anyOf && flattenAnyOf(content.anyOf)[0]) ||
    content) as JSONSchema7;
  if (!targ) {
    return "null";
  }
  const requiredPropsArr = materializeRequiredProps(targ);
  const type = targ.type as string;
  if (type in literalTypes) {
    return literalTypes[type];
  }
  const props = requiredPropsArr.map((x) => {
    const properties: any = content?.properties || {};
    const val = x in properties ? simpleFillOut(properties[x]) : "null";
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

const deduplicateAndSortArray = (arr: string[]): string[] => {
  return Array.from(new Set(arr)).sort((a, b) => a.localeCompare(b));
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
      label: "Add Field",
      elements: addProps
        .filter((x) => !inUseKeys.has(x))
        .map((x) => {
          const props = content?.properties || {};
          const value = materializeAnyOfOption(props[x]);
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

// const simpleType = new Set(["string", "number", "boolean", "null"]);
const simpleTypeMap: Record<string, string> = {
  string: '""',
  number: "0",
  boolean: "true",
  null: "null",
};
const simpleType = new Set(Object.keys(simpleTypeMap));
const AnyOfPicker: SchemaBasedComponent = (props) => {
  const { content, node, fullCode } = props;

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
        label: "Switch to",
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
          ].filter((x) => x) as unknown as MenuRow[],
        },
    ].filter((x) => x);
    return optionRow;
  });
  return rows;
};

const OneOfPicker: SchemaBasedComponent = (props): MenuRow[] => {
  const { content, node } = props;
  // todo maybe wrong
  const targetNode = node;
  const elements: MenuElement[] = [];
  content.oneOf!.forEach((option) => {
    const result = generateSubItem(option);
    if (!result) {
      return [];
    }
    const { content, payload } = result;
    const element: MenuElement = {
      type: "button",
      content,
      onSelect: {
        type: "simpleSwap",
        payload,
        nodeId: nodeToId(targetNode),
      },
    };
    elements.push(element);
  });
  return [{ label: "Switch to", elements }];
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
  return node;
}

const makeSimpleComponent: (x: string) => SchemaBasedComponent =
  (content) => (props) => {
    return [
      // {
      //   label: "Inferred JSON Type",
      //   elements: [{ type: "display", content }],
      // },
    ];
  };
const GenericComponent = makeSimpleComponent("hi generic");

const ArrayItemBuilder: SchemaBasedComponent = ({ content, node }) => {
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
    output.push({ label: "Switch to", elements: [inner] });
  }
  return output;
};

const menuSwitch: Record<string, SchemaBasedComponent> = {
  EnumPicker,
  ObjPicker,
  AnyOfPicker,
  OneOfPicker,
  GenericComponent,
  ArrayItemBuilder,
};

export function evalSchemaChunks(
  syntaxNode: SyntaxNode,
  schemaChunk: JSONSchema7[],
  code: string
): MenuRow[] {
  const results: MenuRow[] = (schemaChunk || []).flatMap((chunk) => {
    if (!chunk) {
      return [];
    }
    const componentProps = {
      content: chunk,
      node: syntaxNode,
      fullCode: code,
    };
    const items = [];
    // TODO work through options listed in the validate wip
    // not sure what this refers, but there are some missing options for sure, maybe explore the .type = X?
    // TODO this isn't totally hooked up and we should allow for multiple any of and one of right?
    if (chunk.enum) {
      menuSwitch.EnumPicker(componentProps).forEach((x) => items.push(x));
    }
    if (chunk.type === "object") {
      menuSwitch.ObjPicker(componentProps).forEach((x) => items.push(x));
    }
    if (chunk.anyOf) {
      menuSwitch.AnyOfPicker(componentProps).forEach((x) => items.push(x));
    }
    if (chunk.oneOf) {
      menuSwitch.OneOfPicker(componentProps).forEach((x) => items.push(x));
    }
    if (chunk.type === "array") {
      menuSwitch.ArrayItemBuilder(componentProps).forEach((x) => items.push(x));
    }
    if (chunk.description) {
      items.push({
        label: "Description",
        elements: [{ type: "display", content: chunk.description }],
      });
    }
    // // @ts-ignore
    // if (chunk.$$refName) {
    //   items.push({
    //     label: "Description",
    //     // @ts-ignore
    //     elements: [{ type: "display", content: chunk.$$refName }],
    //   });
    // }
    return items as MenuRow[];
  });
  return results;
}
