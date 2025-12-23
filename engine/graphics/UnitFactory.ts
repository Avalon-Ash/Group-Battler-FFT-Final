
import { Role, Team } from "../../types";
import { PALETTE } from "../../constants";
import { createCanvas } from "./CanvasUtils";

// Dimensions
const BASE_SIZE = 128;
const ICON_SIZE = 64;
const WEAPON_SIZE = 128;

export const UnitFactory = {
    
    generateTokenBase(team: Team): HTMLCanvasElement {
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
    },

    generateRoleIcon(role: Role, team: Team): HTMLCanvasElement {
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
    },

    generateWeapon(role: Role, team: Team): HTMLCanvasElement {
        const { canvas, ctx } = createCanvas(WEAPON_SIZE, WEAPON_SIZE);
        
        const isBlue = team === Team.BLUE;
        const mainColor = isBlue ? '#fbbf24' : '#ef4444'; 
        const metalColor = isBlue ? '#e2e8f0' : '#27272a';
        const darkMetal = '#18181b';
        
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
    },

    generateSheep(): HTMLCanvasElement {
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
    }
};
