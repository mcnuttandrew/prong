import React, { useState, useEffect } from "react";
import QuietModeJSONG from "./QuietModeJsong";
import QuiteModeCodeMirror from "./QuietModeCodeMirror";
import { produceExample } from "./example-data";

function QuiteModeCompare() {
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
    <div className="flex">
      <div style={{ width: "100%", height: "100%" }} className="flex-down">
        <h1>JSONG</h1>
        <h3>Lines of code {examples.jsong.split("\n").length}</h3>
        <QuietModeJSONG code={code} onChange={setCode} />
        <code style={{ height: "100%", overflowY: "scroll" }}>
          {examples.jsong.split("\n").map((x, idx) => (
            <div key={`${idx}-jsong`}>{x}</div>
          ))}
        </code>
      </div>
      <div style={{ width: "100%", height: "100%" }} className="flex-down">
        <h1>Vanilla Code Mirror</h1>
        <h3>Lines of code {examples.codeMirror.split("\n").length}</h3>
        <QuiteModeCodeMirror code={code} onChange={setCode} />
        <code style={{ height: "100%", overflowY: "scroll" }}>
          {examples.codeMirror.split("\n").map((x, idx) => (
            <div key={`${idx}-codemirror`}>{x}</div>
          ))}
        </code>
      </div>
    </div>
  );
}

export default QuiteModeCompare;
