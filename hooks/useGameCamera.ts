
import { useRef, useCallback } from 'react';
import { GameEngine } from '../engine/game';
import { HexUtils } from '../engine/utils';
import { BLOCK_HEIGHT, HEX_SIZE } from '../constants';

export const useGameCamera = (engine: GameEngine) => {
    // Default safe values
    const camera = useRef({ x: 0, y: 0, zoom: 1.0 });

    const centerCamera = useCallback((width: number, height: number) => {
        // Safety: Mobile browsers might report 0 width during layout thrashing
        if (!width || !height || width <= 0 || height <= 0) return;

        const cw = engine.mapConfig.w;
        const ch = engine.mapConfig.h;
        
        const centerHex = { q: Math.floor(cw / 2), r: Math.floor(ch / 2) };
        const p = HexUtils.toPx(centerHex.q, centerHex.r, engine.mapConfig);
        const verticalOffset = -BLOCK_HEIGHT * 2; 

        let targetX = p.x - (width / camera.current.zoom) / 2;
        let targetY = p.y + verticalOffset - (height / camera.current.zoom) / 2;

        // NaN / Infinity Protection (The "Black Screen" Fix)
        if (!Number.isFinite(targetX)) targetX = 0;
        if (!Number.isFinite(targetY)) targetY = 0;

        camera.current.x = targetX;
        camera.current.y = targetY;
    }, [engine.mapConfig]); // Depend on mapConfig, not engine itself to avoid constant updates if engine mutates

    const pan = useCallback((dx: number, dy: number) => {
        if (isNaN(dx) || isNaN(dy)) return;
        if (dx === 0 && dy === 0) return;
        
        const nextX = camera.current.x - dx / camera.current.zoom;
        const nextY = camera.current.y - dy / camera.current.zoom;

        // --- BOUNDARY CLAMPING ---
        // Prevent losing the map off-screen.
        const centerHex = { q: Math.floor(engine.mapConfig.w / 2), r: Math.floor(engine.mapConfig.h / 2) };
        const mapCenter = HexUtils.toPx(centerHex.q, centerHex.r, engine.mapConfig);
        
        // Allow looking slightly away, but force center to stay roughly within view
        const maxDistX = 2000;
        const maxDistY = 1500;

        const distX = nextX - (mapCenter.x - 500);
        const distY = nextY - (mapCenter.y - 400);

        // Update X if within bounds
        if (Math.abs(distX) < maxDistX) {
            camera.current.x = nextX;
        }
        // Update Y if within bounds
        if (Math.abs(distY) < maxDistY) {
            camera.current.y = nextY;
        }
    }, [engine.mapConfig]);

    const zoom = useCallback((delta: number) => {
        if (isNaN(delta)) return;
        const newZoom = Math.max(0.5, Math.min(3.0, camera.current.zoom + delta));
        camera.current.zoom = newZoom;
    }, []);

    const getScreenCoords = useCallback((clientX: number, clientY: number, rect: DOMRect) => {
        return { x: clientX - rect.left, y: clientY - rect.top };
    }, []);

    return { 
        camera, 
        centerCamera, 
        pan, 
        zoom,
        getScreenCoords
    };
};
