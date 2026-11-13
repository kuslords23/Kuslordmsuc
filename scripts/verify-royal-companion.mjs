import fs from "node:fs";

const studio = fs.readFileSync("src/components/Studio.tsx", "utf8");
const env = fs.readFileSync(".env.example", "utf8");
const checks = [
  ["Music Studio calls the shared Royal companion gateway", studio.includes("/api/royal/companion")],
  ["Music identifies itself with the server-owned music profile", studio.includes("companionId: 'music'")],
  ["Music sends the current Supabase access token", studio.includes("x-supabase-auth") && studio.includes("supabase.auth.getSession()")],
  ["Music API base URL is configurable", studio.includes("VITE_ROYAL_API_URL") && env.includes("VITE_ROYAL_API_URL=")],
  ["Music no longer calls its former standalone assistant endpoint", !studio.includes("/api/studio/assistant")],
];
let failed = 0;
for (const [label, passed] of checks) {
  console.log(`${passed ? "PASS" : "FAIL"} ${label}`);
  if (!passed) failed++;
}
if (failed) process.exit(1);
console.log(`All ${checks.length} Music companion checks passed.`);
