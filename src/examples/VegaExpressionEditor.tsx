import * as React from "react";
import { useEffect, useRef, useState } from "react";

import { javascript } from "@codemirror/lang-javascript";
import { Compartment } from "@codemirror/state";
import { basicSetup } from "codemirror";
import { EditorView, ViewUpdate } from "@codemirror/view";
import { EditorState } from "@codemirror/state";
import { tags } from "@lezer/highlight";
import { HighlightStyle } from "@codemirror/language";
import { syntaxHighlighting } from "@codemirror/language";

import * as vegaExpression from "vega-expression";

import { walk } from "estree-walker";

import {
  autocompletion,
  CompletionSource,
  snippet,
} from "@codemirror/autocomplete";

import { simpleUpdate } from "../lib/utils";

let myTheme = EditorView.theme({
  "&": { backgroundColor: "white" },

  "&.cm-focused .cm-selectionBackground, ::selection": {
    backgroundColor: "white",
  },
  ".cm-activeLine": { backgroundColor: "white" },
  ".cm-gutters": { display: "none" },
});

const languageConf = new Compartment();
export type SchemaMap = Record<string, any>;

function tryExpression(code: string, signals: string[]): null | string {
  const signalSet = new Set(signals);
  try {
    walk(vegaExpression.parseExpression(code), {
      enter(node, parent) {
        const parentIsProperty = parent && parent.type === "MemberExpression";
        if (
          node.type === "Identifier" &&
          !parentIsProperty && // to catch the padding.top type cases
          !(termSet.has(node.name) || signalSet.has(node.name))
        ) {
          throw new Error(`${node.name} is not a recongized keyword`);
        }
      },
    });
  } catch (e) {
    return `${e}`;
  }
  return null;
}

export default function Editor(props: {
  onChange: (code: string) => void;
  code: string;
  terms: string[];
  onError: (errorMessage: string | null) => void;
}) {
  const { code, onChange, terms, onError } = props;
  const cmParent = useRef<HTMLDivElement>(null);

  const [view, setView] = useState<EditorView | null>(null);

  // primary effect, initialize the editor etc
  useEffect(() => {
    const localExtension = EditorView.updateListener.of((v: ViewUpdate) => {
      if (v.docChanged) {
        const newCode = v.state.doc.toString();
        onChange(newCode);

        onError(tryExpression(newCode, props.terms));
      }
    });
    const editorState = EditorState.create({
      extensions: [
        basicSetup,
        // languageConf.of(javascript({ jsx: false, typescript: false })),
        syntaxHighlighting(highlight, { fallback: true }),
        myTheme,
        localExtension,
        autocomplete(terms),
      ],
      doc: code,
    })!;
    const view = new EditorView({
      state: editorState,
      parent: cmParent.current!,
    });
    setView(view);
    return () => view.destroy();
    // eslint-disable-next-line
  }, []);

  useEffect(() => {
    if (view && view.state.doc.toString() !== code) {
      simpleUpdate(view, 0, view.state.doc.length, code);
    }
  }, [code, view]);
  return (
    <div className="editor-container">
      <div ref={cmParent} />
    </div>
  );
}

function from(list: string[]): CompletionSource {
  return (cx) => {
    const word = cx.matchBefore(/\w+$/);
    if (!word && !cx.explicit) {
      return null;
    }

    return {
      from: word ? word.from : cx.pos,
      options: [...list, ...terms].map((label) => ({
        label,
        apply: snippet(label),
      })),
      span: /\w*/,
    };
  };
}

function autocomplete(words: string[]) {
  return autocompletion({ activateOnTyping: true, override: [from(words)] });
}

const terms = [
  "E",
  "LN10",
  "LN2",
  "LOG10E",
  "LOG2E",
  "MAX_VALUE",
  "MIN_VALUE",
  "NaN",
  "PI",
  "SQRT1_2",
  "SQRT2",
  "abs",
  "acos",
  "asin",
  "atan",
  "atan2",
  "bandspace",
  "bandwidth",
  "ceil",
  "clamp",
  "clampRange",
  "containerSize",
  "contrast",
  "copy",
  "cos",
  "cumulativeLogNormal",
  "cumulativeNormal",
  "cumulativeUniform",
  "data",
  "date",
  "datetime",
  "datum",
  "day",
  "dayAbbrevFormat",
  "dayFormat",
  "dayofyear",
  "debug",
  "densityLogNormal",
  "densityNormal",
  "densityUniform",
  "domain",
  "event",
  "exp",
  "extent",
  "floor",
  "format",
  "geoArea",
  "geoBounds",
  "geoCentroid",
  "gradient",
  "group",
  "hcl",
  "hours",
  "hsl",
  "if",
  "inScope",
  "indata",
  "indexof",
  "indexof",
  "info",
  "inrange",
  "invert",
  "isArray",
  "isBoolean",
  "isDate",
  "isDefined",
  "isFinite",
  "isNaN",
  "isNumber",
  "isObject",
  "isRegExp",
  "isString",
  "isValid",
  "item",
  "join",
  "lab",
  "lastindexof",
  "lastindexof",
  "length",
  "length",
  "lerp",
  "log",
  "lower",
  "luminance",
  "max",
  "merge",
  "milliseconds",
  "min",
  "minutes",
  "month",
  "monthAbbrevFormat",
  "monthFormat",
  "now",
  "pad",
  "panLinear",
  "panLog",
  "panPow",
  "panSymlog",
  "parseFloat",
  "parseInt",
  "peek",
  "pinchAngle",
  "pinchDistance",
  "pluck",
  "pow",
  "quantileLogNormal",
  "quantileNormal",
  "quantileUniform",
  "quarter",
  "random",
  "range",
  "regexp",
  "replace",
  "reverse",
  "rgb",
  "round",
  "sampleLogNormal",
  "sampleNormal",
  "sampleUniform",
  "scale",
  "screen",
  "seconds",
  "sequence",
  "signal names",
  "sin",
  "slice",
  "slice",
  "span",
  "split",
  "sqrt",
  "substring",
  "tan",
  "test",
  "time",
  "timeFormat",
  "timeOffset",
  "timeParse",
  "timeSequence",
  "timeUnitSpecifier",
  "timezoneoffset",
  "toBoolean",
  "toDate",
  "toNumber",
  "toString",
  "treeAncestors",
  "treePath",
  "trim",
  "truncate",
  "upper",
  "utc",
  "utcFormat",
  "utcOffset",
  "utcParse",
  "utcSequence",
  "utcdate",
  "utcday",
  "utcdayofyear",
  "utchours",
  "utcmilliseconds",
  "utcminutes",
  "utcmonth",
  "utcquarter",
  "utcseconds",
  "utcweek",
  "utcyear",
  "warn",
  "week",
  "windowSize",
  "x",
  "xy",
  "y",
  "year",
  "zoomLinear",
  "zoomLog",
  "zoomPow",
  "zoomSymlog",
];

const termSet = new Set(terms);

const blue = "#0551A5";
const green = "#17885C";
const red = "#A21615";
const black = "#000";
const highlight = HighlightStyle.define([
  // { tag: tags.string, color: blue },
  // { tag: tags.number, color: green },
  // { tag: tags.bool, color: blue },
  // { tag: tags.propertyName, color: red },
  // { tag: tags.null, color: blue },
  // { tag: tags.separator, color: black },
  // { tag: tags.squareBracket, color: black },
  // { tag: tags.brace, color: black },
  // { tag: tags.literal, color: "pink" },
  { tag: tags.comment, color: "#fc6" },
  { tag: tags.name, color: "#fc6" },
  { tag: tags.typeName, color: "#fc6" },
  { tag: tags.propertyName, color: "#fc6" },
  { tag: tags.literal, color: "#fc6" },
  { tag: tags.string, color: "#fc6" },
  { tag: tags.number, color: "#fc6" },
  { tag: tags.operator, color: "#fc6" },
  { tag: tags.punctuation, color: "#fc6" },
  { tag: tags.bracket, color: "#fc6" },
  { tag: tags.keyword, color: "#f00" },
]);
