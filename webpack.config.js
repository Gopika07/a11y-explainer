const path = require("path");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const HtmlInlineScriptPlugin = require("html-inline-script-webpack-plugin");

module.exports = [
  {
    name: "code",
    mode: "development",
    devtool: false,
    entry: "./src/code.ts",
    output: {
      filename: "code.js",
      path: path.resolve(__dirname, "dist"),
    },
    resolve: { extensions: [".ts", ".js"] },
    module: {
      rules: [{
        test: /\.ts$/,
        use: [{
          loader: "ts-loader",
          options: {
            configFile: "tsconfig.json",
            compilerOptions: {
              typeRoots: ["./node_modules/@figma/plugin-typings"]
            }
          }
        }]
      }]
    },
  },
  {
    name: "ui",
    mode: "development",
    devtool: false,
    entry: "./src/ui.ts",
    output: {
      filename: "ui.js",
      path: path.resolve(__dirname, "dist"),
    },
    resolve: { extensions: [".ts", ".js"] },
    module: {
      rules: [{ test: /\.ts$/, use: "ts-loader" }],
    },
    plugins: [
      new HtmlWebpackPlugin({
        template: "./src/ui.html",
        filename: "ui.html",
        inject: "body",
      }),
      new HtmlInlineScriptPlugin(),
    ],
  },
];
