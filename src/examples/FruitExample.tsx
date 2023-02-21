import React from "react";

import Editor from "../components/Editor";
import { JSONSchema7 } from "json-schema";
import standardBundle from "../projections/standard-bundle";

const schema: JSONSchema7 = {
  $id: "https://example.com/arrays.schema.json",
  $schema: "https://json-schema.org/draft/2020-12/schema",
  description: "A representation of a person, company, organization, or place",
  type: "object",
  properties: {
    fruits: {
      type: "array",
      description: "wowza what a list of fruit! awoooga",
      items: { $ref: "#/$defs/fruitie" },
    },
    vegetables: {
      type: "array",
      description: "just a boring ol list of vegetables",
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
        veggieStarRating: {
          $ref: "#/$defs/veggieStar",
        },
      },
    },
    veggieStar: {
      anyOf: [
        {
          description: "Stars out of 5",
          maximum: 5,
          minimum: 0,
          type: "number",
        },
        {
          enum: ["Thumbs Up", "Thumbs Down"],
          type: "string",
        },
      ],
    },
    fruitie: {
      enum: [
        "Apple",
        "Apricot",
        "Avocado",
        "Banana",
        "Blackberry",
        "Blueberry",
        "Cherry",
        "Coconut",
        "Cucumber",
        "Durian",
        "Dragonfruit",
        "Fig",
        "Gooseberry",
        "Grape",
        "Guava",
      ],
      type: "string",
      description: "Options for fruit that are allowed",
    },
  },
};

const exampleData = `{
  "fruits": [ "apple", "orange", "#c71585" ],
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

function FruitExample() {
  const [currentCode, setCurrentCode] = React.useState(exampleData);
  const [numRows, setNumRows] = React.useState(0);

  return (
    <div>
      {[...new Array(numRows)].map(() => (
        <h1>ha ha fruit</h1>
      ))}
      <Editor
        schema={schema}
        code={currentCode}
        onChange={(x: string) => {
          setCurrentCode(x);
        }}
        projections={standardBundle}
      />
      <button onClick={() => setNumRows(numRows + 1)}>Add row</button>
    </div>
  );
}

export default FruitExample;
