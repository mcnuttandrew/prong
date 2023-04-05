import React, { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import { HashRouter, Route, Routes, Link, useLocation } from "react-router-dom";

import "./App.css";
import VegaLiteExampleApp from "./examples/VegaLiteDebug";
// import VegaExampleApp from "./examples/VegaExample";
import SimpleExample from "./examples/SimpleExample";
import ProduceExample from "./examples/ProduceExample";
import InSituFigure1 from "./examples/InSituFigure1";
import VegaLiteStyler from "./examples/VegaLiteStyler";
import Tracery from "./examples/TraceryExample";
import VegaLiteUseCase from "./examples/VegaLiteUseCase";
import VegaUseCase from "./examples/VegaUseCase";

import markup from "./demo-page.md";
// console.log(markup);
const routes: {
  name: string;
  Component: () => JSX.Element;
  zone: "Case Studies" | "Debugging";
}[] = [
  { name: "vega-lite", Component: VegaLiteUseCase, zone: "Case Studies" },
  { name: "vega", Component: VegaUseCase, zone: "Case Studies" },
  {
    name: "vega-lite-debugging",
    Component: VegaLiteExampleApp,
    zone: "Debugging",
  },
  // { name: "vega-debug", Component: VegaExampleApp, zone: "Debugging" },
  { name: "produce", Component: ProduceExample, zone: "Case Studies" },
  { name: "simple", Component: SimpleExample, zone: "Debugging" },
  { name: "in-situ-figure-1", Component: InSituFigure1, zone: "Debugging" },
  { name: "vega-lite-styler", Component: VegaLiteStyler, zone: "Debugging" },
  { name: "tracery", Component: Tracery, zone: "Debugging" },
];

function Root() {
  const [postMarkdown, setPostMarkdown] = useState("");

  useEffect(() => {
    fetch(markup)
      .then((response) => response.text())
      .then((text) => setPostMarkdown(text));
  }, []);
  const groups = routes.reduce((acc, row) => {
    acc[row.zone] = (acc[row.zone] || []).concat(row);
    return acc;
  }, {} as Record<string, typeof routes>);
  return (
    <div className="root">
      <div className="link-container">
        {Object.entries(groups).map(([name, groupRoutes]) => {
          return (
            <div key={name}>
              <h1>{name}</h1>
              {groupRoutes.map(({ name }) => (
                <h1 key={name}>
                  <Link to={name}>{name}</Link>
                </h1>
              ))}
            </div>
          );
        })}
      </div>
      <div id="intro-page">
        <ReactMarkdown>{postMarkdown}</ReactMarkdown>
      </div>
    </div>
  );
}

function Header() {
  const x = useLocation();
  const atHead = x.pathname === "/";
  return (
    <div id="header">
      <Link to={"/"}> JSONG</Link>
      {!atHead && <Link to={"/"}>Return to Home</Link>}
    </div>
  );
}

function App() {
  return (
    <HashRouter>
      <Header />
      <Routes>
        {routes.map(({ name, Component }) => (
          <Route element={<Component />} path={name} key={name} />
        ))}
        <Route element={<Root />} path="/" />
      </Routes>
    </HashRouter>
  );
}

export default App;
