import fs from "fs";
import path from "path";

const controllersDir = path.join(__dirname, "../src/controllers");
const files = fs.readdirSync(controllersDir);

console.log("Auditing Controller Queries for Branch Scoping:\n");

for (const file of files) {
  if (!file.endsWith(".ts")) continue;
  const content = fs.readFileSync(path.join(controllersDir, file), "utf8");
  const lines = content.split("\n");

  const unScoped: string[] = [];

  lines.forEach((line, idx) => {
    // Look for Mongoose model queries that use find/findOne/findById without buildBranchQuery/toFilter/req.tenantContext/req.hospitalFilter
    if (/\b[A-Z][a-zA-Z0-9]+\.(find|findOne|findById|findOneAndUpdate|findByIdAndUpdate|findOneAndDelete|aggregate|countDocuments)\(/.test(line)) {
      if (!line.includes("req.hospitalFilter") && !line.includes("buildBranchQuery") && !line.includes("toFilter") && !line.includes("tenantContext") && !line.includes("scope")) {
        unScoped.push(`Line ${idx + 1}: ${line.trim()}`);
      }
    }
  });

  if (unScoped.length > 0) {
    console.log(`=== ${file} (${unScoped.length} potential issues) ===`);
    unScoped.slice(0, 5).forEach(l => console.log("  " + l));
  }
}
