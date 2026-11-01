const fs = require("node:fs");
const { loadTS } = require("./load-ts.cjs");
const { summarizeFunnel } = loadTS("lib/funnel-report.ts");

const file = process.argv.indexOf("--events");
const since = process.argv.indexOf("--since");
const days = process.argv.indexOf("--days");
try {
  if (file < 0 || since < 0 || !process.argv[file + 1] || !process.argv[since + 1]) throw new Error("Usage: npm run funnel:report -- --events <private-metadata-export.json> --since <ISO-UTC-date>");
  const json = JSON.parse(fs.readFileSync(process.argv[file + 1], "utf8"));
  const rows = Array.isArray(json) ? json : Array.isArray(json.results) && Array.isArray(json.columns)
    ? json.results.map(row => Object.fromEntries(json.columns.map((column, index) => [column, row[index]]))) : null;
  if (!rows || rows.length > 500000) throw new Error("Provide a JSON array or a PostHog query result with columns/results (max 500,000 rows).");
  const metadata = rows.map(row => row && typeof row === "object" ? { ...row,
    new_task: row.new_task === true || row.new_task === "true" || row.new_task === 1,
    live_mode: row.live_mode === true || row.live_mode === "true" || row.live_mode === 1,
  } : row);
  console.log(JSON.stringify(summarizeFunnel(metadata, process.argv[since + 1], days < 0 ? 30 : Number(process.argv[days + 1])), null, 2));
} catch (error) {
  console.error(error?.code ? "Could not read the private metadata export." : error instanceof SyntaxError ? "Invalid JSON export." : error.message);
  process.exitCode = 1;
}
