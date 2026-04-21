import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Evaluate using tsx or similar
async function check() {
    const files = fs.readdirSync('data/vfx/registry').filter(f => f.endsWith('.ts'));
    let totalEmitters = 0;
    let missingLifetimes = 0;
    for (const f of files) {
        // Can't easily import ES modules via script without proper setup, so we will use regex to find `{...lifetime...}` instead.
        const content = fs.readFileSync(path.join('data/vfx/registry', f), 'utf8');
        
        let inEmitters = false;
        let pCounter = 0;
        let buf = "";
        for(let i=0; i<content.length; i++) {
            if (content.substring(i, i+9) === "emitters:") {
                inEmitters = true;
                i += 8;
                continue;
            }
            if (!inEmitters) continue;
            
            if (content[i] === '[') {
                pCounter++;
            } else if (content[i] === ']') {
                pCounter--;
                if (pCounter === 0) {
                    inEmitters = false;
                }
            }
        }
    }
}
