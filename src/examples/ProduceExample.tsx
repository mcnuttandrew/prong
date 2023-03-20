import React from "react";

import Editor from "../components/Editor";
import { JSONSchema7 } from "json-schema";
import StandardProjections from "../projections/standard-bundle";
import { Projection } from "../lib/projections";
import { maybeTrim } from "./example-utils";

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

const blue = "#0551A5";
const green = "#17885C";
const red = "#A21615";
const coloring: Record<string, string> = {
  String: blue,
  Number: green,
  Boolean: blue,
  PropertyName: red,
  Null: blue,
};

const DestringProjection: Projection = {
  type: "inline",
  mode: "replace",
  query: {
    type: "nodeType",
    query: ["PropertyName", "Number", "String", "Null", "False", "True"],
  },
  projection: (props) => (
    <div
      style={{
        color: coloring[props.node.type.name] || "black",
        background: props.diagnosticErrors.length ? "lightsalmon" : "none",
      }}
    >
      {maybeTrim(props.currentValue)}
    </div>
  ),
  name: "Destring",
  hasInternalState: false,
};

function ProduceExample() {
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
        onChange={(x) => setCurrentCode(x)}
        projections={[
          ...Object.values(StandardProjections),
          DestringProjection,
        ]}
      />
      <button onClick={() => setNumRows(numRows + 1)}>Add row</button>
    </div>
  );
}

export default ProduceExample;
