import React from "react";
import { HashRouter, Route, Routes, Link } from "react-router-dom";

import "./App.css";
import VegaLiteExampleApp from "./examples/VegaLiteExample";
import VegaExampleApp from "./examples/VegaExample";
import SimpleExample from "./examples/SimpleExample";
import FruitExample from "./examples/FruitExample";

const routes: { name: string; Component: () => JSX.Element }[] = [
  { name: "vega-lite", Component: VegaLiteExampleApp },
  { name: "vega", Component: VegaExampleApp },
  { name: "fruit", Component: FruitExample },
  { name: "simple", Component: SimpleExample },
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
