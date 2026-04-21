import fs from 'fs';
import path from 'path';

const files = fs.readdirSync('data/vfx/registry').filter(f => f.endsWith('.ts'));
const lifetimes = new Set();
for (const f of files) {
    const text = fs.readFileSync(path.join('data/vfx/registry', f), 'utf8');
    const regex = /lifetime:\s*([^,}]+)/g;
    let match;
    while(match = regex.exec(text)) {
        lifetimes.add(match[1].trim());
    }
}
console.log(Array.from(lifetimes).join('\n'));
