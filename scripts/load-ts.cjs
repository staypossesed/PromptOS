const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");
const cache = new Map();
const root = path.resolve(__dirname, "..");

// Compile existing project modules in memory for Node tests and evaluation scripts.
function loadTS(filename) {
  const fullPath = path.resolve(root, filename);
  if (cache.has(fullPath)) return cache.get(fullPath).exports;
  const source = fs.readFileSync(fullPath, "utf8");
  const { outputText } = ts.transpileModule(source, { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true,
  } });
  const module = { exports: {} };
  cache.set(fullPath, module);
  const localRequire = (name) => {
    if (name.startsWith("@/") || name.startsWith(".")) {
      const base = name.startsWith("@/") ? path.join(root, name.slice(2)) : path.resolve(path.dirname(fullPath), name);
      const candidate = [base, `${base}.ts`, path.join(base, "index.ts")].find((item) => fs.existsSync(item) && fs.statSync(item).isFile());
      if (!candidate) throw new Error(`Module not found: ${name}`);
      return loadTS(candidate);
    }
    return require(name);
  };
  const run = vm.runInThisContext(`(function(require, module, exports) {${outputText}\n})`, { filename: fullPath });
  run(localRequire, module, module.exports);
  return module.exports;
}
module.exports = { loadTS };
