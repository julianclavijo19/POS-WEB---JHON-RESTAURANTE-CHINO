const fs = require('fs');
const content = fs.readFileSync('src/app/admin/settings/page.tsx', 'utf8');
const lines = content.split('\n');

let braceCount = 0;
let parenCount = 0;
let funcStart = -1;

for (let i = 0; i < Math.min(280, lines.length); i++) {
  const line = lines[i];
  
  if (line.includes('export default function')) {
    funcStart = i;
    console.log(`Function start at line ${i + 1}`);
  }
  
  for (const char of line) {
    if (char === '{') braceCount++;
    if (char === '}') braceCount--;
    if (char === '(') parenCount++;
    if (char === ')') parenCount--;
  }
  
  if (i >= funcStart && funcStart !== -1 && i < 280) {
    if (braceCount !== 0 || parenCount !== 0 || line.includes('return') || line.includes('const ')) {
      console.log(`Line ${(i + 1).toString().padStart(3, ' ')}: {${braceCount.toString().padStart(2, ' ')}} (${parenCount.toString().padStart(2, ' ')}) ${line.substring(0, 70)}`);
    }
  }
}

console.log(`\nAt line 280: Braces=${braceCount}, Parens=${parenCount}`);
