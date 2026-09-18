import fs from 'fs';

function cleanModule(code) {
  return code
    .replace(/^import\s+[\s\S]*?from\s+['"][^'"]+['"];?\s*$/gm, '')
    .replace(/^import\s+['"][^'"]+['"];?\s*$/gm, '')
    .replace(/^export\s+default\s+[^;]+;?\s*$/gm, '')
    .replace(/^export\s*\{[\s\S]*?\};?\s*$/gm, '')
    .replace(/^export\s+(async\s+)?function\b/gm, '$1function')
    .replace(/^export\s+const\b/gm, 'const')
    .replace(/^export\s+let\b/gm, 'let')
    .replace(/^export\s+class\b/gm, 'class');
}

const header = '// HireEngine Standalone Platform Bundle (Works on both http:// and file:// protocols)\n\n';
const files = [
  'dataModels.js',
  'complianceEngine.js',
  'dispatchEngine.js',
  'complianceModule.js',
  'app.js'
];

let bundle = header;
for (const f of files) {
  bundle += `\n/**\n * ${f}\n */\n\n`;
  bundle += cleanModule(fs.readFileSync(f, 'utf8'));
}

fs.writeFileSync('app_bundled.js', bundle, 'utf8');
console.log('Successfully generated app_bundled.js (' + bundle.length + ' bytes)');
