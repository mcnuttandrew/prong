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

function TraceryCascadeVis(props: {
  node: TraceryNode;
  first: boolean;
  onClick: (node: TraceryNode) => void;
}) {
  const { node, first, onClick } = props;
  if (first) {
    return (
      <div className="flex">
        {(node.children || []).map((child, idx) => (
          <TraceryCascadeVis
            node={child}
            key={idx}
            first={false}
            onClick={onClick}
          />
        ))}
      </div>
    );
  }
  return (
    <div
      className="cascade-container flex-down"
      onClick={(e) => {
        e.stopPropagation();
        onClick(node);
      }}
    >
      {first ? "" : node.raw}
      {(node.children || []).length ? (
        <div className="flex">
          {(node.children || []).map((child, idx) => (
            <TraceryCascadeVis
              node={child}
              key={idx}
              first={false}
              onClick={onClick}
            />
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
  console.log(computeRanges(root[0]));
  // console.log(allNodes.map((node) => [node.finishedText, node]));
  return Object.fromEntries(
    allNodes.filter((x) => x.symbol).map((x) => [x.symbol, x])
  );
}

// todo this is a bigger project, but here are the ideas
// 1. i'd like to be able to click on a word and see which part of the specification cause it shaded by increasing specifity
// 2. i think to do this we can use a really simple recursive provenance inference algorithm. algorithm works as follows
// a. initially there is just 1 range it's bound to the origin, represent it like {range: [start, end], node: Node}
// b. then recusively let the children chop up that rnage and claim parts of
// c. surface all ranges
// -> throw those into this visualizer you are trying to write here

// function WordVisualization(props: { node: TraceryNode }) {
//   const { node } = props;
//   const children = node.children || [];
//   console.log(node);
//   const content = node.raw;
//   return (
//     <>
//       {children.length || !content.length ? "" : <button>{node.raw}</button>}
//       {children.map((child, idx) => (
//         <WordVisualization node={child} key={idx} />
//       ))}
//     </>
//   );
// }

// const firstIndexInString = (str: string, match: string): [number, number] | false => {
//   const splits = str.split(match);
//   if (splits.length === 1) {
//     return false;
//   }

//   return false;
// }
// function computeRangesHelper(node: TraceryNode) {
//   const range = [{ range: [0, node.finishedText], node }];
//   const childRanges = (node.children || []).map(child => {

//   })
// }

function computeRanges(node: TraceryNode): any {
  // const range = [{range: [node.finishedText], node}]
  // use the raw on the way down to figure who is who (order is also necessary for this)
  // could also just modify tracery to do this in the first place, eh that seems delicate
  if (!node.children) {
    return [
      { range: [0, node.finishedText?.length], node, text: node.finishedText },
    ];
  }
  const children = node.children || [];
  return children.flatMap((child: any) => {
    let offset = 0;
    return computeRanges(child).map((x) => {
      const newRange = {
        ...x,
        range: [x.range[0] + offset, x.range[1] + offset],
      };
      offset += x.range[1] - x.range[0];
      return newRange;
    });
    // return computeRanges(child).map(x => ({...x, range: [x.range[0] ]}));
  });
}

function TraceryExample() {
  const [currentCode, setCurrentCode] = useState(initialCode);
  const [roots, setRoots] = useState<any[]>([]);
  const keys = Object.keys(simpleParse(currentCode, {}));
  useEffect(() => {
    setRoots(generateRoots(currentCode));
  }, []);
  const unpeeledRoot = unpeelRoot(roots);

  return (
    <div className="flex-down">
      {/* {roots.length && (
        <div>
          <WordVisualization node={roots[0]} />
        </div>
      )} */}
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
          <TraceryCascadeVis
            node={roots[0]}
            first={true}
            onClick={(node) => {
              console.log("hi", node);
            }}
          />
        </div>
      )}
      <Editor
        schema={TracerySchema}
        code={currentCode}
        onChange={(x) => setCurrentCode(x)}
        height={"800px"}
        projections={[
          ...StandardProjections.filter((x) => x.name !== "ColorChip"),
          {
            type: "full-tooltip",
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
