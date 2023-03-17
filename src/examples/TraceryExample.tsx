import React, { useState, useEffect } from "react";
import StandardProjections from "../projections/standard-bundle";
import { buttonListProjection } from "./VegaExample";
// import { Tracery } from "./tracery-errata/tracery";
import tracery, { generate, TraceryNode } from "./tracery";
import { simpleParse } from "../lib/utils";
import "../stylesheets/tracery-example.css";
import { maybeTrim } from "./example-utils";

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

function TraceryCascadeVis(props: { node: TraceryNode; first: boolean }) {
  const { node, first } = props;
  if (first) {
    return (
      <div className="flex">
        {(node.children || []).map((child, idx) => (
          <TraceryCascadeVis node={child} key={idx} first={false} />
        ))}
      </div>
    );
  }
  return (
    <div className="cascade-container flex-down">
      {first ? "" : node.raw}
      {(node.children || []).length ? (
        <div className="flex">
          {(node.children || []).map((child, idx) => (
            <TraceryCascadeVis node={child} key={idx} first={false} />
          ))}
        </div>
      ) : (
        <></>
      )}
    </div>
  );
}

function generateRoots(currentCode: string) {
  return generate(false, {
    generateCount: 1,
    mode: undefined,
    grammar: tracery.createGrammar(simpleParse(currentCode, {})),
    generatedRoots: [],
  });
}

function unpeelRoot(root: TraceryNode[]) {
  if (root.length === 0) {
    return {};
  }
  const allNodes = [];
  let queue = [root[0]];
  while (queue.length) {
    const current = queue.shift()!;
    allNodes.push(current);
    (current.children || []).forEach((child) => queue.push(child));
  }
  return Object.fromEntries(
    allNodes.filter((x) => x.symbol).map((x) => [x.symbol, x])
  );
}

function TraceryExample() {
  const [currentCode, setCurrentCode] = useState(initialCode);
  const [roots, setRoots] = useState<any[]>([]);
  const keys = Object.keys(simpleParse(currentCode, {}));
  useEffect(() => {
    setRoots(generateRoots(currentCode));
  }, [currentCode]);
  const unpeeledRoot = unpeelRoot(roots);

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
      {roots.length && (
        <div>
          <TraceryCascadeVis node={roots[0]} first={true} />
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
            type: "tooltip",
            query: {
              type: "nodeType",
              query: ["Number", "String", "Null", "False", "True"],
            },
            name: "TraceryEditor",
            projection: (props) => {
              // todo this part should turn into an autocomplete right?
              return (
                <div>
                  <span>Insert reference to</span>
                  {keys.map((key) => (
                    <button
                      key={key}
                      onClick={() => {
                        const cursorPos = props.cursorPositions[0].from;
                        if (!cursorPos) {
                          return;
                        }
                        props.setCode(
                          `${currentCode.slice(
                            0,
                            cursorPos
                          )} #${key}# ${currentCode.slice(cursorPos)}`
                        );
                      }}
                    >
                      {key}
                    </button>
                  ))}
                </div>
              );
            },
          },
          {
            type: "tooltip",
            query: {
              type: "function",
              query: (val, type) => {
                return "PropertyName" === type && unpeeledRoot[maybeTrim(val)];
              },
            },
            name: "TraceryEditor2",
            projection: (props) => {
              // console.log(props);
              const key = `${props.keyPath[0]}`.split("___")[0];
              if (unpeeledRoot[key]) {
                return (
                  <div>
                    <TraceryCascadeVis node={unpeeledRoot[key]} first={false} />
                  </div>
                );
              }
              return <div></div>;
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
