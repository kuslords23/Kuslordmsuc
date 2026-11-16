import fs from "node:fs";

const royal = fs.readFileSync("src/components/RoyalCompanion.tsx", "utf8");
const studio = fs.readFileSync("src/components/Studio.tsx", "utf8");
const env = fs.readFileSync(".env.example", "utf8");
const checks = [
  ["Music Royal companion calls the shared Royal gateway", royal.includes("/api/royal/companion")],
  ["Music uses the server-owned music companion profile", royal.includes('companionId: "music"')],
  ["Music sends the current Supabase access token", royal.includes("x-supabase-auth") && royal.includes("supabase.auth.getSession()")],
  ["Music Royal API base URL is configurable", royal.includes("VITE_ROYAL_API_URL") && env.includes("VITE_ROYAL_API_URL=")],
  ["Music Studio opens the shared Royal companion interface", studio.includes("kus-open-royal") && studio.includes("Open Royal companion")],
  ["Music no longer calls its former standalone assistant endpoint", !studio.includes("/api/studio/assistant")],
];
let failed = 0;
for (const [label, passed] of checks) {
  console.log(`${passed ? "PASS" : "FAIL"} ${label}`);
  if (!passed) failed++;
}
if (failed) process.exit(1);
console.log(`All ${checks.length} Music companion checks passed.`);
