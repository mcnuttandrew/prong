import { SyntaxNode } from "@lezer/common";
import {
  MenuElement,
  nodeToId,
  Component,
  MenuRow,
  componentContainer,
  retargetToAppropriateNode,
} from "../compute-menu-contents";
import { boundCheck } from "../modify-json";
import { simpleParse } from "../utils";
import { JSONSchema7 } from "json-schema";

const mergeFunctions =
  (a: any, b: any) =>
  (...args: any) =>
    [...a(...args), ...b(...args)];

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

const makeSimpleComponent: (x: string) => Component = (content) => (props) => {
  return [
    // {
    //   label: "Inferred JSON Type",
    //   elements: [{ type: "display", content }],
    // },
  ];
};
const ParentIsPropertyComponent = makeSimpleComponent("hi property");

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

export function evalTypeBasedContent(
  syntaxNode: SyntaxNode,
  schemaChunk: JSONSchema7[],
  code: string
): MenuRow[] {
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
  const output = (schemaChunk || []).flatMap((chunk) => {
    const componentProps = {
      content: chunk,
      node: syntaxNode,
      fullCode: code,
    };
    return typeBasedProperty ? typeBasedProperty(componentProps) : [];
  });
  return output || [];
}

const parentResponses: componentContainer = {
  Property: ParentIsPropertyComponent,
  Array: ParentIsArrayComponent,
};

export function evalParentBasedContent(
  syntaxNode: SyntaxNode,
  schemaChunk: JSONSchema7[],
  code: string
) {
  const parentType = retargetToAppropriateNode(syntaxNode).parent!.type.name;
  const parentProp = parentResponses[parentType];
  const output = (schemaChunk || []).flatMap((chunk) => {
    const componentProps = {
      content: chunk,
      node: syntaxNode,
      fullCode: code,
    };
    return parentProp ? parentProp(componentProps) : [];
  });
  return output || [];
}
