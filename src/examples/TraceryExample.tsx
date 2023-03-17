import React, { useState, useEffect } from "react";
import StandardProjections from "../projections/standard-bundle";
import { buttonListProjection } from "./VegaExample";
// import { Tracery } from "./tracery-errata/tracery";
import tracery, { generate } from "./tracery-errata/tracery-v2";

import Editor from "../components/Editor";

import TracerySchema from "../constants/tracery-schema.json";

const initialCode = `
{
    "origin":["[myPlace:#path#]#line#"],
    "line":[
        "#mood.capitalize# and #mood#, the #myPlace# was #mood# with #substance#", 
        "#nearby.capitalize# #myPlace.a# #move.ed# through the #path#, filling me with #substance#"],
    "nearby":["beyond the #path#", "far away", "ahead", "behind me"],
    "substance":["light", "reflections", "mist", "shadow", "darkness", "brightness", "gaiety", "merriment"],
    "mood":["overcast", "alight", "clear", "darkened", "blue", "shadowed", "illuminated", "silver", "cool", "warm", "summer-warmed"],
    "path":["stream", "brook", "path", "ravine", "forest", "fence", "stone wall"],
    "move":["spiral", "twirl", "curl", "dance", "twine", "weave", "meander", "wander", "flow"]
}`;

console.log();

const targVals = new Set([
  // "PropertyName",
  "Number",
  "String",
  "Null",
  "False",
  "True",
]);
function generateRoots(currentCode: string) {
  return generate(false, {
    generateCount: 1,
    mode: undefined,
    grammar: tracery.createGrammar(JSON.parse(currentCode)),
    generatedRoots: [],
  });
}

function TraceryExample() {
  const [currentCode, setCurrentCode] = useState(initialCode);
  const [roots, setRoots] = useState<any[]>([]);
  // const context = Tracery.createContext(JSON.parse(initialCode), {});
  // const parsed = Tracery.parseGrammar(context.grammar);
  // console.log("hi", context.expand("#origin#"));
  useEffect(() => {
    setRoots(generateRoots(currentCode));
  }, [currentCode]);

  return (
    <div className="flex-down">
      {roots.length && (
        <div>
          <h3>
            Output X{" "}
            <button onClick={() => setRoots(generateRoots(currentCode))}>
              Regenerate
            </button>
          </h3>
          <h1>{roots[0].finishedText}</h1>
        </div>
      )}
      <Editor
        schema={TracerySchema}
        code={currentCode}
        onChange={(x) => setCurrentCode(x)}
        height={"800px"}
        projections={[
          ...StandardProjections,
          {
            type: "full-tooltip",
            query: {
              type: "function",
              query: (_, type) => targVals.has(type),
            },
            name: "TraceryEditor",
            projection: (props) => {
              return <div>hi</div>;
            },
          },
          // {
          //   type: "inline",
          //   mode: "replace",
          //   query: {
          //     type: "function",
          //     query: (x, type) => {
          //       console.log(x, type);
          //       return false;
          //     },
          //   },
          //   projection: (props) => <div>hi</div>,
          //   name: "ASD",
          //   hasInternalState: false,
          // },
        ]}
      />
    </div>
  );
}

export default TraceryExample;
