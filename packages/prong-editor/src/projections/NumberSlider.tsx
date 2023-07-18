import { useState, useEffect } from "react";
import { Projection, ProjectionProps } from "../lib/projections";
import { setIn, maybeTrim } from "../lib/utils";

// https://stackoverflow.com/questions/23917074/javascript-flooring-number-to-order-of-magnitude
function orderOfMag(n: number) {
  return Math.floor(Math.log(Math.abs(n)) / Math.LN10 + 0.000000001);
}

function FancySlider(props: ProjectionProps) {
  const value = maybeTrim(props.currentValue) || 0;
  const [dragging, setDragging] = useState(false);
  const [val, setVal] = useState(value);
  const [min, setMin] = useState(0);
  const [max, setMax] = useState(0);
  const order = orderOfMag(Number(val) || 0);

  useEffect(() => {
    const localVal = maybeTrim(props.currentValue) || 0;
    const isNegative = Number(localVal) < 0;
    const localOrder = orderOfMag(Number(localVal) || 0);
    let localMin = Math.pow(10, localOrder - 1);
    let localMax = Math.pow(10, localOrder + 1);
    const isZero = localMin === localMax && localMax === 0;
    if (isZero) {
      localMax = 1;
    }
    if (isNegative) {
      const temp = localMin;
      localMin = -localMax;
      localMax = -temp;
    }
    setMax(localMax);
    setMin(localMin);
  }, [props.currentValue]);
  const pos = ((Number(val) - min) / (max - min)) * 90;

  return (
    <div className="cm-number-slider">
      <div className="cm-slider-dropzone" style={{ left: 0 }}></div>
      <div className="cm-slider-dropzone" style={{ right: 0 }}></div>
      <span
        className="cm-number-slider-magnitude-label"
        style={{ left: "-2px", textAlign: "right" }}
      >
        {min}
      </span>
      <span
        className="cm-number-slider-magnitude-label"
        style={{ right: "2px", textAlign: "left" }}
      >
        {max}
      </span>
      <span
        className="cm-number-slider-label"
        style={{ left: `calc(${pos}%)`, top: "-15px" }}
      >
        {val}
      </span>
      <input
        aria-label="drag control for number"
        type="range"
        min={min}
        max={max}
        value={val}
        step={min === max && max === 0 ? 0.01 : Math.pow(10, order - 1)}
        onMouseUp={() => {
          setDragging(false);
          props.setCode(setIn(props.keyPath, val, props.fullCode));
        }}
        onMouseDown={() => setDragging(true)}
        onChange={(e) => {
          if (dragging) {
            setVal(e.target.value);
          } else {
            props.setCode(setIn(props.keyPath, e.target.value, props.fullCode));
          }
        }}
      />
    </div>
  );
}

const NumberSlider: Projection = {
  query: { type: "nodeType", query: ["Number"] },
  type: "inline",
  mode: "prefix",
  projection: (props) => <FancySlider {...props} />,
  hasInternalState: false,
};

export default NumberSlider;
