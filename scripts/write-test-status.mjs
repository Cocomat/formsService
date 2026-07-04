import { spawn } from "node:child_process";
import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const startedAt = new Date();
const command = process.env.npm_execpath ? process.execPath : "pnpm";
const args = process.env.npm_execpath ? [process.env.npm_execpath, "-r", "test"] : ["-r", "test"];
const chunks = [];

const child = spawn(command, args, {
  cwd: process.cwd(),
  env: process.env,
  shell: false
});

child.stdout.on("data", (chunk) => {
  process.stdout.write(chunk);
  chunks.push(chunk);
});

child.stderr.on("data", (chunk) => {
  process.stderr.write(chunk);
  chunks.push(chunk);
});

child.on("close", async (code) => {
  const output = cleanOutput(Buffer.concat(chunks).toString("utf8"));
  const finishedAt = new Date();
  const status = code === 0 ? "passed" : "failed";
  const report = {
    status,
    exitCode: code,
    lastRunAt: finishedAt.toISOString(),
    durationMs: finishedAt.getTime() - startedAt.getTime(),
    summary: status === "passed" ? "Alle Tests erfolgreich." : "Mindestens ein Test ist fehlgeschlagen.",
    suites: buildSuiteDetails(output, status),
    command: "pnpm test:status",
    outputTail: output.split(/\r?\n/).filter(Boolean).slice(-40)
  };

  await writeFile(resolve(process.cwd(), ".test-status.json"), `${JSON.stringify(report, null, 2)}\n`, "utf8");
  process.exit(code ?? 1);
});

function buildSuiteDetails(output, status) {
  const lines = output.split(/\r?\n/).filter(Boolean);
  const webLines = lines.filter((line) => line.startsWith("apps/web test:"));
  const apiLines = lines.filter((line) => line.startsWith("apps/api test:"));

  return [
    {
      name: "API",
      framework: "Jest",
      status: output.includes("apps/api test: PASS") || status === "passed" ? "passed" : status,
      testFiles: parseJestFiles(apiLines),
      tests: parseJestTests(apiLines),
      stats: parseJestStats(apiLines),
      outputTail: apiLines.slice(-20).map(stripWorkspacePrefix)
    },
    {
      name: "Web",
      framework: "Vitest",
      status: output.includes("apps/web test:") && status === "passed" ? "passed" : status,
      testFiles: parseVitestFiles(webLines),
      tests: parseVitestTests(webLines),
      stats: parseVitestStats(webLines),
      outputTail: webLines.slice(-20).map(stripWorkspacePrefix)
    }
  ];
}

function stripWorkspacePrefix(line) {
  return line.replace(/^apps\/(api|web) test:\s?/, "");
}

function parseJestFiles(lines) {
  return lines
    .map(stripWorkspacePrefix)
    .filter((line) => line.startsWith("PASS "))
    .map((line) => {
      const match = line.match(/^PASS\s+(.+?)(?:\s+\((.+)\))?$/);
      return {
        file: match?.[1] ?? line.replace(/^PASS\s+/, ""),
        duration: match?.[2] ?? null,
        status: "passed"
      };
    });
}

function parseJestTests(lines) {
  return lines
    .map(stripWorkspacePrefix)
    .map((line) => line.match(/^\s+(?:√|✓)\s+(.+?)(?:\s+\((.+)\))?$/))
    .filter(Boolean)
    .map((match) => ({
      name: match[1],
      duration: match[2] ?? null,
      status: "passed"
    }));
}

function parseJestStats(lines) {
  return lines
    .map(stripWorkspacePrefix)
    .filter((line) => /^(Test Suites|Tests|Snapshots|Time):/.test(line));
}

function parseVitestFiles(lines) {
  return lines
    .map(stripWorkspacePrefix)
    .filter((line) => line.includes("✓") && line.includes(".test."))
    .map((line) => {
      const match = line.match(/✓\s+(.+?)\s+\((.+?)\)(?:\s+(.+))?$/);
      return {
        file: match?.[1] ?? line,
        duration: match?.[3]?.trim() ?? null,
        status: "passed",
        testCount: match?.[2] ?? null
      };
    });
}

function parseVitestTests(lines) {
  return parseVitestFiles(lines).map((file) => ({
    name: file.testCount ?? "Tests",
    duration: file.duration,
    status: file.status
  }));
}

function parseVitestStats(lines) {
  return lines
    .map(stripWorkspacePrefix)
    .filter((line) => /^(Test Files|Tests|Duration|Start at)/.test(line));
}

function cleanOutput(value) {
  return value
    .replace(/\u001b\[[0-9;]*m/g, "")
    .replace(/\u001b\[[0-9;]*[A-Za-z]/g, "")
    .replaceAll("âœ“", "✓")
    .replaceAll("âˆš", "√");
}
