const fs = require('fs');

const files = [
    'data/vfx/registry/shared.ts',
    'data/vfx/registry/imperial.ts',
    'data/vfx/registry/covenant.ts',
    'data/vfx/VFXRegistry.ts'
];

let issues = [];

files.forEach(file => {
    if (!fs.existsSync(file)) return;
    const content = fs.readFileSync(file, 'utf8');
    const lines = content.split('\n');
    lines.forEach((line, index) => {
        if (line.includes('particleType:')) {
            if (!line.includes('lifetime:')) {
                issues.push(`${file}:${index + 1} -> ${line.trim()}`);
            }
        }
    });
});

console.log("Missing lifetime on lines:");
console.log(issues.join('\n'));
