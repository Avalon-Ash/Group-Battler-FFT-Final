
import { HexUtils, MapConfig } from "../../utils";

// Helper: Determine if a color is "Chaos" (Red/Dark) or "Order" (Blue/Light)
export function isChaosStyle(color: string): boolean {
    const c = color.toLowerCase();
    return c.includes('#dc') || c.includes('#ef') || c.includes('#b9') || c.includes('#45') || 
           c.includes('#7f') || c.includes('#4c') || c.includes('#a3') || c.includes('#58') || 
           c.includes('#1c');
}

// Helper: Ensure 6-digit hex for alpha appending logic
export function normalizeHex(color: string): string {
    if (color.startsWith('#') && color.length === 4) {
        return '#' + color[1] + color[1] + color[2] + color[2] + color[3] + color[3];
    }
    return color;
}

// Helper: Calculate vertical offset during map transition
export function getTransitionOffset(x: number, y: number, mapConfig: MapConfig, t: number, phase: 'IN' | 'OUT' | 'IDLE'): number {
    if (phase === 'IDLE') return 0;
    const centerQ = Math.floor(mapConfig.w / 2);
    const centerR = Math.floor(mapConfig.h / 2);
    const hex = HexUtils.fromPx(x, y, mapConfig);
    const maxDist = Math.max(mapConfig.w, mapConfig.h) / 2;
    const dist = Math.sqrt((hex.q - centerQ)**2 + (hex.r - centerR)**2);
    const d = dist / maxDist;
    
    if (phase === 'OUT') {
        const trigger = d * 0.3;
        if (t > trigger) {
            const fallT = Math.min(1, (t - trigger) * 2.5);
            return fallT * fallT * fallT * 1000;
        }
    } else if (phase === 'IN') {
        const trigger = d * 0.3;
        const riseT = Math.max(0, Math.min(1, (t - trigger) * 2.5));
        const easedRise = 1 - Math.pow(1 - riseT, 3);
        return (1 - easedRise) * 1000;
    }
    return 0;
}
