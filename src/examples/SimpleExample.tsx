import React, { useState } from "react";

import Editor from "../components/Editor";

const exampleData = `{
    "a": {
      "b": [1, 2, 3],
      "c": true,
    },
    "d": null,
    "e": [{ "f": 4, "g": 5 }],
    "I": "example",
  }`;

function SimpleExample() {
  const [currentCode, setCurrentCode] = useState(exampleData);

  return (
    <Editor
      schema={{}}
      code={currentCode}
      onChange={(x) => {
        setCurrentCode(x);
      }}
      projections={[]}
    />
  );
}

export default SimpleExample;
