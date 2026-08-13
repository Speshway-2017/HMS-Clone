import fs from 'fs';
import path from 'path';

const filePath = `c:/Users/DELL/Desktop/Hospitam Management System/Hospital-management-system/mobile_app/lib/features/admin/screens/admin_dashboard.dart`;
const content = fs.readFileSync(filePath, 'utf8');
const lines = content.split('\n');

console.log("Total lines before trim:", lines.length);

// Keep lines 0 to 2506 (which is 2507 lines) and append closing brace }
const trimmedLines = lines.slice(0, 2507);
trimmedLines.push('}');

fs.writeFileSync(filePath, trimmedLines.join('\n'), 'utf8');
console.log("Trimmed file written. Total lines now:", trimmedLines.length);
