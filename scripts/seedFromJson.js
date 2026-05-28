import { spawnSync } from "child_process";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";

const currentDir = dirname(fileURLToPath(import.meta.url));
const pythonScriptPath = resolve(currentDir, "seedFromJson.py");
const pythonExecutable = process.env.PYTHON || process.env.PYTHON_EXECUTABLE || "c:/python313/python.exe";

const result = spawnSync(pythonExecutable, [pythonScriptPath, ...process.argv.slice(2)], {
  stdio: "inherit",
  cwd: currentDir,
});

if (result.error) {
  console.error(result.error.message);
  process.exit(1);
}

process.exit(result.status ?? 1);
