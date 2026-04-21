import fs from 'fs';
import path from 'path';

const files = fs.readdirSync('data/vfx/registry').filter(f => f.endsWith('.ts'));
const pTypes = new Set();
for (const f of files) {
    const text = fs.readFileSync(path.join('data/vfx/registry', f), 'utf8');
    const regex = /particleType:\s*'([^']+)'/g;
    let match;
    while(match = regex.exec(text)) {
        pTypes.add(match[1]);
    }
}
console.log("Particle Types:", Array.from(pTypes));
