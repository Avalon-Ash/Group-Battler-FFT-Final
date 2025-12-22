
import { Role, Team } from "../types";
import { PALETTE, OBSTACLE_STYLES } from "../constants";

const cache: Map<string, any> = new Map();

// Dimensions
const BASE_SIZE = 128;
const ICON_SIZE = 64;
const WEAPON_SIZE = 128;

function createCanvas(w: number, h: number) {
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d')!;
    ctx.imageSmoothingEnabled = true; 
    return { canvas, ctx };
}

export interface UnitAssets {
    base: HTMLCanvasElement; // Pre-rendered base
    weapon: HTMLCanvasElement; // Pre-rendered weapon
    icon: HTMLCanvasElement;   // Pre-rendered class icon
    color: string;           // Glow color
}

// ==========================================
// 1. Base Generation (Ground Plate)
// ==========================================
const generateTokenBase = (team: Team): HTMLCanvasElement => {
    const { canvas, ctx } = createCanvas(BASE_SIZE, BASE_SIZE);
    const cx = BASE_SIZE / 2;
    const cy = BASE_SIZE / 2 + 15; // Offset slightly down
    const rx = 40;
    const ry = 20; 
    const height = 16; 
    
    // Drop Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.beginPath(); 
    ctx.ellipse(cx, cy + 5, rx + 6, ry + 6, 0, 0, Math.PI * 2); 
    ctx.fill();

    if (team === Team.RED) {
        // --- HORDE STYLE (Spiked, Iron, Crimson) ---
        ctx.fillStyle = '#1c1917'; 
        
        // Spikes
        for (let i = 0; i < 6; i++) {
            const angle = (i * Math.PI * 2) / 6;
            const sx = cx + Math.cos(angle) * (rx + 5);
            const sy = cy + Math.sin(angle) * (ry + 5);
            ctx.beginPath();
            ctx.moveTo(sx, sy);
            ctx.lineTo(sx + Math.cos(angle) * 15, sy + Math.sin(angle) * 15 - 10); 
            ctx.lineTo(sx + Math.cos(angle + 0.2) * 5, sy + Math.sin(angle + 0.2) * 5);
            ctx.fill();
        }
        
        // Side (Thickness)
        const gradSide = ctx.createLinearGradient(0, cy - height, 0, cy + ry);
        gradSide.addColorStop(0, '#450a0a'); 
        gradSide.addColorStop(0.5, '#1c1917'); 
        gradSide.addColorStop(1, '#450a0a');
        ctx.fillStyle = gradSide;
        
        ctx.beginPath(); 
        ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI, false); 
        ctx.lineTo(cx + rx, cy - height); 
        ctx.ellipse(cx, cy - height, rx, ry, 0, 0, Math.PI, true); 
        ctx.lineTo(cx - rx, cy); 
        ctx.fill();

        // Top Surface
        ctx.fillStyle = '#7f1d1d'; 
        ctx.beginPath(); 
        ctx.ellipse(cx, cy - height, rx, ry, 0, 0, Math.PI * 2); 
        ctx.fill();
        
        // Iron Rim
        ctx.strokeStyle = '#a1a1aa'; 
        ctx.lineWidth = 4; 
        ctx.beginPath(); 
        ctx.ellipse(cx, cy - height, rx - 2, ry - 2, 0, 0, Math.PI * 2); 
        ctx.stroke();

    } else {
        // --- ALLIANCE STYLE (Smooth, Gold, Royal Blue) ---
        
        // Side (Thickness)
        const gradSide = ctx.createLinearGradient(0, cy - height, 0, cy + ry);
        gradSide.addColorStop(0, '#fbbf24'); 
        gradSide.addColorStop(0.5, '#b45309'); 
        gradSide.addColorStop(1, '#fbbf24');
        ctx.fillStyle = gradSide;
        
        ctx.beginPath(); 
        ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI, false); 
        ctx.lineTo(cx + rx, cy - height); 
        ctx.ellipse(cx, cy - height, rx, ry, 0, 0, Math.PI, true); 
        ctx.lineTo(cx - rx, cy); 
        ctx.fill();

        // Top Surface (Marble/Light)
        const gradTop = ctx.createRadialGradient(cx, cy - height, 0, cx, cy - height, rx);
        gradTop.addColorStop(0, '#f8fafc'); 
        gradTop.addColorStop(1, '#e2e8f0');
        ctx.fillStyle = gradTop; 
        ctx.beginPath(); 
        ctx.ellipse(cx, cy - height, rx - 3, ry - 3, 0, 0, Math.PI * 2); 
        ctx.fill();
        
        // Blue Ring
        ctx.strokeStyle = '#2563eb'; 
        ctx.lineWidth = 2; 
        ctx.beginPath(); 
        ctx.ellipse(cx, cy - height, rx * 0.7, ry * 0.7, 0, 0, Math.PI * 2); 
        ctx.stroke();
    }
    return canvas;
};

// ==========================================
// 2. Class Icon Generation
// ==========================================
const generateRoleIcon = (role: Role, team: Team): HTMLCanvasElement => {
    const { canvas, ctx } = createCanvas(ICON_SIZE, ICON_SIZE);
    const cx = ICON_SIZE / 2;
    const cy = ICON_SIZE / 2;
    
    const isBlue = team === Team.BLUE;
    const color = isBlue ? '#2563eb' : '#dc2626'; 
    const secColor = isBlue ? '#fbbf24' : '#52525b';

    ctx.shadowColor = 'rgba(0,0,0,0.5)'; 
    ctx.shadowBlur = 4;
    ctx.lineJoin = 'round'; 
    ctx.lineCap = 'round';

    switch (role) {
        case Role.TANK:
            ctx.fillStyle = secColor; 
            ctx.strokeStyle = '#fff'; 
            ctx.lineWidth = 2;
            if (isBlue) {
                // Shield Shape
                ctx.beginPath(); 
                ctx.moveTo(cx - 15, cy - 15); 
                ctx.lineTo(cx + 15, cy - 15); 
                ctx.lineTo(cx + 15, cy); 
                ctx.quadraticCurveTo(cx, cy + 25, cx, cy + 25); 
                ctx.quadraticCurveTo(cx - 15, cy, cx - 15, cy); 
                ctx.closePath();
            } else {
                // Tower Shield (Square with spikes)
                ctx.beginPath();
                ctx.rect(cx - 14, cy - 18, 28, 36);
            }
            ctx.fill(); 
            ctx.stroke();
            
            // Center Dot/Spike
            ctx.fillStyle = color; 
            ctx.beginPath(); 
            ctx.arc(cx, cy, isBlue ? 6 : 8, 0, Math.PI * 2); 
            ctx.fill();
            break;

        case Role.WARRIOR:
            ctx.strokeStyle = '#fff'; 
            ctx.lineWidth = 3; 
            ctx.beginPath();
            if (isBlue) {
                // Sword
                ctx.moveTo(cx, cy - 20); ctx.lineTo(cx, cy + 15); 
                ctx.moveTo(cx - 8, cy + 15); ctx.lineTo(cx + 8, cy + 15); 
                ctx.moveTo(cx, cy + 15); ctx.lineTo(cx, cy + 25);
            } else {
                // Double Axe
                ctx.moveTo(cx, cy + 20); ctx.lineTo(cx, cy - 20); // Handle
                // Left Blade
                ctx.moveTo(cx, cy - 15); 
                ctx.quadraticCurveTo(cx - 15, cy - 25, cx - 20, cy - 5); 
                ctx.quadraticCurveTo(cx - 10, cy, cx, cy - 5);
                // Right Blade
                ctx.moveTo(cx, cy - 15); 
                ctx.quadraticCurveTo(cx + 15, cy - 25, cx + 20, cy - 5); 
                ctx.quadraticCurveTo(cx + 10, cy, cx, cy - 5);
            }
            ctx.stroke();
            break;

        case Role.RANGER:
            ctx.strokeStyle = '#fff'; 
            ctx.lineWidth = 2; 
            ctx.beginPath();
            if (isBlue) {
                // Bow
                ctx.arc(cx - 5, cy, 15, -Math.PI/2, Math.PI/2); 
                ctx.moveTo(cx - 5, cy - 15); ctx.lineTo(cx - 5, cy + 15); 
                ctx.moveTo(cx - 10, cy); ctx.lineTo(cx + 15, cy);
            } else {
                // Crossbow
                ctx.moveTo(cx - 5, cy + 15); ctx.lineTo(cx - 5, cy - 15); // Stock
                ctx.moveTo(cx - 15, cy - 10); ctx.lineTo(cx + 5, cy - 10); // Limb
            }
            ctx.stroke();
            break;

        case Role.MAGE:
            ctx.strokeStyle = '#fff'; 
            ctx.lineWidth = 2; 
            ctx.beginPath();
            // Staff diagonally
            ctx.moveTo(cx + 10, cy - 20); 
            ctx.lineTo(cx - 10, cy + 20); 
            ctx.stroke();
            
            // Orb / Gem
            ctx.fillStyle = color; 
            ctx.beginPath();
            if (isBlue) {
                ctx.arc(cx + 10, cy - 20, 6, 0, Math.PI * 2);
            } else { 
                // Crooked top
                ctx.moveTo(cx + 10, cy - 20); ctx.lineTo(cx + 15, cy - 25);
                ctx.moveTo(cx + 10, cy - 20); ctx.lineTo(cx + 5, cy - 28);
                ctx.stroke();
            }
            ctx.fill();
            break;

        case Role.SUPPORT:
        default:
            if (isBlue) {
                // Hammer / Mace
                ctx.fillStyle = '#fff'; 
                ctx.strokeStyle = '#fff';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(cx, cy + 15); ctx.lineTo(cx, cy - 10); // Handle
                ctx.stroke();
                ctx.fillRect(cx - 8, cy - 20, 16, 12); // Head
            } else {
                // Claw
                ctx.strokeStyle = '#fff';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(cx - 10, cy + 10); ctx.lineTo(cx + 15, cy - 10);
                ctx.moveTo(cx - 5, cy + 10); ctx.lineTo(cx + 20, cy - 5);
                ctx.stroke();
            }
            break;
    }
    return canvas;
};

// ==========================================
// 3. Weapon Generation
// ==========================================
const generateWeapon = (role: Role, team: Team): HTMLCanvasElement => {
    const { canvas, ctx } = createCanvas(WEAPON_SIZE, WEAPON_SIZE);
    
    const isBlue = team === Team.BLUE;
    const mainColor = isBlue ? '#fbbf24' : '#ef4444'; 
    const metalColor = isBlue ? '#e2e8f0' : '#27272a';
    const darkMetal = '#18181b';
    
    // PIVOT FIX: Move origin to center. 
    // We draw the weapon such that the handle/grip is at (0,0).
    ctx.translate(WEAPON_SIZE / 2, WEAPON_SIZE / 2);
    ctx.scale(1.5, 1.5);
    
    ctx.shadowColor = mainColor;
    ctx.shadowBlur = 5;
    ctx.lineJoin = 'round';

    switch (role) {
        case Role.WARRIOR:
            if (isBlue) {
                // --- BLUE: CLAYMORE (Long, Straight) ---
                ctx.rotate(Math.PI / 4);
                // Handle
                ctx.fillStyle = '#3f2c22'; ctx.fillRect(-3, -15, 6, 20); 
                // Guard (Cross)
                ctx.fillStyle = '#fbbf24'; 
                ctx.beginPath(); ctx.moveTo(-15, 5); ctx.lineTo(15, 5); ctx.lineTo(0, -2); ctx.fill();
                // Blade
                ctx.fillStyle = '#e2e8f0'; ctx.strokeStyle = '#94a3b8';
                ctx.beginPath(); 
                ctx.moveTo(-6, 5); ctx.lineTo(-4, 60); ctx.lineTo(0, 75); ctx.lineTo(4, 60); ctx.lineTo(6, 5);
                ctx.fill(); ctx.stroke();
                // Fuller (Blood groove)
                ctx.fillStyle = '#94a3b8'; ctx.fillRect(-1, 5, 2, 50);
            } else {
                // --- RED: GREATAXE (Wide, Double-headed) ---
                ctx.rotate(Math.PI / 4);
                // Handle (Long)
                ctx.fillStyle = '#3f2c22'; ctx.fillRect(-4, -10, 8, 70); 
                // Axe Head
                ctx.translate(0, 45); // Move to head position
                ctx.fillStyle = darkMetal; ctx.strokeStyle = '#ef4444'; ctx.lineWidth = 1;
                
                // Left Blade
                ctx.beginPath();
                ctx.moveTo(-4, 0); 
                ctx.quadraticCurveTo(-20, -25, -35, -20); // Top curve
                ctx.quadraticCurveTo(-30, 0, -35, 20);    // Edge
                ctx.quadraticCurveTo(-20, 25, -4, 10);    // Bottom curve
                ctx.fill(); ctx.stroke();

                // Right Blade
                ctx.beginPath();
                ctx.moveTo(4, 0); 
                ctx.quadraticCurveTo(20, -25, 35, -20);
                ctx.quadraticCurveTo(30, 0, 35, 20);
                ctx.quadraticCurveTo(20, 25, 4, 10);
                ctx.fill(); ctx.stroke();
                
                // Spike on top
                ctx.beginPath(); ctx.moveTo(-5, -10); ctx.lineTo(0, -25); ctx.lineTo(5, -10); ctx.fill();
            }
            break;

        case Role.TANK:
            if (isBlue) {
                // --- BLUE: KITE SHIELD (Elegant) ---
                ctx.fillStyle = '#1e3a8a'; ctx.strokeStyle = '#fbbf24'; ctx.lineWidth = 3;
                ctx.beginPath(); 
                ctx.moveTo(-15, -20); ctx.lineTo(15, -20); 
                ctx.lineTo(15, 5); ctx.lineTo(0, 25); ctx.lineTo(-15, 5); 
                ctx.closePath();
                ctx.fill(); ctx.stroke();
                // Symbol
                ctx.fillStyle = '#fbbf24'; ctx.beginPath(); ctx.arc(0, -5, 5, 0, Math.PI*2); ctx.fill();
            } else {
                // --- RED: TOWER SHIELD (Thick, Spiked, Rectangular) ---
                ctx.fillStyle = '#18181b'; // Dark Iron
                
                // Main Plate
                ctx.beginPath();
                ctx.moveTo(-18, -25); ctx.lineTo(18, -25);
                ctx.lineTo(16, 25); ctx.lineTo(0, 30); ctx.lineTo(-16, 25);
                ctx.closePath();
                ctx.fill();
                
                // Metal Banding
                ctx.strokeStyle = '#52525b'; ctx.lineWidth = 4;
                ctx.stroke();
                
                // Spikes
                ctx.fillStyle = '#d4d4d8';
                const spikes = [[0,0], [-10, -15], [10, -15], [0, 15]];
                spikes.forEach(([sx, sy]) => {
                    ctx.beginPath(); ctx.arc(sx, sy, 3, 0, Math.PI*2); ctx.fill();
                    ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(sx, sy-8); ctx.stroke(); // Spike tip
                });
                
                // Glow cracks
                ctx.strokeStyle = '#ef4444'; ctx.lineWidth = 1;
                ctx.beginPath(); ctx.moveTo(-10, 0); ctx.lineTo(10, 0); ctx.stroke();
            }
            break;

        case Role.RANGER:
            if (isBlue) {
                // --- BLUE: LONGBOW (Vertical, Curved) ---
                ctx.rotate(-Math.PI / 4);
                // Wood
                ctx.strokeStyle = '#fcd34d'; ctx.lineWidth = 3;
                ctx.beginPath(); ctx.arc(10, 0, 30, -Math.PI/2, Math.PI/2); ctx.stroke();
                // String
                ctx.strokeStyle = '#fff'; ctx.lineWidth = 1; 
                ctx.beginPath(); ctx.moveTo(10, -30); ctx.lineTo(8, 30); ctx.stroke();
                // Handle
                ctx.fillStyle = '#b45309'; ctx.fillRect(8, -5, 4, 10);
            } else {
                // --- RED: HEAVY CROSSBOW (Horizontal structure) ---
                ctx.rotate(-Math.PI / 4);
                
                // Stock
                ctx.fillStyle = '#3f2c22'; ctx.fillRect(-10, -2, 40, 4);
                
                // Limb (Bow part) - Perpendicular
                ctx.strokeStyle = '#52525b'; ctx.lineWidth = 4;
                ctx.beginPath(); 
                ctx.moveTo(20, -15); 
                ctx.quadraticCurveTo(15, 0, 20, 15); 
                ctx.stroke();
                
                // String
                ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 1;
                ctx.beginPath(); ctx.moveTo(20, -15); ctx.lineTo(-5, 0); ctx.lineTo(20, 15); ctx.stroke();
                
                // Bolt loaded
                ctx.strokeStyle = '#ef4444'; ctx.lineWidth = 2;
                ctx.beginPath(); ctx.moveTo(-5, 0); ctx.lineTo(25, 0); ctx.stroke();
            }
            break;

        case Role.MAGE:
            ctx.rotate(Math.PI / 8);
            if (isBlue) {
                // --- BLUE: CRYSTAL STAFF ---
                // Shaft
                ctx.strokeStyle = '#fbbf24'; ctx.lineWidth = 3;
                ctx.beginPath(); ctx.moveTo(0, -10); ctx.lineTo(0, 60); ctx.stroke();
                
                // Head (Crescent)
                ctx.lineWidth = 2;
                ctx.beginPath(); ctx.arc(0, 60, 10, Math.PI, 0); ctx.stroke();
                
                // Crystal
                ctx.fillStyle = '#60a5fa'; ctx.shadowColor = '#60a5fa'; ctx.shadowBlur = 15;
                ctx.beginPath(); ctx.moveTo(0, 55); ctx.lineTo(5, 65); ctx.lineTo(0, 75); ctx.lineTo(-5, 65); ctx.fill();
            } else {
                // --- RED: VOODOO STAFF ---
                // Crooked Shaft
                ctx.strokeStyle = '#4a0404'; ctx.lineWidth = 4; 
                ctx.beginPath(); 
                ctx.moveTo(0, -10); ctx.lineTo(2, 20); ctx.lineTo(-2, 40); ctx.lineTo(0, 60); 
                ctx.stroke();
                
                // Head (Skull-ish shape)
                ctx.fillStyle = '#e5e5e5'; ctx.shadowColor = '#10b981'; 
                ctx.beginPath(); ctx.arc(0, 65, 8, 0, Math.PI*2); ctx.fill();
                // Green Eyes
                ctx.fillStyle = '#10b981'; 
                ctx.beginPath(); ctx.arc(-3, 67, 2, 0, Math.PI*2); ctx.arc(3, 67, 2, 0, Math.PI*2); ctx.fill();
                
                // Feathers/Charms
                ctx.strokeStyle = '#ef4444'; ctx.lineWidth = 2;
                ctx.beginPath(); ctx.moveTo(0, 55); ctx.lineTo(10, 50); ctx.stroke();
            }
            break;

        case Role.SUPPORT:
        default:
            if (isBlue) {
                // --- BLUE: WARHAMMER / MACE ---
                ctx.rotate(Math.PI / 4);
                // Handle
                ctx.fillStyle = '#3f2c22'; ctx.fillRect(-2, -10, 4, 50);
                // Head (Blocky)
                ctx.translate(0, 45);
                ctx.fillStyle = '#94a3b8'; ctx.strokeStyle = '#fbbf24'; ctx.lineWidth = 2;
                ctx.fillRect(-10, -8, 20, 16); ctx.strokeRect(-10, -8, 20, 16);
                // Runes on head
                ctx.fillStyle = '#fbbf24'; ctx.beginPath(); ctx.arc(0, 0, 4, 0, Math.PI*2); ctx.fill();
            } else {
                // --- RED: CLAWS / FIST WEAPON ---
                // Grip
                ctx.fillStyle = '#27272a'; ctx.fillRect(-8, -8, 16, 16);
                
                // Blades
                ctx.fillStyle = '#d4d4d8'; ctx.shadowColor = '#ef4444'; ctx.shadowBlur = 5;
                const blades = [-10, 0, 10];
                blades.forEach((offset, i) => {
                    ctx.beginPath();
                    ctx.moveTo(offset, 0);
                    // Curve out
                    ctx.quadraticCurveTo(offset * 1.5, 30, offset * 0.5, 45);
                    ctx.lineTo(offset * 0.5 - 2, 40); // Inner edge
                    ctx.closePath();
                    ctx.fill();
                });
            }
            break;
    }

    return canvas;
};

// ==========================================
// 4. Obstacle Generation (Scene Aware)
// ==========================================
const generateObstacle = (styleKey: string): HTMLCanvasElement => {
    const { canvas, ctx } = createCanvas(64, 96);
    const cx = 32;
    const cy = 80;
    
    // Default Fallback
    const style = OBSTACLE_STYLES[styleKey] || OBSTACLE_STYLES['WALL'];

    ctx.fillStyle = style.main;
    ctx.strokeStyle = style.light;
    ctx.lineWidth = 2;
    ctx.lineJoin = 'round';

    if (styleKey === 'TREE') {
        // --- ANCIENT TREE ---
        // Trunk
        ctx.fillStyle = style.dark;
        ctx.beginPath();
        ctx.moveTo(cx - 8, cy); 
        ctx.lineTo(cx + 8, cy); 
        ctx.lineTo(cx + 6, cy - 40); 
        ctx.lineTo(cx - 6, cy - 40); 
        ctx.fill();

        // Foliage Layers
        ctx.fillStyle = style.detail; 
        ctx.shadowColor = 'rgba(0,0,0,0.5)'; ctx.shadowBlur = 5;
        
        const leaves = (y: number, r: number) => {
            ctx.beginPath(); 
            ctx.arc(cx, y, r, 0, Math.PI * 2); 
            ctx.fill(); 
            ctx.stroke();
        };
        leaves(cy - 40, 20);
        leaves(cy - 60, 16);
        leaves(cy - 75, 12);

    } else if (styleKey === 'ICE_CRYSTAL') {
        // --- ICE SPIKES ---
        ctx.fillStyle = style.main;
        ctx.globalAlpha = 0.8;
        ctx.shadowColor = style.light; ctx.shadowBlur = 10;
        
        const shard = (x: number, h: number, w: number, ang: number) => {
            ctx.save();
            ctx.translate(x, cy);
            ctx.rotate(ang);
            ctx.beginPath();
            ctx.moveTo(-w, 0);
            ctx.lineTo(0, -h);
            ctx.lineTo(w, 0);
            ctx.fill(); ctx.stroke();
            
            // Highlight
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 1;
            ctx.beginPath(); ctx.moveTo(-w, 0); ctx.lineTo(0, -h); ctx.stroke();
            ctx.restore();
        };

        shard(cx, 60, 15, 0);
        shard(cx - 10, 40, 10, -0.2);
        shard(cx + 12, 45, 12, 0.3);

    } else if (styleKey === 'OBSIDIAN_PILLAR') {
        // --- MAGMA ROCK ---
        ctx.fillStyle = style.main;
        
        ctx.beginPath();
        ctx.moveTo(cx - 15, cy);
        ctx.lineTo(cx - 10, cy - 70);
        ctx.lineTo(cx + 15, cy - 80);
        ctx.lineTo(cx + 20, cy);
        ctx.closePath();
        ctx.fill(); ctx.stroke();
        
        // Cracks
        ctx.strokeStyle = style.detail; // Magma Red
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(cx, cy - 10); ctx.lineTo(cx + 5, cy - 30); ctx.lineTo(cx - 5, cy - 50);
        ctx.stroke();

    } else if (styleKey === 'SANDSTONE') {
        // --- ERODED ROCK ---
        ctx.fillStyle = style.main;
        
        ctx.beginPath();
        ctx.ellipse(cx, cy - 20, 20, 30, 0, 0, Math.PI * 2);
        ctx.fill(); ctx.stroke();
        
        // Layers
        ctx.strokeStyle = style.dark;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(cx - 18, cy - 10); ctx.quadraticCurveTo(cx, cy - 5, cx + 18, cy - 10);
        ctx.moveTo(cx - 18, cy - 30); ctx.quadraticCurveTo(cx, cy - 25, cx + 18, cy - 30);
        ctx.stroke();

    } else {
        // --- WALL (Default) ---
        // Main Boulder
        ctx.fillStyle = style.dark;
        ctx.beginPath(); 
        ctx.moveTo(cx, cy - 80); 
        ctx.lineTo(cx + 24, cy - 70); 
        ctx.lineTo(cx, cy - 60); 
        ctx.lineTo(cx - 24, cy - 70); 
        ctx.closePath(); 
        ctx.fill(); ctx.stroke();
        
        // Side Facets
        ctx.fillStyle = style.main; 
        ctx.beginPath(); 
        ctx.moveTo(cx - 24, cy - 70); 
        ctx.lineTo(cx, cy - 60); 
        ctx.lineTo(cx, cy); 
        ctx.lineTo(cx - 24, cy - 10); 
        ctx.closePath(); 
        ctx.fill(); ctx.stroke();
        
        ctx.fillStyle = style.light; 
        ctx.beginPath(); 
        ctx.moveTo(cx, cy - 60); 
        ctx.lineTo(cx + 24, cy - 70); 
        ctx.lineTo(cx + 24, cy - 10); 
        ctx.lineTo(cx, cy); 
        ctx.closePath(); 
        ctx.fill(); ctx.stroke();
        
        // Moss Detail
        if (style.detail) {
            ctx.fillStyle = style.detail; 
            ctx.beginPath(); 
            ctx.arc(cx, cy - 5, 10, 0, Math.PI, true); 
            ctx.fill();
        }
    }

    return canvas;
};

// ==========================================
// 5. Special Effect Models (Sheep, Ice)
// ==========================================
const generateSheep = (): HTMLCanvasElement => {
    const { canvas, ctx } = createCanvas(64, 64);
    const cx = 32, cy = 45;
    
    // Fluff
    ctx.fillStyle = '#fff';
    ctx.shadowColor = '#d1d5db'; ctx.shadowBlur = 5;
    const fluffs = [
        {x: 0, y: -10, r: 15}, {x: -12, y: -5, r: 12}, {x: 12, y: -5, r: 12},
        {x: -8, y: 8, r: 12}, {x: 8, y: 8, r: 12}
    ];
    fluffs.forEach(f => {
        ctx.beginPath(); ctx.arc(cx + f.x, cy + f.y, f.r, 0, Math.PI*2); ctx.fill();
    });
    
    // Head
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#1c1917';
    ctx.beginPath(); 
    ctx.ellipse(cx - 15, cy - 5, 8, 10, -0.2, 0, Math.PI*2); 
    ctx.fill();
    
    // Eye
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(cx - 17, cy - 7, 2, 0, Math.PI*2); ctx.fill();
    
    // Legs
    ctx.fillStyle = '#1c1917';
    ctx.fillRect(cx - 10, cy + 10, 4, 10);
    ctx.fillRect(cx + 6, cy + 10, 4, 10);

    return canvas;
};

const generateIceBlock = (): HTMLCanvasElement => {
    const { canvas, ctx } = createCanvas(96, 128);
    const cx = 48, cy = 90;
    
    ctx.fillStyle = 'rgba(224, 242, 254, 0.4)'; // Sky-100 translucent
    ctx.strokeStyle = '#38bdf8'; // Sky-400
    ctx.lineWidth = 2;
    
    // Crystal Shape
    ctx.beginPath();
    ctx.moveTo(cx - 30, cy);
    ctx.lineTo(cx - 35, cy - 60);
    ctx.lineTo(cx, cy - 100);
    ctx.lineTo(cx + 35, cy - 70);
    ctx.lineTo(cx + 30, cy);
    ctx.closePath();
    
    ctx.fill();
    ctx.stroke();
    
    // Facets
    ctx.beginPath(); ctx.moveTo(cx, cy - 100); ctx.lineTo(cx - 10, cy - 50); ctx.lineTo(cx - 30, cy); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx, cy - 100); ctx.lineTo(cx + 15, cy - 40); ctx.lineTo(cx + 30, cy); ctx.stroke();
    
    return canvas;
};

// ==========================================
// 6. Manager Access
// ==========================================
export const SpriteManager = {
    getUnitImages(role: Role, team: Team): UnitAssets {
        // Updated keys to force refresh with new designs
        const keyBase = `TOKEN_BASE_${team}_V3`; 
        let base = cache.get(keyBase);
        if (!base) {
            base = generateTokenBase(team);
            cache.set(keyBase, base);
        }

        const keyWep = `WEAPON_${role}_${team}_V3`;
        let weapon = cache.get(keyWep);
        if (!weapon) {
            weapon = generateWeapon(role, team);
            cache.set(keyWep, weapon);
        }

        const keyIcon = `ROLE_ICON_${role}_${team}_V3`;
        let icon = cache.get(keyIcon);
        if (!icon) {
            icon = generateRoleIcon(role, team);
            cache.set(keyIcon, icon);
        }

        return {
            base: base,
            weapon: weapon,
            icon: icon,
            color: PALETTE.TEAMS[team].glow
        };
    },
    
    getObstacleSprite(styleKey: string = 'WALL'): HTMLCanvasElement {
        const key = `OBSTACLE_${styleKey}`;
        if (cache.has(key)) return cache.get(key)!;
        
        const canvas = generateObstacle(styleKey);
        cache.set(key, canvas);
        return canvas;
    },

    getSpecialModel(type: 'SHEEP' | 'ICE'): HTMLCanvasElement {
        const key = `MODEL_${type}`;
        if (!cache.has(key)) {
            if (type === 'SHEEP') cache.set(key, generateSheep());
            else cache.set(key, generateIceBlock());
        }
        return cache.get(key)!;
    }
};
