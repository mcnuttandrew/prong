import React from "react";
import { HashRouter, Route, Routes, Link } from "react-router-dom";

import "./App.css";
import VegaLiteExampleApp from "./examples/VegaLiteExample";
import VegaExampleApp from "./examples/VegaExample";
import SimpleExample from "./examples/SimpleExample";
import ProduceExample from "./examples/ProduceExample";
import InSituFigure1 from "./examples/InSituFigure1";
import VegaLiteStyler from "./examples/VegaLiteStyler";
import Tracery from "./examples/TraceryExample";

const routes: { name: string; Component: () => JSX.Element }[] = [
  { name: "vega-lite", Component: VegaLiteExampleApp },
  { name: "vega", Component: VegaExampleApp },
  { name: "produce", Component: ProduceExample },
  { name: "simple", Component: SimpleExample },
  { name: "in-situ-figure-1", Component: InSituFigure1 },
  { name: "vega-lite-styler", Component: VegaLiteStyler },
  { name: "tracery", Component: Tracery },
];

function Root() {
  return (
    <div className="root">
      {routes.map(({ name }) => (
        <h1 key={name}>
          <Link to={name}>{name}</Link>
        </h1>
      ))}
    </div>
  );
}

function App() {
  return (
    <HashRouter>
      <div>
        <Link to={"/"}>return to home</Link>
      </div>
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
