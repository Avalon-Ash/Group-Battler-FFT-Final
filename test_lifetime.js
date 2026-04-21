import fs from 'fs';
import path from 'path';

// read all files in data/vfx/registry/
const files = fs.readdirSync('data/vfx/registry').filter(f => f.endsWith('.ts'));

let issues = 0;
for (const file of files) {
    const text = fs.readFileSync(path.join('data/vfx/registry', file), 'utf8');
    // find all objects inside emitters array
    let inEmitter = false;
    let emitterBlock = "";
    let effectId = "";
    
    // Quick regex to find effect IDs
    const idRegex = /'([^']+)'\s*:\s*\{/g;
    let match;
    const blocks = [];
    
    let parts = text.split("emitters: [");
    for (let i = 1; i < parts.length; i++) {
        let inside = parts[i].split("]")[0];
        if (!inside.includes("lifetime:")) {
            console.log(`[!] ISSUE in ${file} around line ` + text.substring(0, text.indexOf(inside)).split('\n').length);
            issues++;
        }
        
        // Also check if lifetime: is followed by missing values
        const lines = inside.split('\n');
        for (const line of lines) {
            if (line.includes('{') && !line.includes('lifetime:')) {
                console.log(`[!] ISSUE in ${file} missing lifetime in line: ${line.trim()}`);
                issues++;
            }
        }
    }
}
if (issues === 0) console.log("All lifetimes are valid.");
