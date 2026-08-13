import fs from "fs";
import path from "path";

function scanDirectory(dir: string, pattern: RegExp, label: string) {
  console.log(`\n=== SCAN: ${label} in ${path.basename(dir)} ===`);
  const files = fs.readdirSync(dir).filter(f => f.endsWith(".ts"));
  for (const file of files) {
    const filePath = path.join(dir, file);
    const content = fs.readFileSync(filePath, "utf-8");
    const lines = content.split("\n");
    lines.forEach((line, idx) => {
      if (pattern.test(line)) {
        console.log(`${file}:${idx + 1} -> ${line.trim()}`);
      }
    });
  }
}

async function auditBackend() {
  const controllersDir = path.join(__dirname, "../src/controllers");
  const repositoriesDir = path.join(__dirname, "../src/repositories");
  const servicesDir = path.join(__dirname, "../src/services");

  // 1. Check where req.hospitalFilter.hospital or req.hospitalFilter?.hospital is extracted (stripping branch)
  scanDirectory(controllersDir, /req\.hospitalFilter(\!\.)?\.hospital/i, "Stripped hospitalId from req.hospitalFilter");

  // 2. Check where find/findOne uses only { hospital } without buildBranchQuery or branch
  scanDirectory(repositoriesDir, /\.find(One)?\(\s*\{\s*hospital/i, "Repository queries matching only { hospital } without branch");
  scanDirectory(servicesDir, /\.find(One)?\(\s*\{\s*hospital/i, "Service queries matching only { hospital } without branch");
}

auditBackend();
