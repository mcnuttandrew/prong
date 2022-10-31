import React from "react";
import { HashRouter, Route, Routes, Link } from "react-router-dom";

import "./App.css";
import VegaLiteExampleApp from "./examples/VegaLiteExample";
import SimpleExample from "./examples/SimpleExample";

function Root() {
  return (
    <div className="root">
      {["vega", "simple"].map((key) => {
        return (
          <h1 key={key}>
            <Link to={key}>{key}</Link>
          </h1>
        );
      })}
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
        <Route element={<VegaLiteExampleApp />} path="vega" />
        <Route element={<SimpleExample />} path="simple" />
        <Route element={<Root />} path="/" />
      </Routes>
    </HashRouter>
  );
}

export default App;
