import * as React from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { colorNames, colorGroups } from "../lib/utils";

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

type Props = {
  cb: (color: string | null) => void;
  initColor: string;
  wrap: HTMLElement;
};

const initialState = Object.fromEntries(
  Object.keys(colorGroups).map((k) => [k, false])
);

export default function ColorNamePicker({
  cb,
  initColor,
  wrap,
}: Props): JSX.Element {
  const initColorGroup = Object.entries(colorGroups).find(([_, colors]) =>
    colors.includes(initColor)
  );
  if (!initColorGroup) {
    throw new Error("Invalid color passed to the color name picker");
  }
  const [state, setState] = useState({
    ...initialState,
    // to initially expand the group of initColor, set the following to true
    [initColorGroup[0]]: false,
  });

  const { left: parentLeft, top: parentTop } = useMemo(
    () => wrap.getBoundingClientRect(),
    [wrap]
  );

  let [top, setTop] = useState(parentTop);
  let [left, setLeft] = useState(parentLeft);

  const el = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (el.current) {
      let newTop =
        window.innerHeight - el.current.getBoundingClientRect().height - 20; // - 20 for margin
      const newLeft =
        window.innerWidth - el.current.getBoundingClientRect().width - 50;
      if (newLeft < left) {
        setLeft(newLeft);
        // If the element was moved to the left move it down to keep it from
        // concealing the actual color string beneath it
        setTop(top + 50);
      }
      if (newTop < top) {
        setTop(newTop);
      }

      const escHandler = (e: KeyboardEvent) => {
        if (e.key === "Escape") {
          cb(null);
        }
      };
      document.addEventListener("keypress", escHandler);
      return () => document.removeEventListener("keypress", escHandler);
    }
  }, [cb, left, top]);

  const showGroupIndicators = false;
  return (
    <div className="color-name-picker" style={{ left, top }} ref={el}>
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
        {/* TODO: Escape */}
        <button onClick={() => cb(null)}>Close</button>
        <button onClick={() => cb(colorNames[initColor])}>
          Convert to hex and close
        </button>
      </div>
    </div>
  );
}
