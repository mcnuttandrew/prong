import React, { useState } from "react";
import { Projection } from "../lib/projections";
import { colorNames, setIn } from "../lib/utils";

// https://www.w3schools.com/colors/colors_groups.asp

export const colorGroups: Record<string, string[]> = {
  pink: [
    "pink",
    "lightpink",
    "hotpink",
    "deeppink",
    "palevioletred",
    "mediumvioletred",
  ],
  purple: [
    "lavender",
    "thistle",
    "plum",
    "orchid",
    "violet",
    "fuchsia",
    "magenta",
    "mediumorchid",
    "darkorchid",
    "darkviolet",
    "blueviolet",
    "darkmagenta",
    "purple",
    "mediumpurple",
    "mediumslateblue",
    "slateblue",
    "darkslateblue",
    "rebeccapurple",
    "indigo",
  ],
  red: [
    "lightsalmon",
    "salmon",
    "darksalmon",
    "lightcoral",
    "indianred",
    "crimson",
    "red",
    "firebrick",
    "darkred",
  ],
  orange: ["orange", "darkorange", "coral", "tomato", "orangered"],
  yellow: [
    "gold",
    "yellow",
    "lightyellow",
    "lemonchiffon",
    "lightgoldenrodyellow",
    "papayawhip",
    "moccasin",
    "peachpuff",
    "palegoldenrod",
    "khaki",
    "darkkhaki",
  ],
  green: [
    "greenyellow",
    "chartreuse",
    "lawngreen",
    "lime",
    "limegreen",
    "palegreen",
    "lightgreen",
    "mediumspringgreen",
    "springgreen",
    "mediumseagreen",
    "seagreen",
    "forestgreen",
    "green",
    "darkgreen",
    "yellowgreen",
    "olivedrab",
    "darkolivegreen",
    "mediumaquamarine",
    "darkseagreen",
    "lightseagreen",
    "darkcyan",
    "teal",
  ],
  // maybe display cyan as part of blue
  cyan: [
    "aqua",
    "cyan",
    "lightcyan",
    "paleturquoise",
    "aquamarine",
    "turquoise",
    "mediumturquoise",
    "darkturquoise",
  ],
  blue: [
    "cadetblue",
    "steelblue",
    "lightsteelblue",
    "lightblue",
    "powderblue",
    "lightskyblue",
    "skyblue",
    "cornflowerblue",
    "deepskyblue",
    "dodgerblue",
    "royalblue",
    "blue",
    "mediumblue",
    "darkblue",
    "navy",
    "midnightblue",
  ],
  brown: [
    "cornsilk",
    "blanchedalmond",
    "bisque",
    "navajowhite",
    "wheat",
    "burlywood",
    "tan",
    "rosybrown",
    "sandybrown",
    "goldenrod",
    "darkgoldenrod",
    "peru",
    "chocolate",
    "olive",
    "saddlebrown",
    "sienna",
    "brown",
    "maroon",
  ],
  white: [
    "white",
    "snow",
    "honeydew",
    "mintcream",
    "azure",
    "aliceblue",
    "ghostwhite",
    "whitesmoke",
    "seashell",
    "beige",
    "oldlace",
    "floralwhite",
    "ivory",
    "antiquewhite",
    "linen",
    "lavenderblush",
    "mistyrose",
  ],
  gray: [
    "gainsboro",
    "lightgray",
    "silver",
    "darkgray",
    "dimgray",
    "gray",
    "lightslategray",
    "slategray",
    "darkslategray",
    "black",
  ],
};

//stackoverflow.com/questions/1573053/javascript-function-to-convert-color-names-to-hex-codes

function hexToRgb(hex: string) {
  const bigint = parseInt(hex, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;

  return [r, g, b];
}

export function isTooDark(color: string): boolean {
  // https://stackoverflow.com/a/41491220
  const hex = colorNames[color];
  const [r, g, b] = hexToRgb(hex.slice(1));
  const rgb = [r / 255, g / 255, b / 255];
  const c = rgb.map((col) => {
    if (col <= 0.03928) {
      return col / 12.92;
    }
    return Math.pow((col + 0.055) / 1.055, 2.4);
  });
  const L = 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
  return L <= 0.179;
}

const initialState = Object.fromEntries(
  Object.keys(colorGroups).map((k) => [k, false])
);

function ColorNamePicker(props: {
  cb: (color: string | null) => void;
  initColor: string;
}): JSX.Element {
  const { cb, initColor } = props;
  const strippedInitColor = initColor.slice(1, initColor.length - 1);
  const initColorGroup = Object.entries(colorGroups).find(
    ([_, colors]) =>
      colors.includes(initColor) || colors.includes(strippedInitColor)
  );
  console.log("here", initColor);
  if (!initColorGroup) {
    throw new Error("Invalid color passed to the color name picker");
  }
  const [state, setState] = useState({
    ...initialState,
    // to initially expand the group of initColor, set the following to true
    [initColorGroup[0]]: false,
  });

  const showGroupIndicators = false;
  return (
    <div className="color-name-picker">
      <ul>
        {Object.entries(colorGroups).map(([groupName, colors]) => (
          <li key={groupName}>
            <span
              className="color-group"
              onClick={() =>
                setState({ ...state, [groupName]: !state[groupName] })
              }
            >
              {/* https://en.wikipedia.org/wiki/Geometric_Shapes */}
              {(showGroupIndicators ? (state[groupName] ? "▾ " : "▿ ") : "") +
                groupName.slice(0, 1).toUpperCase() +
                groupName.slice(1)}
            </span>
            <span>
              {colors.map((color) => (
                <span
                  key={color + "-swatch"}
                  className="color-swatch"
                  onClick={() => cb(color)}
                  style={{
                    background: color,
                    borderColor: color === initColor ? "black" : "white",
                  }}
                ></span>
              ))}
            </span>
            {state[groupName] && (
              <ul>
                {colors.map((color) => (
                  <li
                    key={color + "-item"}
                    className={
                      "color-item " + (color === initColor ? "selected" : "")
                    }
                    onClick={() => cb(color)}
                    style={{
                      background: color,
                      color: isTooDark(color) ? "white" : "black",
                    }}
                  >
                    {color}
                  </li>
                ))}
              </ul>
            )}
          </li>
        ))}
      </ul>
      <div className="buttons">
        <button
          onClick={() =>
            cb(colorNames[initColor] || colorNames[strippedInitColor])
          }
        >
          Convert to hex
        </button>
      </div>
    </div>
  );
}

const ColorNameProjection: Projection = {
  query: { type: "value", query: Object.keys(colorNames) },
  type: "tooltip",
  projection: ({ keyPath, currentValue, setCode, fullCode }) => {
    return (
      <ColorNamePicker
        cb={(newColor) => {
          console.log(newColor, setIn(keyPath, newColor, fullCode));
          setCode(setIn(keyPath, newColor, fullCode));
        }}
        initColor={currentValue}
      />
    );
  },
  hasInternalState: true,
  name: "ColorNameProjection",
};
export default ColorNameProjection;
