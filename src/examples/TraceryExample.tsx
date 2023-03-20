import React, { useState, useEffect } from "react";
import StandardProjections from "../projections/standard-bundle";
import tracery, { generate, TraceryNode } from "./tracery";
import { simpleParse } from "../lib/utils";
import "../stylesheets/tracery-example.css";
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
  node: TraceryNode;
  first: boolean;
  onClick: (node: TraceryNode) => void;
  selectedNodes: string[];
}) {
  const { node, first, onClick, selectedNodes } = props;
  const children = node.children || [];
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
      {node.childRule} {"->"} {<div>{node.finishedText}</div>}
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

function generateRoots(currentCode: string, randomKey: string) {
  return generate(false, {
    randomKey,
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
    type: "highlight",
    query: { type: "index", query },
    class: "example-highlighter",
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
  const value = grammar[keyPath[0]]?.at(keyPath[1] as number);
  return nodes.find((node) => node.raw === value);
}

function nodeToKeyPath(
  node: TraceryNode,
  grammar: Record<string, string[]>
): (string | number)[][] {
  const symbol = node.symbol as unknown as string;
  if (!(symbol && node.childRule)) {
    return [];
  }
  const index = (grammar[symbol] || []).findIndex((x) => x === node.childRule);
  if (!isNaN(index) && index > -1) {
    return [[symbol, index], [`${symbol}___key`]];
  } else {
    return [];
  }
}

const insertInto = (str: string, idx: number, subStr: string) => {
  return `${str.slice(0, idx)}${subStr}${str.slice(idx)}`;
};

const pick = (arr: any[]) => arr[Math.floor(Math.random())];

function TraceryExample() {
  const [currentCode, setCurrentCode] = useState(initialCode);
  const [selectedNodes, setSelectedNodes] = useState<string[]>([]);
  const [keyPath, setKeyPath] = useState<(string | number)[]>([]);
  const [roots, setRoots] = useState<TraceryNode[]>([]);
  const [randomKey, setRandomKey] = useState("tracery is a fun time");
  const grammar = simpleParse(currentCode, {});
  useEffect(() => {
    setRoots(generateRoots(currentCode, randomKey));
  }, [currentCode]);

  function clickNode(node: TraceryNode) {
    const nodeId = node.id;
    setSelectedNodes(selectedNodes.includes(nodeId) ? [] : [nodeId as string]);
  }

  useEffect(() => {
    if (!roots.length) {
      return;
    }
    const targetedNode = keyPathToNode(keyPath, roots[0], grammar);
    setSelectedNodes(targetedNode ? [targetedNode?.id] : []);
  }, [keyPath]);

  const availableSymbols = roots.flatMap((root) =>
    Object.keys(root.grammar.symbols || {})
  );

  const ranges = roots.length ? computeRanges(roots[0]) : [];
  const inUseKeys = ranges.flatMap((range) =>
    nodeToKeyPath(range.node, grammar)
  );
  const txt = roots.length ? roots[0].finishedText || "" : "";
  const materializedNodes = ranges.filter(({ node }) =>
    selectedNodes.includes(node.id)
  );

  return (
    <div className="flex-down">
      <div>
        <h1>
          <div>{txt}</div>
          <div></div>
        </h1>
      </div>
      <div>
        <button
          onClick={() => {
            setRandomKey(`${Math.random()}`);
            setRoots(generateRoots(currentCode, randomKey));
          }}
        >
          Update RandomSeed
        </button>
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
        projections={
          [
            ...[
              // BooleanTarget,
              "CleanUp",
              // 'ClickTarget',
              // 'ColorChip',
              // 'ConvertHex',
              "InsertRandomWord",
              // 'TooltipColorNamePicker',
              // 'TooltipHexColorPicker',
            ].map((x) => StandardProjections[x]),
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
                    {availableSymbols.map((key) => (
                      <button
                        key={key}
                        onClick={() => {
                          const cursorPos = props.cursorPositions[0].from;
                          if (!cursorPos) {
                            return;
                          }

                          props.setCode(
                            insertInto(currentCode, cursorPos, `#${key}#`)
                          );
                        }}
                      >
                        {key}
                      </button>
                    ))}
                    <button
                      onClick={() => {
                        const cursorPos = props.cursorPositions[0].from;
                        if (!cursorPos) {
                          return;
                        }
                        const newCode = insertInto(
                          currentCode,
                          cursorPos,
                          `[MY_VARIABLE:#${pick(availableSymbols)}#]`
                        );
                        props.setCode(newCode);
                      }}
                    >
                      Create new context
                    </button>
                  </div>
                );
              },
            },
            ...inUseKeys.map((query) => ({
              type: "highlight",
              query: { type: "index", query },
              class: "tracery-in-use",
            })),

            ...assembleHighlight(materializedNodes, grammar),
          ] as Projection[]
        }
      />
    </div>
  );
}

export default TraceryExample;