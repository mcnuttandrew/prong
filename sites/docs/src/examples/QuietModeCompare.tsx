import { useState, useEffect } from "react";
import QuietModeUs from "./QuietModeUs";
import QuietModeCodeMirror from "./QuietModeCodeMirror";
import { produceExample } from "./example-data";
import "../stylesheets/quiet-styles.css";
import StyledMarkdown from "./StyledMarkdown";

function QuietModeCompare() {
  const [code, setCode] = useState(produceExample);
  const [examples, setExamples] = useState({ codeMirror: "", us: "" });
  useEffect(() => {
    Promise.all(
      ["QuietModeCodeMirror.tsx", "QuietModeUs.tsx"].map((el) =>
        fetch(el)
          .then((x) => x.text())
          .then((x) => {
            console.log(x);
            // return x;
            return (
              "```tsx" +
              x
                .replace(
                  /\n/g,
                  `
        `
                )
                .split("\n")
                .map((x) => x.slice(8))
                .join("\n")
            );
          })
      )
    ).then(([codeMirror, us]) => setExamples({ codeMirror, us }));
  }, []);
  return (
    <div className="flex" id="quiet-root" style={{ width: "100%" }}>
      <div
        style={{
          width: "100%",
          height: "100%",
          marginRight: "5px",
          maxWidth: "50%",
        }}
        className="flex-down"
      >
        <h1>Prong</h1>
        <h3>Lines of code {examples.us.split("\n").length}</h3>
        <QuietModeUs code={code} onChange={setCode} />
        <h3>Raw</h3>
        <div style={{ height: "100%", overflowY: "scroll" }}>
          <StyledMarkdown content={examples.us} />
        </div>
      </div>
      <div
        style={{ width: "100%", height: "100%", maxWidth: "50%" }}
        className="flex-down"
      >
        <h1>Vanilla Code Mirror</h1>
        <h3>Lines of code {examples.codeMirror.split("\n").length}</h3>
        <QuietModeCodeMirror code={code} onChange={setCode} />
        <h3>Raw</h3>
        <div style={{ height: "100%", overflowY: "scroll" }}>
          <StyledMarkdown content={examples.codeMirror} />
        </div>
      </div>
    </div>
  );
}

export default QuietModeCompare;
