import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";

const sourceDir = join(process.cwd(), ".next", "server", "chunks", "static", "wasm");
const targetDir = join(process.cwd(), ".open-next", "static", "wasm");
const staleServerTargetDir = join(
  process.cwd(),
  ".open-next",
  "server-functions",
  "default",
  "static",
  "wasm",
);
const duplicatePrismaDir = join(
  process.cwd(),
  ".open-next",
  "server-functions",
  "default",
  "src",
  "generated",
  "prisma",
  "internal",
);
const handlerPath = join(process.cwd(), ".open-next", "server-functions", "default", "handler.mjs");
const workerPath = join(process.cwd(), ".open-next", "worker.js");

if (!existsSync(sourceDir)) {
  console.log("No Next.js wasm chunks found; skipping OpenNext wasm copy.");
  process.exit(0);
}

mkdirSync(targetDir, { recursive: true });

let copied = 0;
for (const filename of readdirSync(sourceDir)) {
  if (!filename.endsWith(".wasm")) {
    continue;
  }

  copyFileSync(join(sourceDir, filename), join(targetDir, filename));
  copied += 1;
}

console.log(`Copied ${copied} Next.js wasm chunk(s) into .open-next/static/wasm.`);

let removedStale = 0;
if (existsSync(staleServerTargetDir)) {
  for (const filename of readdirSync(staleServerTargetDir)) {
    if (!filename.endsWith(".wasm")) {
      continue;
    }

    unlinkSync(join(staleServerTargetDir, filename));
    removedStale += 1;
  }

  try {
    rmSync(staleServerTargetDir, { recursive: true });
  } catch {
    // The directory can stay behind if another file appears in it.
  }
}

let removed = 0;
if (copied > 0 && existsSync(duplicatePrismaDir)) {
  for (const filename of readdirSync(duplicatePrismaDir)) {
    if (!filename.endsWith(".wasm")) {
      continue;
    }

    unlinkSync(join(duplicatePrismaDir, filename));
    removed += 1;
  }
}

console.log(`Removed ${removedStale} stale server wasm chunk(s) from .open-next/server-functions/default/static/wasm.`);
console.log(`Removed ${removed} duplicate Prisma wasm chunk(s) from .open-next server output.`);

if (copied > 0 && existsSync(workerPath)) {
  const wasmFiles = readdirSync(targetDir).filter((filename) => filename.endsWith(".wasm"));
  let worker = readFileSync(workerPath, "utf8");

  if (!worker.includes("__agentToolHubWasmModules")) {
    const imports = wasmFiles
      .map((filename, index) => `import __agentToolHubWasm${index} from "./static/wasm/${filename}";`)
      .join("\n");
    const entries = wasmFiles
      .map((filename, index) => `  "${filename.replace(/\.wasm$/, "")}": __agentToolHubWasm${index},`)
      .join("\n");
    const registry = `\nglobalThis.__agentToolHubWasmModules = {\n${entries}\n};\n`;
    const exportNeedle = "export default {";

    if (!worker.includes(exportNeedle)) {
      throw new Error("Could not find the OpenNext worker default export in .open-next/worker.js");
    }

    worker = `${imports}\n${worker.replace(exportNeedle, `${registry}${exportNeedle}`)}`;
    writeFileSync(workerPath, worker);
  }
}

if (copied > 0 && existsSync(handlerPath)) {
  let handler = readFileSync(handlerPath, "utf8");

  if (!handler.includes("__agentToolHubLoadCompiledWasm")) {
    const prelude = `const __agentToolHubLoadCompiledWasm = (hash) => {\n  const wasmModule = globalThis.__agentToolHubWasmModules?.[hash];\n  return wasmModule ? Promise.resolve(wasmModule) : Promise.reject(Error("Missing compiled wasm module: " + hash));\n};\n`;
    const runtimeNeedle =
      'k.v=(a2,b3,c3,d3)=>new Promise(function(a3,b4){try{var{readFile:d4}=require("fs"),{join:e2}=require("path");d4(e2("","static/wasm/"+c3+".wasm"),function(c4,d5){if(c4)return b4(c4);a3({arrayBuffer:()=>d5})})}catch(a4){b4(a4)}}).then(a3=>a3.arrayBuffer()).then(a3=>WebAssembly.instantiate(a3,d3)).then(b4=>Object.assign(a2,b4.instance.exports))';
    const runtimeReplacement =
      'k.v=(a2,b3,c3,d3)=>__agentToolHubLoadCompiledWasm(c3).then(a3=>WebAssembly.instantiate(a3,d3).then(b4=>(Object.defineProperty(a2,"default",{enumerable:!0,value:a3}),Object.assign(a2,(b4.instance??b4).exports))))';

    if (!handler.includes(runtimeNeedle)) {
      throw new Error("Could not find the Next.js wasm runtime in .open-next/server-functions/default/handler.mjs");
    }

    handler = `${prelude}${handler.replace(runtimeNeedle, runtimeReplacement)}`;
    writeFileSync(handlerPath, handler);
  }
}

console.log("Patched OpenNext handler to instantiate compiled wasm modules.");
