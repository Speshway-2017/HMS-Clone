import fs from "fs";
import path from "path";

async function auditModules() {
  const controllersDir = path.join(__dirname, "../src/controllers");
  const files = fs.readdirSync(controllersDir).filter(f => f.endsWith(".ts"));

  console.log("=== CONTROLLER METHOD HOSPITAL FILTER USAGE ===");
  for (const file of files) {
    const filePath = path.join(controllersDir, file);
    const content = fs.readFileSync(filePath, "utf-8");
    const lines = content.split("\n");

    lines.forEach((line, idx) => {
      if (line.includes("req.hospitalFilter") || line.includes("req.user.hospital") || line.includes("buildBranchQuery")) {
        console.log(`${file.padEnd(30)}:L${(idx + 1).toString().padEnd(4)} -> ${line.trim()}`);
      }
    });
  }
}

auditModules();
