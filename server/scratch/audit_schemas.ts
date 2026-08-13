import fs from "fs";
import path from "path";

async function auditSchemas() {
  const modelsDir = path.join(__dirname, "../src/models");
  const files = fs.readdirSync(modelsDir).filter(f => f.endsWith(".ts"));

  console.log("MODEL | HAS_HOSPITAL | HAS_BRANCH | REF_TYPES");
  console.log("--------------------------------------------------");

  for (const file of files) {
    const filePath = path.join(modelsDir, file);
    const content = fs.readFileSync(filePath, "utf-8");

    const hasHospital = content.includes("hospital:") || content.includes("hospital ");
    const hasBranch = content.includes("branch:") || content.includes("branch ");

    console.log(`${file.replace(".ts", "").padEnd(25)} | ${hasHospital ? "YES" : " NO"} | ${hasBranch ? "YES" : " NO"}`);
  }
}

auditSchemas();
