import React, { useState, useEffect } from "react";
import QuietModeJSONG from "./QuietModeJsong";
import QuietModeCodeMirror from "./QuietModeCodeMirror";
import { produceExample } from "./example-data";
import "../stylesheets/quiet-styles.css";

function QuietModeCompare() {
  const [code, setCode] = useState(produceExample);
  const [examples, setExamples] = useState({ codeMirror: "", jsong: "" });
  useEffect(() => {
    Promise.all(
      ["QuietModeCodeMirror.tsx", "QuietModeJsong.tsx"].map((el) =>
        fetch(el).then((x) => x.text())
      )
    ).then(([codeMirror, jsong]) => setExamples({ codeMirror, jsong }));
  }, []);
  return (
    <div className="flex" id="quiet-root">
      <div
        style={{ width: "100%", height: "100%", marginRight: "5px" }}
        className="flex-down"
      >
        <h1>JSONG</h1>
        <h3>Lines of code {examples.jsong.split("\n").length}</h3>
        <QuietModeJSONG code={code} onChange={setCode} />
        <h3>Raw</h3>
        <code style={{ height: "100%", overflowY: "scroll" }}>
          {examples.jsong.split("\n").map((x, idx) => (
            <div key={`${idx}-jsong`}>{x}</div>
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
