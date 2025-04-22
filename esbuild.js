const esbuild = require("esbuild");
const path = require("path");

const production = process.argv.includes("--production");
const watch = process.argv.includes("--watch");

const config = {
  entryPoints: ["src/extension.ts"],
  bundle: true,
  external: ["vscode"],
  platform: "node",
  outfile: "dist/extension.js",
  sourcemap: !production,
  minify: production,
  watch: watch && {
    onRebuild(error) {
      if (error) {
        console.error("Build failed:", error);
      } else {
        console.log("Build succeeded");
      }
    },
  },
};

esbuild.build(config).catch(() => process.exit(1));
