import { useState, useEffect, useCallback } from "react";
import {
  StandardBundle,
  Projection,
  utils,
  Editor,
} from "../../../../packages/prong-editor/src/index";
import tracery, { generate, TraceryNode, modifierNames } from "./tracery";
import "../stylesheets/tracery-example.css";
import InsertRandomWord from "./RandomWord";

import TracerySchema from "../constants/tracery-schema.json";

const landScape = `
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

const vlhccCode = `
{
  "origin": [ "Reimagining #topic# with #adjective# #element#", "Exploring #aspect# in #domain# with #tool#", 
    "Enhancing #topic# using #element# in #domain#", "Investigating #topic# in #domain# with #tool#", 
    "The Impact of #element# on #topic# in #domain#"],
  "topic": [ "End-user programming", "Debugger Usage", "Visual Language Design", "Educational Tangibles", 
    "Human-Centric Computing", "Data Visualization", "Paper-Based Tangibles", "Low-Code Notebooks", 
    "Interactive Data Analysis", "Collaborative Learning", "Data Wrangling Pipelines", 
    "Programming Concepts", "Programming Environments", "Data Science Communication"],
  "adjective": [ "Innovative", "Effective", "Transformative", "User-Centered", 
    "Inclusive", "Adaptive", "Responsive", "Data-Driven", "Collaborative", "Streamlined", "Intuitive", "Accessible"],
  "element": [ "IoT", "Tangible Programming", "AI-Assisted", "Probabilistic Programming", 
    "Visual Notations", "Low-Code Tools", "API Design", "Visual Language", "Layout Generation", "Block-based Learning"],
  "aspect": [ "Usability", "Accessibility", "Collaboration", "Innovation", "Debugging", "Learning", 
    "Interactivity", "Efficiency", "Effectiveness", "Communication", "Problem Solving"],
  "domain": [ "Education", "Healthcare", "Data Science", "Software Development", 
    "Collaborative Environments", "Data Analysis", "Programming Education", "Tech Hiring", "Document Authoring", "Software IDEs"],
  "tool": [ "Visual Languages", "Tangible Programming", "Functional Debuggers", 
    "AI-Generated Tools", "Layout Generation Techniques", "Interactive Notebooks", "REST API Practices", 
    "Educational Tools", "Data Wrangling Support", "Low-Code Platforms"]
}
`;

const obliqueStrategies = `
{
  "origin": ["Consider the #concept# of #noun#.", "Emulate the process of #action# while #mood#.", 
    "Take inspiration from #source# and apply it to #context#.", "Work with #noun.s# to explore #concept#.", 
    "Incorporate elements of #adjective# #noun.s# into your #medium#.", "Transform #noun# into a #noun#.", 
    "Distill your idea into a single #noun#.", "Combine #adjective# #noun.s# with #noun.s#.", 
    "Imagine a world where #noun.s# are #adjective#.", "Use #noun.a# as a starting point for #noun.a#.",
    "Explore the connection between #noun# and #noun#.", "Embrace the feeling of #emotion# in your #medium#.", 
    "Capture the essence of #noun# in your #medium#.", "Think of #noun# as a metaphor for #concept#.", 
    "Find beauty in the imperfections of #noun#.", "Build a narrative around #noun# and #noun#.", 
    "Express #emotion# through the lens of #noun#.", "Exaggerate #noun# to emphasize #concept#.", 
    "Simplify your approach by focusing on #noun#.", "Create a dialogue between #noun# and #noun#.", 
    "Play with the idea of #concept# using #noun#.", "Imagine your work as a conversation between #noun# and #noun#.", 
    "Seek inspiration from the #noun# of #artist#.", "Experiment with #noun# to convey #emotion#.", 
    "Use #noun# to subvert traditional notions of #noun#.", "Meditate on the relationship between #noun# and #noun#.", 
    "Consider the absence of #noun# in your #medium#.", "Channel the energy of #noun# into your #noun#.", 
    "Find harmony in the juxtaposition of #noun.s# and #noun.s#."],
  "concept": ["chaos", "order", "ambiguity", "serenity", "transition", "contrast", "imperfection", "complexity", 
    "simplicity", "movement", "reflection", "fragmentation", "growth", "decay", "infinity", "chance", 
    "silence", "noise", "light", "shadow"],
  "noun": ["color", "texture", "sound", "shape", "space", "line", "gesture", "form", "pattern", "time", 
    "emotion", "memory", "dream", "journey", "identity", "landscape", "architecture", "nature", "technology", "ritual"],
  "action": ["exploring", "contemplating", "evolving", "disrupting", "assembling", "deconstructing", 
    "repeating", "transforming", "absorbing", "observing", "connecting", "revealing", "concealing", 
    "reimagining", "collaging", "juxtaposing", "emulating", "transcending", "harmonizing", "dissonating"],
  "mood": ["intently", "playfully", "seriously", "subtly", "boldly", "quietly", "chaotically", 
    "harmoniously", "abstractly", "vividly", "ethereally", "thoughtfully", "dreamily", "meditatively", 
    "reflectively", "urgently", "delicately", "energetically", "passionately"],
  "source": ["nature", "literature", "architecture", "music", "science", "philosophy", "dreams", "mythology", 
    "history", "technology", "culture", "emotion", "randomness", "chaos", "serendipity", "silence"],
  "context": ["your current project", "your daily life", "your surroundings", "the world at large", "the creative process", 
    "your emotions", "your dreams", "your memories", "your relationships", "the future", "the past", "the present moment"],
  "adjective": ["subtle", "bold", "ambiguous", "vibrant", "minimalist", "experimental", "nostalgic", "futuristic",
    "playful", "surreal", "provocative", "evocative", "transcendent", "ethereal", "disruptive", "resonant", "immersive", "enigmatic", "dynamic"],
  "medium": ["art", "music", "writing", "design", "film", "photography", "architecture", "dance", 
    "performance", "installation", "technology", "interaction", "craft", "sound"],
  "emotion": ["awe", "wonder", "melancholy", "euphoria", "desolation", "hope", "doubt", "excitement", 
    "reflection", "serenity", "fear", "curiosity", "tranquility", "passion", "intimacy", "confusion", "inspiration", "rebellion", "reverence", "nostalgia"],
  "artist": ["Da Vinci", "Kandinsky", "Bach", "Woolf", "Einstein", "Kubrick", "O'Keeffe", "Tesla", 
    "Picasso", "Kafka", "Dali", "Hemingway", "Tarkovsky", "Frida", "Wright", "Hitchcock", "Warhol", "Nietzsche", "Beethoven"]
}
`;

const codeOptions = { vlhccCode, landScape, obliqueStrategies };
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
  const children = node.children || [] || node.preactions;
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
      <span>{node.childRule ? `${node.raw}→` : ""}</span>
      {<div>{node.finishedText}</div>}
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
    grammar: tracery.createGrammar(utils.simpleParse(currentCode, {})),
    generatedRoots: [],
  });
}

function getAllNodes(root: TraceryNode) {
  const allNodes = [];
  const queue = [root];
  while (queue.length) {
    const current = queue.shift()!;
    allNodes.push(current);
    (current.children || (current.preactions as any[]) || []).forEach((child) =>
      queue.push(child)
    );
  }
  return allNodes;
}

type Range = {
  node: TraceryNode;
  from: number;
  to: number;
  text: string;
  id: string;
  children: Range[];
  parent: Range | undefined;
};
function computeRanges(node: TraceryNode, from?: number, to?: number): Range[] {
  let offset = 0;
  const selfLength = (node.finishedText || "").length;
  const target: Range = {
    node,
    from: from || 0,
    to: to || selfLength,
    text: node.finishedText,
    id: node.id,
    children: [],
    parent: undefined,
  };

  const targets = [
    ...(node.children || []),
    ...(node.preactions || []).map((node) => node.ruleNode).filter((x) => x),
  ];
  const children = targets.reduce((acc: Range[], child) => {
    const childLength: number = (child.finishedText || "").length;
    const result = computeRanges(
      child,
      (from || 0) + offset,
      (from || 0) + offset + childLength
    );
    if (result.length) {
      target.children.push(result.at(-1)!);
    }
    offset += childLength;
    result.forEach((x: any) => acc.push(x));
    return acc;
  }, []);
  return children.concat([target]);
}
const addParentsToRanges = (node: Range) => {
  node.children.forEach((child) => {
    child.parent = node;
    addParentsToRanges(child);
  });
};

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
  range: Range,
  grammar: Record<string, string[]>
): { keyPath: (string | number)[]; range: Range }[] {
  const symbol = range.node.symbol as unknown as string;
  if (!(symbol && range.node.childRule)) {
    return [];
  }
  const index = (grammar[symbol] || []).findIndex(
    (x) => x === range.node.childRule
  );
  // used to also grab the key, but that adds incorrect coloring
  if (!isNaN(index) && index > -1) {
    return [{ keyPath: [symbol, index], range }];
  } else {
    return [];
  }
}

const insertInto = (str: string, idx: number, subStr: string) => {
  return `${str.slice(0, idx)}${subStr}${str.slice(idx)}`;
};

const deleteAt = (str: string, idx: number) => {
  return str.substring(0, idx) + str.substring(idx + 1, str.length);
};

const swapAt = (str: string, idx: number, subStr: string) => {
  return str.slice(0, idx) + subStr + str.slice(idx + subStr.length);
};

function unPeelRoot(root: TraceryNode[]) {
  return root.length === 0
    ? {}
    : Object.fromEntries(
        getAllNodes(root[0])
          .filter((x) => x.symbol)
          .map((x) => [x.symbol, x])
      );
}

const pick = (arr: any[]) => arr[Math.floor(Math.random())];
// https://blixtdev.com/how-to-use-contenteditable-with-react/
const Editable = (props: {
  txt: string;
  setTxt: (txt: string) => void;
  outOfSync: boolean;
}) => {
  const { outOfSync, setTxt, txt } = props;
  const [content, setContent] = useState(txt);
  useEffect(() => {
    setContent(txt);
  }, [txt, outOfSync]);
  const onContentBlur = useCallback(() => {
    if (outOfSync) {
      setTxt(txt);
      setContent(txt);
    } else {
      // small bug: every time there is an update focus is lost
      // setTxt(evt.currentTarget.innerHTML);
      // setContent(evt.currentTarget.innerHTML);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="tracery-bdx">
      <div
        contentEditable
        onBlur={onContentBlur}
        onInput={(e) => {
          const val = `${e.currentTarget.textContent}`;
          setContent(val);
          setTxt(val);
        }}
        dangerouslySetInnerHTML={{
          __html: content,
        }}
      />
      {outOfSync && <div>Out of Sync</div>}
    </div>
  );
};

const climbToSymbol = (node: TraceryNode): TraceryNode | undefined =>
  node.symbol ? node : node.parent ? climbToSymbol(node.parent) : undefined;

function manualStratification(
  newString: string,
  oldString: string,
  oldCode: string,
  randomKey: string
) {
  if (newString.length < oldString.length) {
    return;
  }
  const newRoots = generateRoots(oldCode, randomKey);
  const ranges = newRoots.length ? computeRanges(newRoots[0]) : [];
  const idx = newString.split("").findIndex((el, idx) => el !== oldString[idx]);
  const isSwap = newString.length === oldString.length;
  const newChar = newString[idx];

  const minTarget = ranges.reduce((acc: Range | undefined, row) => {
    const insideRange = row.from <= idx - 1 && row.to >= idx;
    if (!acc) {
      return insideRange ? row : acc;
    }
    // not sure about this soft bound
    const width = row.to - row.from;
    const oldWidth = acc.to - acc.to;
    if (insideRange) {
      return width <= oldWidth ? row : acc;
    }
    return acc;
  }, undefined);
  if (!minTarget || !ranges.length) {
    console.log("whoops could not find anything");
    return;
  }
  // there's clearly a bug here but im not sure what it is,something to do with tracery
  const raw =
    ranges[0]?.node?.grammar?.raw ||
    // @ts-ignore
    ranges[0]?.node?.node?.grammar?.raw;
  const symbolTarget = climbToSymbol(minTarget.node);
  if (!symbolTarget) {
    console.log("no symbol");
    return;
  }
  const symbol = symbolTarget.symbol as unknown as string | undefined;
  const row = raw[symbol as any];
  const oldVal = minTarget.text;
  const posInOldRow = row.findIndex((x: string) => x === oldVal);
  if (posInOldRow === -1) {
    return;
  }
  const slicePoint = idx - minTarget.from;
  const newText = isSwap
    ? `"${swapAt(minTarget.text, slicePoint, newChar)}"`
    : `"${insertInto(minTarget.text, slicePoint, newChar)}"`;
  return utils.setIn([symbol, posInOldRow], newText, oldCode);
}

function getChange(
  newString: string,
  oldString: string
): { isSwap: boolean; isDelete: boolean; newSub: string | undefined } {
  if (newString.length < oldString.length) {
    return { isSwap: false, isDelete: true, newSub: undefined };
  }
  const isSwap = newString.length === oldString.length;
  if (isSwap) {
    const idx = newString
      .split("")
      .findIndex((el, idx) => el !== oldString[idx]);
    return { isSwap, isDelete: false, newSub: newString[idx] };
  }
  for (let idx = 0; idx < newString.length; idx++) {
    for (let jdx = idx - 1; jdx < newString.length; jdx++) {
      const newVersion = newString.slice(0, idx) + newString.slice(jdx);
      if (newVersion === oldString) {
        return {
          isSwap: false,
          isDelete: false,
          newSub: newString.slice(idx, jdx),
        };
      }
    }
  }
  return { isSwap: false, isDelete: false, newSub: newString };
}

function synthChange(
  newString: string,
  oldString: string,
  oldCode: string,
  randomKey: string,
  setCode: (code: string | false) => void
) {
  const parsedObj = utils.simpleParse(oldCode, false);
  if (!parsedObj) {
    console.log("bailed");
    return;
  }
  let success = false;
  const { isDelete, newSub, isSwap } = getChange(newString, oldString);
  Object.entries(parsedObj as Record<string, string[]>).forEach(
    ([key, values]) => {
      values.forEach((val, idx) => {
        val.split("").forEach((_, jdx) => {
          if (success) {
            return;
          }
          const newVal = isDelete
            ? deleteAt(val, jdx)
            : isSwap
            ? swapAt(val, jdx, `${newSub}`)
            : insertInto(val, jdx, `${newSub}`);
          const newCode = utils.setIn([key, idx], `"${newVal}"`, oldCode);
          const newRoots = generateRoots(newCode, randomKey);
          if (newRoots.length) {
            const txt = newRoots.length ? newRoots[0].finishedText || "" : "";
            if (txt.toLowerCase() === newString.toLowerCase()) {
              success = true;
              setCode(newCode);
            }
          }
        });
      });
    }
  );
  if (!success) {
    let result: any = false;
    try {
      result = manualStratification(newString, oldString, oldCode, randomKey);
    } catch (e) {
      console.log(e);
    }
    if (result) {
      console.log("manual worked");
      setCode(result);
    } else {
      setCode(false);
      console.log("fail");
    }
  }
}

function findMinNode(rootRange: Range, idx: number): Range | false {
  if (!rootRange.children) {
    return rootRange.from <= idx && rootRange.to >= idx ? rootRange : false;
  }
  let bestScore = Infinity;
  let bestChoice = rootRange;
  [
    ...rootRange.children,
    ...(rootRange.node.preactions || []).map(
      (node) => node.node as any as Range
    ),
  ].forEach((child) => {
    const bestInSubTree = findMinNode(child, idx);
    if (!bestInSubTree) {
      return;
    }
    if (bestInSubTree.from <= idx && bestInSubTree.to > idx) {
      const width = bestInSubTree.to - bestInSubTree.from;
      if (width < bestScore) {
        bestScore = width;
        bestChoice = bestInSubTree;
      }
    }
  });

  return bestChoice;
}

const findPath = (
  node: Range,
  grammar: Record<string, string[]>
): [string, number] | false => {
  const rule = node.node.parent.childRule;
  let path: [string, number] | false = false;
  Object.entries(grammar).forEach(([key, values]) => {
    const idx = values.findIndex((x) => x === rule);
    if (idx > -1) {
      path = [key, idx];
    }
  });
  return path;
};

function TraceryExample() {
  const [currentCode, setCurrentCode] = useState(codeOptions.vlhccCode);
  const [selectedNodes, setSelectedNodes] = useState<string[]>([]);
  const [keyPath, setKeyPath] = useState<(string | number)[]>([]);
  const [outOfSync, setOutOfSync] = useState<boolean>(false);
  const [roots, setRoots] = useState<TraceryNode[]>([]);
  const [randomKey, setRandomKey] = useState("tracery is a fun time");
  const unpeeledRoot = unPeelRoot(roots);
  const grammar = utils.simpleParse(currentCode, {});
  useEffect(() => {
    setRoots(generateRoots(currentCode, randomKey));
  }, [currentCode, randomKey]);

  function clickNode(node: TraceryNode) {
    const nodeId = node.id;
    setSelectedNodes(selectedNodes.includes(nodeId) ? [] : [nodeId]);
  }

  useEffect(() => {
    if (!roots.length) {
      return;
    }
    const targetedNode = keyPathToNode(keyPath, roots[0], grammar);
    setSelectedNodes(targetedNode ? [targetedNode?.id] : []);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [keyPath]);

  const availableSymbols = roots.flatMap((root) =>
    Object.keys(root.grammar.symbols || {})
  );

  const ranges = roots.length ? computeRanges(roots[0]) : [];
  ranges.forEach((x) => addParentsToRanges(x));
  const inUseKeys = ranges
    .flatMap((range) => nodeToKeyPath(range, grammar))
    .filter((x) => x);
  const txt = roots.length ? roots[0].finishedText || "" : "";

  const colorMap = {};
  let colorTicker = 1;
  const charColoring =
    (ranges.length > 1 &&
      txt.split("").map((char, idx) => {
        // check if there is a min node
        const minNode = findMinNode(ranges.at(-1)!, idx);
        if (!minNode) {
          return { char, idx, colorIdx: -1 };
        }
        // check if we can figure out a path from the min node
        // note this has a bug: duplicate rules will not be colored correctly
        const path = findPath(minNode, grammar);
        if (!path) {
          return { char, idx, colorIdx: -1 };
        }
        // create a color for this path if there isn't one
        if (!(`${path[0]}-${path[1]}` in colorMap)) {
          colorMap[`${path[0]}-${path[1]}`] = colorTicker;
          colorTicker += colorTicker % 20;
        }

        return { char, idx, colorIdx: colorMap[`${path[0]}-${path[1]}`] };
      })) ||
    [];

  return (
    <div className="flex-down tracery-app-root">
      <div>
        <h1>
          <div className="tracery-bdx tracery-bdx-container">
            {charColoring.map((x) => (
              <span
                key={x.idx}
                className={`tracery-in-use tracery-in-use-${x.colorIdx}`}
              >
                {x.char}
              </span>
            ))}
          </div>
          <Editable
            txt={txt}
            outOfSync={outOfSync}
            setTxt={(newTargetString) => {
              synthChange(
                newTargetString,
                txt,
                currentCode,
                randomKey,
                (code) => {
                  if (code) {
                    setCurrentCode(code);
                    setOutOfSync(false);
                  } else {
                    console.log("reject");
                    setOutOfSync(true);
                    setCurrentCode(currentCode);
                  }
                }
              );
            }}
          />
          <div></div>
        </h1>
      </div>
      <div className="flex">
        <button
          onClick={() => {
            setRandomKey(`${Math.random()}`);
            setRoots(generateRoots(currentCode, randomKey));
          }}
        >
          Update RandomSeed
        </button>

        {outOfSync && (
          <button
            onClick={() => {
              setOutOfSync(false);
            }}
          >
            Restore
          </button>
        )}
        {Object.keys(codeOptions).map((key) => (
          <button onClick={() => setCurrentCode(codeOptions[key])} key={key}>
            {key}
          </button>
        ))}
      </div>
      {/* {roots.length && (
        <div>
          <TraceryCascadeVis
            node={roots[0]}
            first={true}
            selectedNodes={selectedNodes}
            onClick={(node) => clickNode(node)}
          />
        </div>
      )} */}
      <Editor
        schema={TracerySchema}
        code={currentCode}
        onChange={(x) => setCurrentCode(x)}
        height={"800px"}
        onTargetNodeChanged={(newKeyPath) => setKeyPath(newKeyPath)}
        projections={
          [
            StandardBundle.CleanUp,
            InsertRandomWord,
            {
              type: "tooltip",
              query: {
                type: "function",
                query: (
                  value: string,
                  _nodeType: any,
                  _keyPath: any,
                  cursorPos: number,
                  nodePos: { start: number; end: number }
                ) => {
                  const splitPoint = cursorPos - nodePos.start;
                  const count = value
                    .slice(splitPoint)
                    .split("")
                    .reduce((acc: number, x) => acc + (x === "#" ? 1 : 0), 0);
                  const insideKey = count % 2 === 1;
                  return insideKey;
                },
              },
              name: "modifiers",
              group: "Modifiers",
              projection: (props) => {
                const current = props.currentValue;
                const cursorPos =
                  props.cursorPositions[0].from - props.node.from;
                const idx =
                  (current.lastIndexOf("#", cursorPos - 1) as number) + 1;
                const jdx = current.indexOf("#", cursorPos);

                const target = current.substring(idx, jdx);
                const [pureTarget, ...modifiers] = target.split(".");

                return (
                  <div>
                    {modifierNames.map((name) => {
                      const alreadyPresent = modifiers.find((x) => x === name);
                      return (
                        <button
                          onClick={() => {
                            const newModifiers = (
                              alreadyPresent
                                ? modifiers.filter((x) => x !== name)
                                : [...modifiers, name]
                            ).join(".");
                            const prefix = newModifiers.length ? "." : "";
                            const newTarget = `${pureTarget}${prefix}${newModifiers}`;
                            const beforeSplit = current.substring(0, idx);
                            const afterSplit = current.substring(jdx);
                            const newCode = `${beforeSplit}${newTarget}${afterSplit}`;
                            props.setCode(
                              utils.setIn(
                                props.keyPath,
                                newCode,
                                props.fullCode
                              )
                            );
                          }}
                          key={name}
                        >
                          {alreadyPresent ? "Remove" : "Add"} {name}
                        </button>
                      );
                    })}
                  </div>
                );
              },
            },
            {
              type: "tooltip",
              query: {
                type: "function",
                query: (val, type) =>
                  "PropertyName" === type && unpeeledRoot[utils.maybeTrim(val)],
              },
              name: "TraceryEditor",
              group: "Tracery Editor",
              projection: (props) => {
                const key = `${props.keyPath[0]}`.split("___")[0];
                if (unpeeledRoot[key]) {
                  return (
                    <div>
                      <TraceryCascadeVis
                        selectedNodes={selectedNodes}
                        node={unpeeledRoot[key]}
                        first={false}
                        onClick={(node) => clickNode(node)}
                      />
                    </div>
                  );
                }
                return <div></div>;
              },
            },
            {
              type: "tooltip",
              query: {
                type: "nodeType",
                query: ["Number", "String", "Null", "False", "True"],
              },
              name: "ref insert",
              group: "Insert reference to",
              projection: (props) => {
                // todo this part should turn into an autocomplete right?
                return (
                  <div>
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

            ...inUseKeys.reduce((acc, { keyPath }) => {
              const colorKey = colorMap[`${keyPath[0]}-${keyPath[1]}`];
              if (!colorKey) {
                return acc;
              }
              acc.push({
                type: "highlight",
                name: "highlight-connector",
                query: {
                  type: "index",
                  query: keyPath,
                },
                class: `tracery-in-use  tracery-in-use-${colorKey}`,
              });
              return acc;
            }, []),
          ] as Projection[]
        }
      />
    </div>
  );
}

export default TraceryExample;
