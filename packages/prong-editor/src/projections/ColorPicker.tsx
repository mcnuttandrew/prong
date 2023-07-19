import { useState } from "react";
import { color as d3Color, hsl } from "d3-color";
import { setIn } from "../lib/utils";
import { Projection } from "../lib/projections";
import { colorGroups } from "./ColorNamePicker";

const colorRegex = /"#([a-fA-F0-9]){3}"$|[a-fA-F0-9]{6}"$/i;

type HSLObj = { h: number; s: number; l: number };
const getHSLObject = (color: string): HSLObj => {
  const hslColor = hsl(d3Color(color) as any) as any;
  ["h", "s", "l"].forEach((key) => {
    hslColor[key] = hslColor[key] || 0;
  });
  return { h: hslColor.h, s: hslColor.s, l: hslColor.l };
};
const hslObjectToHex = (hslObject: HSLObj): string => {
  const s = Math.round(hslObject.s * 100);
  const l = Math.round(hslObject.l * 100);
  const hslString = `hsl(${hslObject.h}, ${s}%, ${l}%)`;
  return hsl(hslString).formatHex();
};

const colorNames = Object.values(colorGroups).flat();
type HexObj = { r: number; g: number; b: number; opacity: number };
const hexDistance = (a: HexObj, b: HexObj) =>
  Math.sqrt(
    Math.pow(a.r - b.r, 2) + Math.pow(a.g - b.g, 2) + Math.pow(a.b - b.b, 2)
  );
function convertToClosestNameColor(color: string) {
  const hex = d3Color(color) as HexObj;
  const bestColorName = colorNames.reduce(
    (acc, name) => {
      const color = d3Color(name) as HexObj;
      const distance = hexDistance(hex, color);
      if (distance < acc.score) {
        return { score: distance, name };
      }
      return acc;
    },
    { score: Infinity, name: "" }
  );
  return bestColorName.name;
}

function ColorPicker(props: {
  onChange: (color: string) => void;
  initialColor: string;
}) {
  const { onChange, initialColor } = props;
  const [color, setColor] = useState<HSLObj>(getHSLObject(initialColor));

  const hexColor = hslObjectToHex(color);
  return (
    <div className="prong-flex-down">
      <div className="prong-flex space-between">
        <div className="prong-flex centering">
          <span className="cm-color-picker-label">Old</span>
          <div
            className="cm-color-picker-preview"
            style={{ background: initialColor }}
          ></div>
        </div>
        <div className="prong-flex centering">
          <span className="cm-color-picker-label">New</span>
          <div
            className="cm-color-picker-preview"
            style={{ background: hexColor }}
          ></div>
        </div>
        <div>
          <button onClick={() => onChange(hexColor)}>Change</button>
        </div>
        <div>
          <button onClick={() => onChange(convertToClosestNameColor(hexColor))}>
            Convert To Closest Named Color
          </button>
        </div>
      </div>
      <div className="prong-flex-down">
        {[
          { label: "hue", key: "h", max: 360 },
          { label: "saturation", key: "s", max: 1 },
          { label: "lightness", key: "l", max: 1 },
        ].map(({ label, max, key }) => (
          <span key={label}>
            <input
              id={`color-picker-${label}`}
              type="range"
              min={0}
              max={max}
              step={max / 100}
              onChange={(e) =>
                setColor({ ...color, [key]: Number(e.target.value) })
              }
              value={(color as any)[key] || 0}
            />
            <label htmlFor={`color-picker-${label}`}>{label}</label>{" "}
          </span>
        ))}
      </div>
    </div>
  );
}

const ColorProjection: Projection = {
  query: { type: "regex", query: colorRegex },
  type: "tooltip",
  projection: ({ keyPath, currentValue, setCode, fullCode }) => {
    return (
      <ColorPicker
        onChange={(newColor) =>
          setCode(setIn(keyPath, `"${newColor}"`, fullCode))
        }
        initialColor={currentValue.slice(1, currentValue.length - 1)}
      />
    );
  },
  name: "ColorProjection",
};
export default ColorProjection;
