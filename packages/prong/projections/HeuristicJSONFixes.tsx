import React from "react";
import { Projection } from "../lib/projections";
import { setIn } from "../lib/utils";

const quotes = new Set(['"', "'"]);
const looksLikeItMightBeAQuotesError = (value: string) => {
  let startsOrEndsWithAQuote = false;
  if (quotes.has(value[0]) || quotes.has(value.at(-1) || "")) {
    startsOrEndsWithAQuote = true;
  }
  return startsOrEndsWithAQuote;
};
const HeuristicJSONFixes: Projection = {
  type: "tooltip",
  name: "Utils",
  projection: (props) => {
    const val = props.currentValue;
    if (looksLikeItMightBeAQuotesError(val)) {
      return (
        <button
          onClick={() => {
            let newVal = val
              .split("")
              .filter((x: string) => !quotes.has(x) && x !== ",")
              .join("");
            newVal = `"${newVal}"`;
            let endsInComma = val.at(-1) === ",";
            if (endsInComma) {
              newVal = `${newVal},`;
            }
            props.setCode(setIn(props.keyPath, newVal, props.fullCode));
          }}
        >
          Fix Quotes
        </button>
      );
    }
    return <></>;
  },
  query: {
    type: "function",
    query: (value, nodeType, keyPath) => {
      if (nodeType === "⚠" && looksLikeItMightBeAQuotesError(value)) {
        return true;
      }
      return false;
    },
  },
};

export default HeuristicJSONFixes;
