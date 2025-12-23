
const cache: Map<string, HTMLCanvasElement> = new Map();

// Dimensions
const ICON_SIZE = 32;
const VFX_SIZE = 64;
const MAGIC_CIRCLE_SIZE = 128;
const PROJ_WIDTH = 96;
const PROJ_HEIGHT = 64;
const BLAST_WIDTH = 128;
const BLAST_HEIGHT = 64;
const STATUS_SIZE = 48;
const FOG_SIZE = 256; // New large sprite for fog

function createCanvas(w: number, h: number) {
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d')!; 
    ctx.imageSmoothingEnabled = true; 
    return { canvas, ctx };
}

// --- Generators ---

const generateGlowOrb = (color: string, size: number = VFX_SIZE): HTMLCanvasElement => {
     const { canvas, ctx } = createCanvas(size, size);
     const cx = size / 2;
     const cy = size / 2;
     const r = size / 2;
     
     // Core Glow
     const grad = ctx.createRadialGradient(cx, cy, r * 0.1, cx, cy, r);
     grad.addColorStop(0, '#fff');        // Core White
     grad.addColorStop(0.2, color);       // Mid Color
     grad.addColorStop(1, 'transparent'); // Edge
     
     ctx.fillStyle = grad;
     ctx.beginPath(); 
     ctx.arc(cx, cy, r, 0, Math.PI * 2); 
     ctx.fill();
     
     return canvas;
};

// New: Pre-blurred fog cloud to avoid ctx.filter='blur()'
const generateFogCloud = (color: string): HTMLCanvasElement => {
    const { canvas, ctx } = createCanvas(FOG_SIZE, FOG_SIZE);
    const cx = FOG_SIZE / 2;
    const cy = FOG_SIZE / 2;
    
    // Create a soft cloud shape
    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, FOG_SIZE / 2);
    grad.addColorStop(0, color);
    grad.addColorStop(0.6, color);
    grad.addColorStop(1, 'transparent');
    
    ctx.fillStyle = grad;
    // Draw multiple overlapping circles to form a cloud
    ctx.globalAlpha = 0.5;
    ctx.beginPath(); ctx.arc(cx, cy, FOG_SIZE * 0.4, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(cx - 30, cy + 20, FOG_SIZE * 0.25, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(cx + 30, cy - 20, FOG_SIZE * 0.3, 0, Math.PI*2); ctx.fill();
    
    return canvas;
};

const generateMagicCircle = (color: string, isUlt: boolean): HTMLCanvasElement => {
    const { canvas, ctx } = createCanvas(MAGIC_CIRCLE_SIZE, MAGIC_CIRCLE_SIZE);
    const cx = MAGIC_CIRCLE_SIZE / 2;
    const cy = MAGIC_CIRCLE_SIZE / 2;
    const radius = 50;
    
    ctx.shadowColor = color;
    ctx.shadowBlur = 10;
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;

    // Outer Ring
    ctx.beginPath(); 
    ctx.arc(cx, cy, radius, 0, Math.PI * 2); 
    ctx.stroke();
    
    // Inner Runes/Shapes
    ctx.lineWidth = 1;
    if (isUlt) {
        // Hexagram for Ultimates
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
            const angle = (i * Math.PI * 2) / 6;
            const x = cx + Math.cos(angle) * radius;
            const y = cy + Math.sin(angle) * radius;
            const x2 = cx + Math.cos(angle + 2 * Math.PI / 3) * radius;
            const y2 = cy + Math.sin(angle + 2 * Math.PI / 3) * radius;
            ctx.moveTo(x, y); 
            ctx.lineTo(x2, y2);
        }
        ctx.stroke();
        
        // Solid Inner Glow
        ctx.fillStyle = color;
        ctx.globalAlpha = 0.2;
        ctx.beginPath(); 
        ctx.arc(cx, cy, 20, 0, Math.PI * 2); 
        ctx.fill();
    } else {
        // Simple Triangle for Basic/Active
        ctx.beginPath();
        ctx.moveTo(cx, cy - radius);
        ctx.lineTo(cx + 43, cy + 25);
        ctx.lineTo(cx - 43, cy + 25);
        ctx.closePath();
        ctx.stroke();
    }

    return canvas;
};

const generateWarningRune = (): HTMLCanvasElement => {
    const { canvas, ctx } = createCanvas(128, 64);
    const cx = 64;
    const cy = 32;
    
    const color = '#ef4444'; // Red
    ctx.shadowColor = color;
    ctx.shadowBlur = 15;
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    
    // Perspective Squash
    ctx.scale(1, 0.5); 
    
    // Outer Circle
    ctx.beginPath(); 
    ctx.arc(cx, cy * 2, 40, 0, Math.PI * 2); 
    ctx.stroke();
    
    // X Mark
    ctx.beginPath();
    ctx.moveTo(cx - 20, cy * 2 - 20); 
    ctx.lineTo(cx + 20, cy * 2 + 20);
    ctx.moveTo(cx + 20, cy * 2 - 20); 
    ctx.lineTo(cx - 20, cy * 2 + 20);
    ctx.stroke();
    
    // Fill
    ctx.fillStyle = color;
    ctx.globalAlpha = 0.3;
    ctx.beginPath(); 
    ctx.arc(cx, cy * 2, 35, 0, Math.PI * 2); 
    ctx.fill();

    return canvas;
};

const generateProjectileSprite = (visual: string, color: string): HTMLCanvasElement => {
    const { canvas, ctx } = createCanvas(PROJ_WIDTH, PROJ_HEIGHT);
    const cx = PROJ_WIDTH / 2;
    const cy = PROJ_HEIGHT / 2;

    ctx.shadowColor = color;
    ctx.shadowBlur = 15;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    switch (visual) {
        case 'ARROW':
            // Shaft
            ctx.strokeStyle = '#e2e8f0'; 
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(10, cy);
            ctx.lineTo(80, cy);
            ctx.stroke();

            // Head
            ctx.fillStyle = '#f8fafc';
            ctx.beginPath();
            ctx.moveTo(80, cy);
            ctx.lineTo(65, cy - 8);
            ctx.lineTo(70, cy); 
            ctx.lineTo(65, cy + 8);
            ctx.closePath();
            ctx.fill();
            
            // Fletching (Energy Color)
            ctx.strokeStyle = color;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(15, cy); ctx.lineTo(5, cy - 8);
            ctx.moveTo(25, cy); ctx.lineTo(15, cy - 8);
            ctx.moveTo(15, cy); ctx.lineTo(5, cy + 8);
            ctx.moveTo(25, cy); ctx.lineTo(15, cy + 8);
            ctx.stroke();
            break;

        case 'FIREBALL':
            // Trail Gradient
            const grad = ctx.createLinearGradient(cx + 20, cy, 0, cy);
            grad.addColorStop(0, color);
            grad.addColorStop(1, 'transparent');
            
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.ellipse(cx - 10, cy, 40, 15, 0, 0, Math.PI * 2);
            ctx.fill();

            // Core
            ctx.fillStyle = '#fff';
            ctx.shadowBlur = 20;
            ctx.beginPath();
            ctx.arc(cx + 25, cy, 10, 0, Math.PI * 2);
            ctx.fill();
            break;

        case 'BOMB':
            // Round bomb body
            ctx.fillStyle = '#1c1917'; // Dark Iron
            ctx.shadowColor = '#000';
            ctx.shadowBlur = 5;
            ctx.beginPath(); ctx.arc(cx, cy, 12, 0, Math.PI*2); ctx.fill();
            
            // Highlight
            ctx.fillStyle = '#57534e';
            ctx.beginPath(); ctx.arc(cx - 4, cy - 4, 4, 0, Math.PI*2); ctx.fill();
            
            // Fuse
            ctx.strokeStyle = '#d6d3d1';
            ctx.lineWidth = 2;
            ctx.beginPath(); ctx.moveTo(cx, cy - 12); ctx.quadraticCurveTo(cx + 5, cy - 18, cx + 10, cy - 15); ctx.stroke();
            
            // Spark
            ctx.fillStyle = color; // Glow Color
            ctx.shadowColor = color; ctx.shadowBlur = 10;
            ctx.beginPath(); ctx.arc(cx + 10, cy - 15, 3, 0, Math.PI*2); ctx.fill();
            break;

        case 'BOLT':
        default:
            // Outer Glow - SHARPENED
            const boltGrad = ctx.createRadialGradient(cx, cy, 5, cx, cy, 22); // Reduced from 30
            boltGrad.addColorStop(0, '#fff');
            boltGrad.addColorStop(0.3, color);
            boltGrad.addColorStop(1, 'transparent');
            ctx.fillStyle = boltGrad;
            ctx.beginPath(); 
            ctx.arc(cx, cy, 22, 0, Math.PI * 2); // Reduced from 30
            ctx.fill();

            // Diamond Core
            ctx.fillStyle = '#fff';
            ctx.shadowColor = '#fff';
            ctx.shadowBlur = 10;
            ctx.beginPath();
            ctx.moveTo(cx + 20, cy);
            ctx.lineTo(cx, cy - 10);
            ctx.lineTo(cx - 20, cy);
            ctx.lineTo(cx, cy + 10);
            ctx.closePath();
            ctx.fill();
            
            // Electric Arcs
            ctx.strokeStyle = color;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(cx - 25, cy); ctx.lineTo(cx - 35, cy - 5);
            ctx.moveTo(cx + 25, cy); ctx.lineTo(cx + 35, cy + 5);
            ctx.stroke();
            break;
    }

    return canvas;
};

const generateBlastZone = (color: string): HTMLCanvasElement => {
    const { canvas, ctx } = createCanvas(BLAST_WIDTH, BLAST_HEIGHT); 
    const cx = BLAST_WIDTH / 2;
    const cy = BLAST_HEIGHT / 2;
    
    // Perspective
    ctx.scale(1, 0.5); 
    
    // Scorch Mark Gradient
    const grad = ctx.createRadialGradient(cx, cy * 2, 0, cx, cy * 2, 50);
    grad.addColorStop(0, '#1c1917'); // Black center
    grad.addColorStop(0.6, '#1c1917');
    grad.addColorStop(1, 'transparent');
    
    ctx.fillStyle = grad;
    ctx.globalAlpha = 0.8;
    ctx.beginPath();
    ctx.arc(cx, cy * 2, 50, 0, Math.PI * 2);
    ctx.fill();
    
    // Cracked Edges
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.globalAlpha = 1.0;
    
    for (let i = 0; i < 8; i++) {
        const angle = i * (Math.PI / 4) + (Math.random() - 0.5);
        const dist = 10 + Math.random() * 20;
        
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(angle) * 10, cy * 2 + Math.sin(angle) * 10);
        ctx.lineTo(cx + Math.cos(angle) * (dist + 20), cy * 2 + Math.sin(angle) * (dist + 20));
        
        // Branching crack
        if (Math.random() > 0.5) {
             ctx.lineTo(cx + Math.cos(angle + 0.3) * (dist + 35), cy * 2 + Math.sin(angle + 0.3) * (dist + 35));
        }
        
        ctx.stroke();
    }
    
    // Center Glow
    ctx.fillStyle = color;
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 0.4;
    ctx.beginPath();
    ctx.arc(cx, cy * 2, 20, 0, Math.PI * 2);
    ctx.fill();

    return canvas;
};

const generateSkillIcon = (visual: string, color: string): HTMLCanvasElement => {
    const { canvas, ctx } = createCanvas(ICON_SIZE, ICON_SIZE);
    
    // Background Frame
    ctx.fillStyle = '#1e293b'; 
    ctx.fillRect(0, 0, ICON_SIZE, ICON_SIZE);
    
    ctx.strokeStyle = '#334155'; 
    ctx.strokeRect(0, 0, ICON_SIZE, ICON_SIZE);
    
    // Symbol
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '20px Arial';
    ctx.fillStyle = color;
    ctx.shadowColor = color; 
    ctx.shadowBlur = 5;
    
    let symbol = '●';
    switch (visual) {
        case 'SLASH': symbol = '⚔️'; break;
        case 'ARROW': symbol = '🏹'; break;
        case 'FIREBALL': symbol = '🔥'; break;
        case 'BOLT': symbol = '⚡'; break;
        case 'BEAM': symbol = '✨'; break;
        case 'SMASH': symbol = '🔨'; break;
        case 'BOMB': symbol = '💣'; break;
    }

    ctx.fillText(symbol, ICON_SIZE / 2, ICON_SIZE / 2 + 2); // +2 for visual centering
    return canvas;
};

const generateStatusIcon = (type: string): HTMLCanvasElement => {
    const { canvas, ctx } = createCanvas(STATUS_SIZE, STATUS_SIZE);
    const cx = STATUS_SIZE / 2;
    const cy = STATUS_SIZE / 2;
    
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = 'bold 28px sans-serif';
    ctx.shadowBlur = 5;

    switch (type) {
        case 'STUN':
            ctx.shadowColor = '#facc15';
            ctx.fillStyle = '#facc15';
            ctx.fillText('💫', cx, cy);
            break;
        case 'SILENCE':
            ctx.shadowColor = '#94a3b8';
            ctx.fillStyle = '#e2e8f0';
            // Speech bubble
            ctx.font = 'bold 24px sans-serif';
            ctx.fillText('💬', cx, cy);
            ctx.font = 'bold 12px sans-serif';
            ctx.fillStyle = '#0f172a';
            ctx.fillText('...', cx, cy - 2);
            break;
        case 'POISON': // DoT
            ctx.shadowColor = '#22c55e';
            ctx.fillStyle = '#4ade80';
            ctx.fillText('☠️', cx, cy);
            break;
        case 'BURN': // DoT
            ctx.shadowColor = '#ef4444';
            ctx.fillStyle = '#f87171';
            ctx.fillText('🔥', cx, cy);
            break;
        case 'REGEN': // HoT
            ctx.shadowColor = '#4ade80';
            ctx.fillStyle = '#86efac';
            ctx.fillText('➕', cx, cy);
            break;
        case 'BANISH':
            ctx.shadowColor = '#c084fc';
            ctx.fillStyle = '#d8b4fe';
            ctx.fillText('👻', cx, cy);
            break;
    }

    return canvas;
};

export const AssetManager = {
    // VFX: Generic Glow Particles
    getVFX(visual: string, color: string): HTMLCanvasElement {
         const key = `VFX_ORB_${color}`;
         if (!cache.has(key)) cache.set(key, generateGlowOrb(color));
         return cache.get(key)!;
    },
    
    // New: Optimized Glow Sprite (Small) for replacement of shadowBlur
    getGlowSprite(color: string): HTMLCanvasElement {
        const key = `GLOW_SPRITE_${color}`;
        if (!cache.has(key)) cache.set(key, generateGlowOrb(color, 64));
        return cache.get(key)!;
    },

    // New: Pre-rendered Fog
    getFogCloud(color: string): HTMLCanvasElement {
        const key = `FOG_${color}`;
        if (!cache.has(key)) cache.set(key, generateFogCloud(color));
        return cache.get(key)!;
    },
    
    // VFX: Projectiles
    getProjectile(visual: string, color: string): HTMLCanvasElement {
        const key = `PROJ_${visual}_${color}`;
        if (!cache.has(key)) {
            // Fallback to BOLT if unknown
            const v = ['ARROW', 'FIREBALL', 'BOLT', 'BOMB'].includes(visual) ? visual : 'BOLT';
            cache.set(key, generateProjectileSprite(v, color));
        }
        return cache.get(key)!;
    },
    
    // UI: Skill Icons
    getSkillIcon(visual: string, color: string): HTMLCanvasElement {
        const key = `SK_ICON_${visual}_${color}`;
        if (!cache.has(key)) cache.set(key, generateSkillIcon(visual, color));
        return cache.get(key)!;
    },
    
    // UI: Status Icons
    getStatusIcon(type: string): HTMLCanvasElement {
        const key = `STATUS_${type}`;
        if (!cache.has(key)) cache.set(key, generateStatusIcon(type));
        return cache.get(key)!;
    },
    
    // VFX: Ground Decals
    getBlastZone(color: string): HTMLCanvasElement {
        const key = `BLAST_${color}_V2`; // V2 for updated style
        if (!cache.has(key)) cache.set(key, generateBlastZone(color));
        return cache.get(key)!;
    },

    // VFX: Casting Circles
    getMagicCircle(color: string, isUlt: boolean): HTMLCanvasElement {
        const key = `MAGIC_CIRCLE_${color}_${isUlt}`;
        if (!cache.has(key)) cache.set(key, generateMagicCircle(color, isUlt));
        return cache.get(key)!;
    },

    // VFX: Danger Indicators
    getWarningRune(): HTMLCanvasElement {
        const key = 'WARNING_RUNE';
        if (!cache.has(key)) cache.set(key, generateWarningRune());
        return cache.get(key)!;
    }
};
