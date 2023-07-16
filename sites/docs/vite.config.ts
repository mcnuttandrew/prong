import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";

// for production builds swap to using the published version of prong editor, rather than the local one
function myPlugin() {
  return {
    name: "transform-file",

    transform(src, id) {
      if (
        process.env.NODE_ENV === "production" &&
        id.includes("sites/docs") &&
        !id.includes("node_modules") &&
        (id.endsWith(".ts") || id.endsWith(".tsx"))
      ) {
        return {
          code: src
            .replaceAll(
              "../../../../packages/prong-editor/src/index",
              "prong-editor"
            )
            .replaceAll(
              "../../../packages/prong-editor/src/stylesheets/styles.css",
              "prong-editor/style.css"
            ),
          map: null,
        };
      }
    },
  };
}

export default defineConfig({
  plugins: [myPlugin(), react({})],
});
