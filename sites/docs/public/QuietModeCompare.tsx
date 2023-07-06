import React, { useState, useEffect } from "react";
import QuietModeUs from "./QuietModeUs";
import QuietModeCodeMirror from "./QuietModeCodeMirror";
import { produceExample } from "./example-data";
import "../stylesheets/quiet-styles.css";

function QuietModeCompare() {
  const [code, setCode] = useState(produceExample);
  const [examples, setExamples] = useState({ codeMirror: "", us: "" });
  useEffect(() => {
    Promise.all(
      ["QuietModeCodeMirror.tsx", "QuietModeUs.tsx"].map((el) =>
        fetch(el).then((x) => x.text())
      )
    ).then(([codeMirror, us]) => setExamples({ codeMirror, us }));
  }, []);
  return (
    <div className="flex" id="quiet-root">
      <div
        style={{ width: "100%", height: "100%", marginRight: "5px" }}
        className="flex-down"
      >
        <h1>Prong</h1>
        <h3>Lines of code {examples.us.split("\n").length}</h3>
        <QuietModeUs code={code} onChange={setCode} />
        <h3>Raw</h3>
        <code style={{ height: "100%", overflowY: "scroll" }}>
          {examples.us.split("\n").map((x, idx) => (
            <div key={`${idx}-us`}>{x}</div>
          ))}
        </code>
      </div>
      <div style={{ width: "100%", height: "100%" }} className="flex-down">
        <h1>Vanilla Code Mirror</h1>
        <h3>Lines of code {examples.codeMirror.split("\n").length}</h3>
        <QuietModeCodeMirror code={code} onChange={setCode} />
        <h3>Raw</h3>
        <code style={{ height: "100%", overflowY: "scroll" }}>
          {examples.codeMirror.split("\n").map((x, idx) => (
            <div key={`${idx}-codemirror`}>{x}</div>
          ))}
        </code>
      </div>
    </div>
  );
}

export default QuietModeCompare;
