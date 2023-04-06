import React, { useState } from "react";
import { Projection, ProjectionProps } from "../lib/projections";
import { maybeTrim } from "../examples/example-utils";
import { setIn } from "../lib/utils";

// https://stackoverflow.com/questions/23917074/javascript-flooring-number-to-order-of-magnitude
function orderOfMag(n: number) {
  var order = Math.floor(Math.log(Math.abs(n)) / Math.LN10 + 0.000000001);
  //   return Math.pow(10, order);
  return order;
}

function FancySlider(props: ProjectionProps) {
  const value = maybeTrim(props.currentValue) || 0;
  const [dragging, setDragging] = useState(false);
  const [val, setVal] = useState(value);
  const order = orderOfMag(Number(value) || 0);
  const min = Math.pow(10, order - 1);
  const max = Math.pow(10, order + 1) * 1.1;
  return (
    <div className="cm-number-slider">
      <span
        className="cm-number-slider-label"
        style={{ left: `${(Number(val) / (max - min)) * 100}%` }}
      >
        {val}
      </span>
      <input
        aria-label="drag control for number"
        type="range"
        min={min}
        max={max}
        value={val}
        step={Math.pow(10, order - 1)}
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
