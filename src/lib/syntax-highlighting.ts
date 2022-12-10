import { tags } from "@lezer/highlight";
import { HighlightStyle } from "@codemirror/language";

const blue = "#0551A5";
const green = "#17885C";
const red = "#A21615";
const black = "#000";
export default HighlightStyle.define([
  { tag: tags.string, color: blue },
  { tag: tags.number, color: green },
  { tag: tags.bool, color: blue },
  { tag: tags.propertyName, color: red },
  { tag: tags.null, color: blue },
  { tag: tags.separator, color: black },
  { tag: tags.squareBracket, color: black },
  { tag: tags.brace, color: black },
]);
