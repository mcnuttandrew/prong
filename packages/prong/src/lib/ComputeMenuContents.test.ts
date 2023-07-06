import { generateMenuContent } from "./compute-menu-contents";
import { findNodeByText } from "./test-utils";
import { createNodeMap } from "./utils";
import { vegaCode } from "../../../../sites/docs/src/examples/example-data";
import VegaSchema from "../../../../sites/docs/src/constants/vega-schema.json";
import { materializeAnyOfOption } from "./menu-content/schema-based";

const schema = {
  $id: "https://example.com/arrays.schema.json",
  $schema: "https://json-schema.org/draft/2020-12/schema",
  description: "A representation of a person, company, organization, or place",
  type: "object",
  properties: {
    fruits: {
      type: "array",
      items: {
        type: "string",
      },
    },
    vegetables: {
      type: "array",
      items: { $ref: "#/$defs/veggie" },
    },
  },
  $defs: {
    veggie: {
      type: "object",
      required: ["veggieName", "veggieLike"],
      properties: {
        veggieName: {
          type: "string",
          description: "The name of the vegetable.",
        },
        veggieLike: {
          type: "boolean",
          description: "Do I like this vegetable?",
        },
      },
    },
  },
};

const exampleData = `{
  "fruits": [ "apple", "orange", "pear" ],
  "vegetables": [
    {
      "veggieName": "potato",
      "veggieLike": true
    },
    {
      "veggieName": "broccoli",
      "veggieLike": false
    }
  ]
}`;

test("generateMenuContent - fruit", async () => {
  const veg = findNodeByText(exampleData, `"vegetables"`)!;
  const fAndVNodeMap = await createNodeMap(schema, exampleData);
  expect(fAndVNodeMap).toMatchSnapshot();
  const menuContent = generateMenuContent(veg, fAndVNodeMap, exampleData);
  expect(menuContent).toMatchSnapshot();
});

test("generateMenuContent - vega", async () => {
  const targ = findNodeByText(vegaCode, `"transform"`)!.parent?.lastChild
    ?.firstChild?.nextSibling!;
  const nodeMap = await createNodeMap(VegaSchema, vegaCode);
  // expect(nodeMap).toMatchSnapshot();
  const menuContent = generateMenuContent(targ, nodeMap, vegaCode);
  expect(menuContent).toMatchSnapshot();
});

test("materializeAnyOfOption", () => {
  const literalSchema = { type: "string", $$labeledType: "role" };
  expect(materializeAnyOfOption(literalSchema as any)).toBe('""');

  const simpleOneOf = {
    $$labeledType: "style",
    $$refName: "#/definitions/style",
    oneOf: [{ type: "string" }, { type: "array", items: { type: "string" } }],
  };
  expect(materializeAnyOfOption(simpleOneOf as any)).toBe('""');

  const simpleAnyOf = {
    $$labeledType: "style",
    $$refName: "#/definitions/style",
    anyOf: [{ type: "string" }, { type: "array", items: { type: "string" } }],
  };
  expect(materializeAnyOfOption(simpleAnyOf as any)).toBe('""');

  const clip = {
    $$labeledType: "clip",
    $$refName: "#/definitions/markclip",
    oneOf: [
      {
        $$refName: "#/definitions/booleanOrSignal",
        oneOf: [
          { type: "boolean" },
          {
            $$refName: "#/definitions/signalRef",
            type: "object",
            properties: {
              signal: { type: "string", $$labeledType: "signal" },
            },
            required: ["signal"],
            $$labeledType: "signalRef",
          },
        ],
        $$labeledType: "booleanOrSignal",
      },
      {
        type: "object",
        properties: {
          path: {
            $$labeledType: "path",
            $$refName: "#/definitions/stringOrSignal",
            oneOf: [
              { type: "string" },
              {
                $$refName: "#/definitions/signalRef",
                type: "object",
                properties: {
                  signal: { type: "string", $$labeledType: "signal" },
                },
                required: ["signal"],
                $$labeledType: "signalRef",
              },
            ],
          },
        },
        required: ["path"],
        additionalProperties: false,
      },
      {
        type: "object",
        properties: {
          sphere: {
            $$labeledType: "sphere",
            $$refName: "#/definitions/stringOrSignal",
            oneOf: [
              { type: "string" },
              {
                $$refName: "#/definitions/signalRef",
                type: "object",
                properties: {
                  signal: { type: "string", $$labeledType: "signal" },
                },
                required: ["signal"],
                $$labeledType: "signalRef",
              },
            ],
          },
        },
        required: ["sphere"],
        additionalProperties: false,
      },
    ],
  };
  expect(materializeAnyOfOption(clip as any)).toBe("true");
});
