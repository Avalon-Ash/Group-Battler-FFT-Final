
export const GeometryPainter = {
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
