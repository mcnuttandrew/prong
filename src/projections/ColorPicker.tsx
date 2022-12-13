import React, { useState } from "react";
import { HexColorPicker } from "react-colorful";

import { setIn } from "../lib/utils";
import { Projection } from "../lib/projections";

const colorRegex = /"#([a-fA-F0-9]){3}"$|[a-fA-F0-9]{6}"$/i;
function ColorPicker(props: {
  onChange: (color: string) => void;
  initialColor: string;
}) {
  const { onChange, initialColor } = props;
  const [color, setColor] = useState(initialColor);
  return (
    <div className="flex">
      <HexColorPicker
        color={initialColor}
        onChange={(newColor) => setColor(newColor)}
      />
      <div className="flex-down">
        <div>
          Old{" "}
          <div
            style={{
              background: initialColor,
              width: "30px",
              height: "20px",
            }}
          ></div>
        </div>
        <div>
          new{" "}
          <div
            style={{ background: color, width: "30px", height: "20px" }}
          ></div>
        </div>
        <div>
          <button onClick={() => onChange(color)}>Change</button>
        </div>
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
        onChange={(newColor) => setCode(setIn(keyPath, newColor, fullCode))}
        initialColor={currentValue.slice(1, currentValue.length - 1)}
      />
    );
  },
  name: "ColorProjection",
};
export default ColorProjection;
