
import { createCanvas } from "./CanvasUtils";

const TEXTURE_SIZE = 64; 
const CENTER = TEXTURE_SIZE / 2;

// ============================================================================
// 🎨 PAINTER MODULES (Internal Logic Separation)
// ============================================================================

const GeometryPainter = {
    drawHex(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, style: 'FILL' | 'STROKE' | 'BOTH' = 'FILL') {
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
            const angle = (Math.PI / 3) * i - Math.PI / 6; 
            const px = x + Math.cos(angle) * r;
            const py = y + Math.sin(angle) * r;
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
        }
        ctx.closePath();
        if (style === 'FILL' || style === 'BOTH') ctx.fill();
        if (style === 'STROKE' || style === 'BOTH') ctx.stroke();
    },

    drawJaggedShape(ctx: CanvasRenderingContext2D, r: number) {
        ctx.beginPath();
        const spikes = 8;
        for(let i=0; i<spikes*2; i++) {
            const angle = (Math.PI * i) / spikes;
            const dist = (i % 2 === 0) ? r : r * 0.4;
            ctx.lineTo(Math.cos(angle)*dist, Math.sin(angle)*dist);
        }
        ctx.closePath();
        ctx.fill();
    }
};

const ParticlePainter = {
    drawAtmosphere(ctx: CanvasRenderingContext2D, r: number, color: string) {
        const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, r);
        grad.addColorStop(0, '#ffffff'); 
        grad.addColorStop(0.2, color);
        grad.addColorStop(1, 'transparent');
        ctx.fillStyle = grad;
        // Soft Hex shape instead of circle for stylistic consistency
        GeometryPainter.drawHex(ctx, 0, 0, r * 0.8, 'FILL');
    },

    drawSmoke(ctx: CanvasRenderingContext2D, r: number, color: string) {
        const grad = ctx.createRadialGradient(0, 0, r*0.2, 0, 0, r);
        grad.addColorStop(0, color); 
        grad.addColorStop(0.6, 'transparent');
        ctx.fillStyle = grad;
        
        // Draw clusters
        ctx.beginPath();
        ctx.arc(-r*0.3, -r*0.2, r*0.5, 0, Math.PI*2);
        ctx.arc(r*0.3, r*0.2, r*0.4, 0, Math.PI*2);
        ctx.arc(0, 0, r*0.4, 0, Math.PI*2);
        ctx.fill();
    },

    drawShockwave(ctx: CanvasRenderingContext2D, r: number, color: string) {
        ctx.strokeStyle = color;
        ctx.lineWidth = 4;
        ctx.shadowColor = color;
        ctx.shadowBlur = 10;
        GeometryPainter.drawHex(ctx, 0, 0, r * 0.8, 'STROKE');
        
        ctx.strokeStyle = 'rgba(255,255,255,0.8)';
        ctx.lineWidth = 1;
        ctx.shadowBlur = 0;
        GeometryPainter.drawHex(ctx, 0, 0, r * 0.6, 'STROKE');
    },

    drawSpike(ctx: CanvasRenderingContext2D, r: number, color: string) {
        ctx.fillStyle = color;
        ctx.shadowColor = color;
        ctx.shadowBlur = 15;
        
        ctx.beginPath();
        // Star shape
        for(let i=0; i<4; i++) {
            const angle = (i * Math.PI) / 2;
            ctx.moveTo(0,0);
            ctx.lineTo(Math.cos(angle)*r, Math.sin(angle)*r);
            ctx.lineTo(Math.cos(angle+0.2)*r*0.2, Math.sin(angle+0.2)*r*0.2);
        }
        ctx.fill();
        
        ctx.fillStyle = '#fff';
        ctx.beginPath(); ctx.arc(0, 0, r*0.3, 0, Math.PI*2); ctx.fill();
    }
};

const ProjectilePainter = {
    // 🔹 IMPERIAL STYLES (Clean, Tech, Energy)
    drawImperialSniper(ctx: CanvasRenderingContext2D, color: string) {
        // High-velocity railgun slug
        ctx.shadowColor = color;
        ctx.shadowBlur = 10;
        
        // Core
        ctx.fillStyle = '#fff';
        ctx.fillRect(-20, -3, 40, 6);
        
        // Energy Jacket
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.strokeRect(-22, -5, 44, 10);
        
        // Trailing Mach Rings
        ctx.strokeStyle = color;
        ctx.globalAlpha = 0.6;
        ctx.beginPath();
        ctx.moveTo(-30, -8); ctx.lineTo(-20, 0); ctx.lineTo(-30, 8);
        ctx.stroke();
    },

    drawImperialCrystal(ctx: CanvasRenderingContext2D, color: string) {
        // Ice Shard
        ctx.fillStyle = '#e0f2fe';
        ctx.strokeStyle = color;
        ctx.lineWidth = 1.5;
        
        ctx.beginPath();
        ctx.moveTo(15, 0);
        ctx.lineTo(-5, -8);
        ctx.lineTo(-15, 0);
        ctx.lineTo(-5, 8);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        
        // Glint
        ctx.fillStyle = '#fff';
        ctx.beginPath(); ctx.arc(5, -2, 2, 0, Math.PI*2); ctx.fill();
    },

    drawImperialOrb(ctx: CanvasRenderingContext2D, color: string) {
        // Perfect Sphere
        const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, 12);
        grad.addColorStop(0, '#fff');
        grad.addColorStop(0.4, color);
        grad.addColorStop(1, 'transparent');
        ctx.fillStyle = grad;
        ctx.beginPath(); ctx.arc(0, 0, 12, 0, Math.PI*2); ctx.fill();
        
        // Orbitals
        ctx.strokeStyle = color;
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.ellipse(0, 0, 16, 6, Math.PI/4, 0, Math.PI*2); ctx.stroke();
    },

    // 👹 COVENANT STYLES (Jagged, Heavy, Raw)
    drawCovenantBolt(ctx: CanvasRenderingContext2D, color: string) {
        // Unstable energy tear
        ctx.shadowColor = color;
        ctx.shadowBlur = 15;
        
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.moveTo(15, 0);
        ctx.lineTo(-10, -6);
        ctx.lineTo(-25, 0); // Long chaotic tail
        ctx.lineTo(-10, 6);
        ctx.fill();
        
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(15, 0);
        ctx.lineTo(-15, -10);
        ctx.lineTo(-20, 10);
        ctx.closePath();
        ctx.stroke();
    },

    drawCovenantAxe(ctx: CanvasRenderingContext2D, color: string) {
        // Heavy Physical Object
        ctx.fillStyle = '#1c1917'; // Dark Iron
        ctx.strokeStyle = color;   // Energy edge
        ctx.lineWidth = 2;
        
        // Double Axe Head
        ctx.beginPath();
        ctx.moveTo(0, -4); ctx.lineTo(0, 4); // Handle center
        
        // Blade L
        ctx.moveTo(-5, -8); 
        ctx.bezierCurveTo(-20, -15, -20, 15, -5, 8);
        ctx.lineTo(-2, 0);
        
        // Blade R
        ctx.moveTo(5, -8); 
        ctx.bezierCurveTo(20, -15, 20, 15, 5, 8);
        ctx.lineTo(2, 0);
        
        ctx.fill();
        ctx.stroke();
    },

    drawCovenantFireball(ctx: CanvasRenderingContext2D, color: string) {
        // Chaos Orb
        ctx.shadowColor = color;
        ctx.shadowBlur = 20;
        
        const grad = ctx.createRadialGradient(0, 0, 2, 0, 0, 15);
        grad.addColorStop(0, '#fff');
        grad.addColorStop(0.3, color);
        grad.addColorStop(1, 'transparent');
        ctx.fillStyle = grad;
        
        // Irregular shape
        GeometryPainter.drawJaggedShape(ctx, 14);
    },

    drawBomb(ctx: CanvasRenderingContext2D, color: string) {
        ctx.fillStyle = '#334155';
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(0, 0, 10, 0, Math.PI*2); ctx.fill(); ctx.stroke();
        
        // Fuse
        ctx.fillStyle = '#fca5a5';
        ctx.beginPath(); ctx.arc(6, -6, 3, 0, Math.PI*2); ctx.fill();
    }
};

const IconPainter = {
    drawHexHalo(ctx: CanvasRenderingContext2D, r: number, color: string) {
        ctx.strokeStyle = color;
        ctx.lineWidth = 3;
        ctx.shadowColor = color;
        ctx.shadowBlur = 10;
        GeometryPainter.drawHex(ctx, 0, 0, r * 0.8, 'STROKE');
        
        // Corner dots
        ctx.fillStyle = '#fff';
        for (let i = 0; i < 6; i++) {
            const angle = (Math.PI / 3) * i - Math.PI / 6; 
            const px = Math.cos(angle) * r * 0.8;
            const py = Math.sin(angle) * r * 0.8;
            ctx.beginPath(); ctx.arc(px, py, 2, 0, Math.PI*2); ctx.fill();
        }
    },

    drawHexLock(ctx: CanvasRenderingContext2D, r: number, color: string) {
        ctx.fillStyle = color;
        ctx.shadowColor = color;
        ctx.shadowBlur = 5;
        GeometryPainter.drawHex(ctx, 0, 0, r * 0.8, 'FILL');
        
        ctx.globalCompositeOperation = 'destination-out';
        ctx.lineWidth = 4;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(-6, -6); ctx.lineTo(6, 6);
        ctx.moveTo(6, -6); ctx.lineTo(-6, 6);
        ctx.stroke();
    }
};

// ============================================================================
// 🏭 MAIN FACTORY (The Facade)
// ============================================================================

export class VFXTextureCache {
    private cache: Map<string, HTMLCanvasElement> = new Map();

    /**
     * Entry point for generic particles (Smoke, Glow, Shards)
     */
    public getTexture(type: string, color: string): HTMLCanvasElement {
        // Normalization for legacy keys
        if (type === 'DUST' || type === 'PEBBLE') type = 'RUBBLE';
        if (type === 'RING' || type === 'SHOCKWAVE_RING') type = 'SHOCKWAVE';

        const key = `VFX_${type}_${color}`;
        if (this.cache.has(key)) return this.cache.get(key)!;

        const { canvas, ctx } = createCanvas(TEXTURE_SIZE, TEXTURE_SIZE);
        const r = CENTER - 4;
        ctx.translate(CENTER, CENTER);

        // --- DISPATCHER ---
        switch (type) {
            case 'ATMOSPHERE':
            case 'GLOW':
                ParticlePainter.drawAtmosphere(ctx, r, color);
                break;
            case 'SMOKE':
            case 'SMOKE_PUFF':
                ParticlePainter.drawSmoke(ctx, r, color);
                break;
            case 'SHOCKWAVE':
                ParticlePainter.drawShockwave(ctx, r, color);
                break;
            case 'SPIKE':
            case 'SPARK':
                ParticlePainter.drawSpike(ctx, r * (type === 'SPARK' ? 0.3 : 0.8), color);
                break;
            case 'SHARD':
            case 'RUBBLE':
            case 'ROCK':
            case 'CHIP':
                ctx.fillStyle = color;
                GeometryPainter.drawHex(ctx, 0, 0, r * 0.5, 'FILL');
                break;
            case 'HEX_HALO':
            case 'HEX_FRAME':
                IconPainter.drawHexHalo(ctx, r, color);
                break;
            case 'HEX_LOCK':
            case 'HEX_RUNE':
                IconPainter.drawHexLock(ctx, r, color);
                break;
            case 'MAGIC_CIRCLE':
                ctx.strokeStyle = color;
                ctx.lineWidth = 2;
                GeometryPainter.drawHex(ctx, 0, 0, r * 0.9, 'STROKE');
                ctx.beginPath(); ctx.arc(0, 0, r*0.7, 0, Math.PI*2); ctx.stroke();
                break;
            default:
                // Fallback debug shape
                ctx.fillStyle = color;
                ctx.beginPath(); ctx.arc(0, 0, 5, 0, Math.PI*2); ctx.fill();
                break;
        }

        this.cache.set(key, canvas);
        return canvas;
    }

    /**
     * Entry point for Projectile Sprites (High detail, directional)
     */
    public generateProjectileSprite(visual: string, color: string): HTMLCanvasElement {
        const key = `PROJ_${visual}_${color}`;
        if (this.cache.has(key)) return this.cache.get(key)!;

        // Projectiles need wider canvas for trails/speed
        const { canvas, ctx } = createCanvas(128, 64);
        const cx = 64, cy = 32;
        ctx.translate(cx, cy);

        // --- DISPATCHER ---
        switch (visual) {
            case 'HEX_DART':
            case 'ARROW':
                ProjectilePainter.drawImperialSniper(ctx, color);
                break;
            case 'CRYSTAL':
                ProjectilePainter.drawImperialCrystal(ctx, color);
                break;
            case 'ORB':
                ProjectilePainter.drawImperialOrb(ctx, color);
                break;
            case 'BOLT':
                // Use Imperial/Covenant logic based on color hash or just default to Covenant for now?
                // Better: Check visual context. But here we only have string.
                // Let's assume jagged for generic bolts to look aggressive.
                ProjectilePainter.drawCovenantBolt(ctx, color);
                break;
            case 'AXE':
                ProjectilePainter.drawCovenantAxe(ctx, color);
                break;
            case 'FIREBALL':
                ProjectilePainter.drawCovenantFireball(ctx, color);
                break;
            case 'BOMB':
                ProjectilePainter.drawBomb(ctx, color);
                break;
            default:
                // Fallback Bolt
                ProjectilePainter.drawCovenantBolt(ctx, color);
                break;
        }

        this.cache.set(key, canvas);
        return canvas;
    }

    /**
     * Helpers for other systems
     */
    public generateGlowOrb(color: string): HTMLCanvasElement { return this.getTexture('ATMOSPHERE', color); }
    public generateCracks(color: string): HTMLCanvasElement { return this.getTexture('CRACKS', color); }
    
    public generateFogCloud(color: string): HTMLCanvasElement {
        const key = `FOG_CLOUD_${color}`;
        if (this.cache.has(key)) return this.cache.get(key)!;
        const { canvas, ctx } = createCanvas(128, 64);
        const grad = ctx.createRadialGradient(64, 32, 0, 64, 32, 64);
        grad.addColorStop(0, color); 
        grad.addColorStop(1, 'transparent');
        ctx.fillStyle = grad;
        ctx.beginPath();
        // Cloud shape
        ctx.arc(64, 32, 30, 0, Math.PI*2);
        ctx.arc(44, 32, 20, 0, Math.PI*2);
        ctx.arc(84, 32, 20, 0, Math.PI*2);
        ctx.fill();
        this.cache.set(key, canvas);
        return canvas;
    }

    public generateBlastZone(color: string): HTMLCanvasElement {
        const key = `BLAST_ZONE_${color}`;
        if (this.cache.has(key)) return this.cache.get(key)!;
        return this.getTexture('SHOCKWAVE', color); // Simplified reuse
    }
}

export const VFXFactory = new VFXTextureCache();
