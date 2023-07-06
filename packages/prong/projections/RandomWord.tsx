import React from "react";
import { Projection } from "../lib/projections";
import { setIn } from "../lib/utils";
import friendlyWords from "friendly-words";

const titleCase = (word: string) => `${word[0].toUpperCase()}${word.slice(1)}`;
const pick = (arr: any[]) => arr[Math.floor(Math.random() * arr.length)];

// borrowed from the p5 editor
function generateName() {
  const adj = pick(friendlyWords.predicates);
  const obj = titleCase(pick(friendlyWords.objects));
  return `${adj}${obj}`;
}

const RandomWordProjection: Projection = {
  query: { type: "regex", query: /".*"/ },
  type: "tooltip",
  projection: ({ keyPath, currentValue, setCode, fullCode }) => {
    return (
      <button
        onClick={() => setCode(setIn(keyPath, `"${generateName()}"`, fullCode))}
      >
        Random Word
      </button>
    );
  },
  name: "Utils",
};

export default RandomWordProjection;
