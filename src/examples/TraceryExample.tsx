import React, { useState, useEffect } from "react";
import StandardProjections from "../projections/standard-bundle";
import { buttonListProjection } from "./VegaExample";
// import { Tracery } from "./tracery-errata/tracery";
import tracery, { generate, TraceryNode, NodeAction } from "./tracery";
import { simpleParse } from "../lib/utils";
import "../stylesheets/tracery-example.css";
import { maybeTrim } from "./example-utils";
import { Projection } from "../lib/projections";

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

const classnames = (inp: Record<string, boolean>) =>
  Object.entries(inp)
    .filter(([_, x]) => x)
    .map(([x]) => x)
    .join(" ");

function TraceryCascadeVis(props: {
  node: TraceryNode | NodeAction;
  first: boolean;
  onClick: (node: TraceryNode) => void;
  selectedNodes: string[];
}) {
  const { node, first, onClick, selectedNodes } = props;
  const children = [...(node.children || []), ...(node.preactions || [])];
  if (first) {
    return (
      <div className="flex">
        {children.map((child, idx) => (
          <TraceryCascadeVis
            node={child}
            key={idx}
            first={false}
            onClick={onClick}
            selectedNodes={selectedNodes}
          />
        ))}
      </div>
    );
  }
  return (
    <div
      className={classnames({
        "cascade-container flex-down": true,
        "cascade-container--selected": !!selectedNodes.includes(node.id || "X"),
      })}
      onClick={(e) => {
        e.stopPropagation();
        onClick(node);
      }}
    >
      {node.childRule} {"->"} {node.finishedText}
      {children.length ? (
        <div className="flex">
          {children.map((child, idx) => (
            <TraceryCascadeVis
              node={child}
              key={idx}
              first={false}
              onClick={onClick}
              selectedNodes={selectedNodes}
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

function getAllNodes(root: TraceryNode) {
  const allNodes = [];
  let queue = [root];
  while (queue.length) {
    const current = queue.shift()!;
    allNodes.push(current);
    (current.children || []).forEach((child) => queue.push(child));
  }
  return allNodes;
}

function unpeelRoot(root: TraceryNode[]) {
  return root.length === 0
    ? {}
    : Object.fromEntries(
        getAllNodes(root[0])
          .filter((x) => x.symbol)
          .map((x) => [x.symbol, x])
      );
}

type Range = {
  node: TraceryNode;
  from: number;
  to: number;
  text: string;
  id: string;
};
function computeRanges(node: TraceryNode, from?: number, to?: number): Range[] {
  let offset = 0;
  const selfLength = (node.finishedText || "").length;
  return (node.children || []).reduce(
    (acc: any, child) => {
      const childLength = (child.finishedText || "").length;
      const result = computeRanges(
        child,
        (from || 0) + offset,
        (from || 0) + offset + childLength
      );
      offset += childLength;
      result.forEach((x: any) => acc.push(x));
      return acc;
    },
    [
      {
        node,
        from: from || 0,
        to: to || selfLength,
        text: node.finishedText,
        id: node.id,
      },
    ]
  );
}

const recursiveSlice = (str: string, slices: number[]): string[] => {
  const [head, ...tail] = slices;
  if (!head) {
    return [str];
  }
  const front = str.slice(0, head);
  const back = str.slice(head);
  return [front, ...recursiveSlice(back, tail)];
};

const recurseToRoot = (node: TraceryNode): TraceryNode[] =>
  [node].concat(node.parent ? recurseToRoot(node.parent) : []);

const dedup = (arr: (string | number)[][]) =>
  Object.values(
    arr.reduce((acc, row) => {
      const key = JSON.stringify(row);
      if (!acc[key]) {
        acc[key] = row;
      }
      return acc;
    }, {} as Record<string, any>)
  );

function assembleHighlight(
  nodes: Range[],
  grammar: Record<string, string[]>
): Projection[] {
  if (!nodes.length) {
    return [];
  }
  const node = nodes[0];
  const queries = recurseToRoot(node.node).flatMap((x) => {
    const symbol = x.symbol || x.parent?.symbol;
    const symbolString = symbol as unknown as string;
    if (!symbol || !x.raw) {
      return [];
    }
    const temp: (string | number)[][] = [
      [`${symbolString}___key`],
      // [symbolString, x.raw],
    ];
    const idx = (grammar[symbolString] || []).findIndex(
      (rule) => rule === x.childRule
    );
    if (!isNaN(idx) && idx >= 0) {
      temp.push([symbolString, idx]);
    }

    return temp;
  });
  return dedup(queries).map((query) => ({
    type: "inline",
    mode: "replace",
    query: { type: "index", query },
    projection: (props) => (
      <div style={{ background: "green" }}>{props.currentValue}</div>
    ),
    name: "ASD",
    hasInternalState: false,
  })) as Projection[];
}

function keyPathToNode(
  keyPath: (string | number)[],
  root: TraceryNode,
  grammar: Record<string, string[]>
) {
  const nodes = getAllNodes(root);
  if (keyPath.length === 1) {
    const key = `${keyPath[0]}`.split("___")[0];
    return nodes.find((node) => (node.symbol as unknown as string) === key);
  }
  // console.log(keyPath);
  const value = grammar[keyPath[0]]?.at(keyPath[1] as number);
  // console.log(nodes, value, "here");
  return nodes.find((node) => node.raw === value);
}

function TraceryExample() {
  const [currentCode, setCurrentCode] = useState(initialCode);
  const [selectedNodes, setSelectedNodes] = useState<string[]>([]);
  const [keyPath, setKeyPath] = useState<(string | number)[]>([]);
  const [roots, setRoots] = useState<TraceryNode[]>([]);
  const grammar = simpleParse(currentCode, {});
  useEffect(() => {
    setRoots(generateRoots(currentCode));
  }, []);
  // const unpeeledRoot = unpeelRoot(roots);
  const availableSymbols = roots.flatMap((root) =>
    Object.keys(root.grammar.symbols || {})
  );
  console.log(availableSymbols);
  const ranges = roots.length ? computeRanges(roots[0]) : [];
  function clickNode(node: TraceryNode) {
    const nodeId = node.id;
    setSelectedNodes([nodeId as string]);
  }

  const txt = roots.length ? roots[0].finishedText || "" : "";
  const materializedNodes = ranges.filter(({ node }) =>
    selectedNodes.includes(node.id)
  );
  // const cutPoints = materializedNodes.flatMap(({ from, to }) => [from, to]);
  // const slices = recursiveSlice(txt, cutPoints);

  useEffect(() => {
    if (!roots.length) {
      return;
    }
    const targetedNode = keyPathToNode(keyPath, roots[0], grammar);
    console.log("targeted node", targetedNode);
    setSelectedNodes(targetedNode ? [targetedNode?.id] : []);
  }, [keyPath]);

  return (
    <div className="flex-down">
      {/* {roots.length && (
        <div>
          <WordVisualization node={roots[0]} />
        </div>
      )} */}
      <div>
        <h3>
          Output X{" "}
          <button onClick={() => setRoots(generateRoots(currentCode))}>
            Regenerate
          </button>
        </h3>
        <h1>
          <div>{txt}</div>
          <div></div>
        </h1>
      </div>
      {roots.length && (
        <div>
          <TraceryCascadeVis
            node={roots[0]}
            first={true}
            selectedNodes={selectedNodes}
            onClick={(node) => clickNode(node)}
          />
        </div>
      )}
      <Editor
        schema={TracerySchema}
        code={currentCode}
        onChange={(x) => setCurrentCode(x)}
        height={"800px"}
        onTargetNodeChanged={(newKeyPath) => setKeyPath(newKeyPath)}
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
                  {availableSymbols.map((key) => (
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
          // {
          //   type: "tooltip",
          //   query: {
          //     type: "function",
          //     query: (val, type) => {
          //       return "PropertyName" === type && unpeeledRoot[maybeTrim(val)];
          //     },
          //   },
          //   name: "TraceryEditor2",
          //   projection: (props) => {
          //     const key = `${props.keyPath[0]}`.split("___")[0];
          //     if (unpeeledRoot[key]) {
          //       return (
          //         <div>
          //           <TraceryCascadeVis
          //             selectedNodes={selectedNodes}
          //             node={unpeeledRoot[key]}
          //             first={false}
          //             onClick={(node) => clickNode(node)}
          //           />
          //         </div>
          //       );
          //     }
          //     return <div></div>;
          //   },
          // },
          ...assembleHighlight(materializedNodes, grammar),
        ]}
      />
    </div>
  );
}

export default TraceryExample;
