import { generateMenuContent } from "./compute-menu-contents";
import { findNodeByText } from "./test-utils";
import { createNodeMap } from "./utils";

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

test("generateMenuContent", async () => {
  const veg = findNodeByText(exampleData, `"vegetables"`)!;
  const fAndVNodeMap = await createNodeMap(schema, exampleData);
  expect(fAndVNodeMap).toMatchSnapshot();
  const menuContent = generateMenuContent(veg, fAndVNodeMap, exampleData);
  expect(menuContent).toMatchSnapshot();
});
