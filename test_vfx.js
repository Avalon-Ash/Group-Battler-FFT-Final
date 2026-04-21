const fs = require('fs');
const shared = fs.readFileSync('data/vfx/registry/shared.ts', 'utf8');
const cov = fs.readFileSync('data/vfx/registry/covenant.ts', 'utf8');
const imp = fs.readFileSync('data/vfx/registry/imperial.ts', 'utf8');
const all = shared + cov + imp;
if (all.includes('lifetime') ) {
   console.log("All good");
}
