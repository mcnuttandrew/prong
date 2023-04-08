import React, { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import { HashRouter, Route, Routes, Link } from "react-router-dom";

import "./App.css";
import VegaLiteExampleApp from "./examples/VegaLiteDebug";
import SimpleExample from "./examples/SimpleExample";
import ProduceExample from "./examples/ProduceExample";
import InSituFigure1 from "./examples/InSituFigure1";
import VegaLiteStyler from "./examples/VegaLiteStyler";
import Tracery from "./examples/TraceryExample";
import VegaLiteUseCase from "./examples/VegaLiteUseCase";
import VegaUseCase from "./examples/VegaUseCase";

import markup from "./demo-page.md";
const routes: {
  name: string;
  Component: () => JSX.Element;
  zone: "Case Studies" | "Debugging" | "Examples";
}[] = [
  { name: "vega-lite", Component: VegaLiteUseCase, zone: "Case Studies" },
  { name: "vega", Component: VegaUseCase, zone: "Case Studies" },
  { name: "produce", Component: ProduceExample, zone: "Examples" },
  {
    name: "vega-lite-debugging",
    Component: VegaLiteExampleApp,
    zone: "Debugging",
  },

  { name: "simple", Component: SimpleExample, zone: "Debugging" },
  { name: "in-situ-figure-1", Component: InSituFigure1, zone: "Examples" },
  { name: "vega-lite-styler", Component: VegaLiteStyler, zone: "Case Studies" },
  { name: "tracery", Component: Tracery, zone: "Examples" },
];

function Root() {
  const [postMarkdown, setPostMarkdown] = useState("");

  useEffect(() => {
    fetch(markup)
      .then((response) => response.text())
      .then((text) => setPostMarkdown(text));
  }, []);

  return (
    <div className="root">
      <ReactMarkdown>{postMarkdown}</ReactMarkdown>
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
      <div className="flex proot">
        <div className="link-container">
          <h1>
            <Link to={"/"}>JSONG</Link>
          </h1>
          {Object.entries(groups).map(([name, groupRoutes]) => {
            return (
              <div key={name}>
                <h3 className="">{name}</h3>
                {groupRoutes.map(({ name }) => (
                  <div key={name}>
                    <Link to={name}>{name}</Link>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
        <Routes>
          {routes.map(({ name, Component }) => (
            <Route element={<Component />} path={name} key={name} />
          ))}
          <Route element={<Root />} path="/" />
        </Routes>
      </div>
    </HashRouter>
  );
}

export default App;
