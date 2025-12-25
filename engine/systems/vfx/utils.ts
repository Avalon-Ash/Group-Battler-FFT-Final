
import { HexUtils, MapConfig, getTransitionOffset } from "../../utils";

// Export the core version to maintain API compatibility for other VFX modules
export { getTransitionOffset };

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
