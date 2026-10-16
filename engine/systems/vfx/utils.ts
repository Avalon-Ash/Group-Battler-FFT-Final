
// Helper: Determine if a color is "Chaos" (Red/Purple/Dark/Fire) vs "Order" (Blue/Gold/White)
export function isChaosStyle(color: string): boolean {
    const c = color.toLowerCase();
    return c.includes('#dc') || c.includes('#ef') || c.includes('#b9') || c.includes('#45') || 
           c.includes('#7f') || c.includes('#4c') || c.includes('#a3') || c.includes('#58') || 
           c.includes('#1c') || c.includes('#ea') || c.includes('#f9') || c.includes('#be') ||
           c.includes('#78') || c.includes('#000');
}

