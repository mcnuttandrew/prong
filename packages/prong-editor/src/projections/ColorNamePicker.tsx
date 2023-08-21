import { useState } from "react";
import { Projection } from "../lib/projections";
import { colorNames, setIn } from "../lib/utils";

// https://www.w3schools.com/colors/colors_groups.asp

const titleCase = (x: string) =>
  `${x[0].toUpperCase()}${x.slice(1).toLowerCase()}`;

export const colorGroups: Record<string, string[]> = {
  blue: [
    "navy",
    "darkblue",
    "midnightblue",
    "mediumblue",
    "blue",
    "royalblue",
    "steelblue",
    "dodgerblue",
    "cadetblue",
    "cornflowerblue",
    "deepskyblue",
    "darkturquoise",
    "mediumturquoise",
    "lightsteelblue",
    "skyblue",
    "lightskyblue",
    "turquoise",
    "lightblue",
    "powderblue",
    "paleturquoise",
    "cyan",
    "aquamarine",
    "lightcyan",
    "aqua",
  ],
  brown: [
    "maroon",
    "saddlebrown",
    "brown",
    "sienna",
    "olive",
    "chocolate",
    "darkgoldenrod",
    "peru",
    "rosybrown",
    "goldenrod",
    "sandybrown",
    "tan",
    "burlywood",
    "wheat",
    "navajowhite",
    "bisque",
    "blanchedalmond",
    "cornsilk",
  ],
  gray: [
    "black",
    "darkslategray",
    "dimgray",
    "slategray",
    "gray",
    "lightslategray",
    "darkgray",
    "silver",
    "lightgray",
    "gainsboro",
  ],
  green: [
    "darkgreen",
    "darkolivegreen",
    "green",
    "teal",
    "forestgreen",
    "seagreen",
    "darkcyan",
    "olivedrab",
    "mediumseagreen",
    "lightseagreen",
    "darkseagreen",
    "limegreen",
    "mediumaquamarine",
    "yellowgreen",
    "lightgreen",
    "mediumspringgreen",
    "lime",
    "springgreen",
    "lawngreen",
    "chartreuse",
    "palegreen",
    "greenyellow",
  ],
  purple: [
    "indigo",
    "purple",
    "darkslateblue",
    "rebeccapurple",
    "darkmagenta",
    "darkviolet",
    "blueviolet",
    "darkorchid",
    "slateblue",
    "mediumslateblue",
    "mediumorchid",
    "mediumpurple",
    "magenta",
    "fuchsia",
    "orchid",
    "violet",
    "plum",
    "thistle",
    "lavender",
  ],
  red: [
    "darkred",
    "firebrick",
    "mediumvioletred",
    "crimson",
    "indianred",
    "red",
    "deeppink",
    "orangered",
    "palevioletred",
    "tomato",
    "hotpink",
    "lightcoral",
    "salmon",
    "coral",
    "darkorange",
    "darksalmon",
    "lightsalmon",
    "orange",
    "lightpink",
    "pink",
  ],
  white: [
    "mistyrose",
    "antiquewhite",
    "linen",
    "beige",
    "lavenderblush",
    "whitesmoke",
    "oldlace",
    "aliceblue",
    "seashell",
    "ghostwhite",
    "floralwhite",
    "honeydew",
    "snow",
    "azure",
    "mintcream",
    "ivory",
    "white",
  ],
  yellow: [
    "darkkhaki",
    "gold",
    "peachpuff",
    "khaki",
    "palegoldenrod",
    "moccasin",
    "papayawhip",
    "lightgoldenrodyellow",
    "yellow",
    "lemonchiffon",
    "lightyellow",
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

const stripColor = (color: string) => color.slice(1, color.length - 1);

function ColorNamePicker(props: {
  changeColor: (color: string | null) => void;
  initColor: string;
}): JSX.Element {
  const { changeColor, initColor } = props;
  const [state, setState] = useState({ ...initialState });

  return (
    <div className="color-name-picker">
      <ul>
        {Object.entries(colorGroups).map(([groupName, colors]) => (
          <li key={groupName} className="prong-flex-down">
            <div className="prong-flex color-group-container">
              <span
                className="color-group"
                onClick={() =>
                  setState({ ...state, [groupName]: !state[groupName] })
                }
              >
                {/* https://en.wikipedia.org/wiki/Geometric_Shapes */}
                {(state[groupName] ? "▲" : "▼") + titleCase(groupName)}
              </span>
              <span className="color-group-options">
                {colors.map((color) => (
                  <span
                    key={`${color}-swatch`}
                    className="color-swatch"
                    onClick={() => changeColor(color)}
                    title={color}
                    style={{
                      background: color,
                      border: "none",
                      // borderColor: color === initColor ? "black" : "none",
                    }}
                  ></span>
                ))}
              </span>
            </div>
            {state[groupName] && (
              <ul>
                {colors.map((color) => (
                  <li
                    key={`${color}-item`}
                    className={`color-item ${
                      color === initColor ? "selected" : ""
                    }`}
                    onClick={() => changeColor(color)}
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
    </div>
  );
}

export const ColorNameProjection: Projection = {
  query: { type: "value", query: Object.keys(colorNames) },
  type: "tooltip",
  projection: ({ keyPath, currentValue, setCode, fullCode }) => {
    return (
      <ColorNamePicker
        changeColor={(newColor) => {
          setCode(setIn(keyPath, `"${newColor!}"`, fullCode));
        }}
        initColor={currentValue}
      />
    );
  },
  name: "Color Name Picker",
  group: "Color Name Picker",
};

export const HexConversionProject: Projection = {
  query: { type: "value", query: Object.keys(colorNames) },
  type: "tooltip",
  projection: ({ keyPath, currentValue, setCode, fullCode }) => {
    return (
      <div className="buttons">
        <button
          onClick={() => {
            const newColor =
              colorNames[currentValue] || colorNames[stripColor(currentValue)];
            setCode(setIn(keyPath, `"${newColor}"`, fullCode));
          }}
        >
          Convert to hex
        </button>
      </div>
    );
  },
  name: "Hex Conversion",
  group: "Utils",
};
