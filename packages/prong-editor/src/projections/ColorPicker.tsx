import { useState } from "react";
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
    <div className="prong-flex-down">
      <div className="prong-flex space-between">
        <div className="prong-flex centering">
          Old{" "}
          <div
            style={{
              borderRadius: "100%",
              background: initialColor,
              width: "20px",
              height: "20px",
            }}
          ></div>
        </div>
        <div className="prong-flex centering">
          New{" "}
          <div
            style={{
              background: color,
              width: "20px",
              height: "20px",
              borderRadius: "100%",
            }}
          ></div>
        </div>
        <div>
          <button onClick={() => onChange(color)}>Change</button>
        </div>
      </div>
      <HexColorPicker
        color={initialColor}
        onChange={(newColor) => setColor(newColor)}
      />
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
