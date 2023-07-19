import { useEffect, useState } from "react";

import { HashRouter, Route, Routes, Link } from "react-router-dom";
import ReactMarkdown from "react-markdown";

import "../../../packages/prong-editor/src/stylesheets/style.css";

import "./App.css";
import VegaLiteExampleApp from "./examples/VegaLiteDebug";
import SimpleExample from "./examples/SimpleExample";
import ProduceExample from "./examples/ProduceExample";
import InSituVis from "./examples/InSituVis";
import VegaLiteStyler from "./examples/VegaLiteStyler";
import Tracery from "./examples/TraceryExample";
import VegaLiteUseCase from "./examples/VegaLiteUseCase";
import VegaUseCase from "./examples/VegaUseCase";
import QuietModeCompare from "./examples/QuietModeCompare";

import StyledMarkdown from "./examples/StyledMarkdown";

const routes: {
  name: string;
  Component: () => JSX.Element;
  zone: "Case Studies" | "Debugging" | "Examples";
  explanation: string;
}[] = [
  {
    name: "vega-lite",
    Component: VegaLiteUseCase,
    zone: "Case Studies",
    explanation:
      "This case study explores adding views that are similar to familiar GUI applications, such at Tableau and Excel, but adapated to the particular domain of [Vega-Lite](https://vega.github.io/vega-lite/examples/). On particular display here are the editable data table (which will modify the data underneath) and the Tableau-style drag-and-drop of data columns onto encoding drop targets. ",
  },
  {
    name: "vega",
    Component: VegaUseCase,
    zone: "Case Studies",
    explanation:
      "This case study explore adding functionality to [Vega](https://vega.github.io/vega/examples/). Most prominent here are the sparklines (the inline charts decorated through the code) as well as the signal editor, which allows for more dynamic interaction with [Vega Expressions](https://vega.github.io/vega/docs/expressions/)",
  },
  {
    name: "produce",
    Component: ProduceExample,
    zone: "Examples",
    explanation:
      "This simple example looks at a toy schema for organizing some fruits and vegetables. It demonstrates how views can be used to to parts of the code, as well as how they can be used to modify elements (here removing all the unnecessary double quotes).  ",
  },
  {
    name: "vega-lite-debugging",
    Component: VegaLiteExampleApp,
    zone: "Debugging",
    explanation:
      "This is a debugging example meant to help with the development of the system. It shows how views can have state and in several different fashions.",
  },

  {
    name: "simple",
    Component: SimpleExample,
    zone: "Debugging",
    explanation:
      "This is a debugging example that shows a bunch of basic data types (booleans, numbers, etc), which makes it easy to see the way in which the standard bundle interacts with those components. ",
  },
  {
    name: "in-situ-vis",
    Component: InSituVis,
    zone: "Examples",
    explanation:
      "This is an alternate version of the Vega Case Study that allows the user to fiddle with the rendering modes and positioning of the sparklines. The in-situ paper describes a number of additional modes and placements, and while these are valuable they are not fundamentally different from what is presented here, and so we forwent them as an implementation detail.",
  },
  {
    name: "vega-styler",
    Component: VegaLiteStyler,
    zone: "Case Studies",
    explanation:
      "This case study explores the [Vega Configuration language](https://vega.github.io/vega/docs/config/), which is similar to a CSS file but for charts. It explores the role of search in supporting DSL. The notable feature that is shown here through a custom view is the doc search, which allows you to type in a term you might want to use (perhaps scheme) or might be close to a term you want and the populates suggestions into the text editor. You can dismiss them (X) or accept them (check mark). When you are done click 'dismiss suggestions' to return to normal editing. ",
  },
  {
    name: "tracery",
    Component: Tracery,
    zone: "Case Studies",
    explanation:
      "This example looks at the procedural generative language [Tracery](https://tracery.io/), which supports automatic narrative generation for contexts like [twitter bots](https://cheapbotsdonequick.com/) (rip). The rules define a simple generative grammar which is then randomly unfolded to get a given iteration. The custom views here support some highlighting which elements were drawn on as well as a debugging view inspired by the [Tracery Editor](http://tracery.io/editor/). This example also supports limited bidirectional manipulation, such that the you can modify the output and have those edits propagate to the grammar.",
  },
  {
    name: "quiet-mode",
    Component: QuietModeCompare,
    zone: "Examples",
    explanation:
      'This example compares how long a minimal instantiation of the "quiet mode" view (which removes double quotes) is in both Prong as well as base Code Mirror. ',
  },
];

function Root(props: { mobileWarning: boolean }) {
  const [docs, setDocs] = useState("");

  useEffect(() => {
    fetch("./README.md")
      .then((x) => x.text())
      .then((x) => {
        setDocs(x);
      })
      .catch((e) => console.error(e));
  }, []);

  let modifiedDocs = docs;
  if (props.mobileWarning) {
    modifiedDocs = modifiedDocs.replaceAll(
      "# Prong",
      `
# Prong
    
⚠️ ⚠️ This site and tool are not optimized for mobile. Please view on a desktop. ⚠️ ⚠️ 
    `
    );
  }
  return (
    <div className="root">
      <div className="md-container">
        <StyledMarkdown content={modifiedDocs} />
      </div>
    </div>
  );
}

function Explanation(props: { explanation: string }) {
  const { explanation } = props;
  if (!explanation) {
    return <></>;
  }
  return (
    <div className="explanation-container">
      <h3 className="">Example Explanation</h3>
      <div style={{ padding: "0 5px", width: "300px" }}>
        {/* @ts-ignore */}
        <ReactMarkdown>{explanation}</ReactMarkdown>
      </div>
    </div>
  );
}

function MobilePage() {
  return (
    <div className="mobile-proot">
      <div className="mobile-header">
        <div>Prong</div>
        <div>
          <a href="https://github.com/mcnuttandrew/prong">GitHub</a>
        </div>
      </div>
      <Root mobileWarning={true} />
    </div>
  );
}

function App() {
  const groups = routes.reduce((acc, row) => {
    acc[row.zone] = (acc[row.zone] || []).concat(row);
    return acc;
  }, {} as Record<string, typeof routes>);
  return (
    <HashRouter>
      <MobilePage />

      <div className="flex proot">
        <div className="link-container">
          {/* @ts-ignore */}
          <Link to={"/"}>
            <img
              src={"./logo.png"}
              alt="logo for prong. black and white bird face surrounded by white splatters."
            />
          </Link>
          <h1>Prong</h1>
          <div className="flex-down">
            <a href="https://github.com/mcnuttandrew/prong">GitHub</a>
            <a href="https://github.com/mcnuttandrew/prong">Paper</a>
          </div>
          {Object.entries(groups).map(([name, groupRoutes]) => {
            return (
              <div key={name} className="inner-link-container">
                <h3 className="">{name}</h3>
                {groupRoutes.map(({ name }) => (
                  <div key={name}>
                    {/* @ts-ignore */}
                    <Link to={name}>{name}</Link>
                  </div>
                ))}
              </div>
            );
          })}
          {/* @ts-ignore */}
          <Routes>
            {routes.map(({ name, explanation }) => (
              //@ts-ignore
              <Route
                element={<Explanation explanation={explanation} />}
                path={name}
                key={name}
              />
            ))}
          </Routes>
        </div>
        {/* @ts-ignore */}
        <Routes>
          {routes.map(({ name, Component }) => (
            // @ts-ignore
            <Route element={<Component />} path={name} key={name} />
          ))}
          {/* @ts-ignore */}
          <Route element={<Root mobileWarning={false} />} path="/" />
        </Routes>
      </div>
    </HashRouter>
  );
}

export default App;
