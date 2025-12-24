
import { useRef, useCallback } from 'react';
import { GameEngine } from '../engine/game';
import { HexUtils } from '../engine/utils';
import { BLOCK_HEIGHT } from '../constants';

export const useGameCamera = (engine: GameEngine) => {
    // Default safe values
    const camera = useRef({ x: 0, y: 0, zoom: 1.0 });

    const centerCamera = useCallback((width: number, height: number) => {
        if (!width || !height || width <= 0 || height <= 0) return;

        // --- BOUNDING BOX CALCULATION ---
        let minX = Infinity, maxX = -Infinity;
        let minY = Infinity, maxY = -Infinity;
        let count = 0;

        engine.mapKeys.forEach(k => {
            const [q, r] = k.split(',').map(Number);
            const p = HexUtils.toPx(q, r, engine.mapConfig);
            const h = engine.map.getTerrainHeight(q, r);
            
            // Adjust bounds based on Hex size
            const halfW = 20; // Approx half width
            
            if (p.x - halfW < minX) minX = p.x - halfW;
            if (p.x + halfW > maxX) maxX = p.x + halfW;
            
            // Visual Top (includes block height)
            // Note: In screen coords, Y decreases as we go up.
            // p.y is the "ground floor" center. The block extends UP by `h`.
            // And maybe a bit more for the surface.
            const visualTop = p.y - h - BLOCK_HEIGHT; 
            const visualBottom = p.y + BLOCK_HEIGHT/2;

            if (visualTop < minY) minY = visualTop;
            if (visualBottom > maxY) maxY = visualBottom;
            
            count++;
        });

        // Fallback if map is empty
        if (count === 0) {
            const centerHex = { q: Math.floor(engine.mapConfig.w / 2), r: Math.floor(engine.mapConfig.h / 2) };
            const p = HexUtils.toPx(centerHex.q, centerHex.r, engine.mapConfig);
            minX = maxX = p.x;
            minY = maxY = p.y;
        }

        const mapCenterX = (minX + maxX) / 2;
        const mapCenterY = (minY + maxY) / 2;

        // Visual Correction:
        // Center the calculated bounding box on screen.
        // Camera (0,0) is screen center.
        // Camera Position (x,y) is the point in world space that is mapped to screen center.
        // So we just set camera x,y to the map center.
        
        // No extra offset needed if bounding box is correct.
        
        camera.current.x = mapCenterX;
        camera.current.y = mapCenterY;
        
        // SNAP LOGIC
        engine.renderer?.camera.snapTo(camera.current.x, camera.current.y, camera.current.zoom);

    }, [engine.mapConfig, engine.mapKeys]);

    const pan = useCallback((dx: number, dy: number) => {
        if (isNaN(dx) || isNaN(dy)) return;
        if (dx === 0 && dy === 0) return;
        
        // Inverted Pan: Dragging right (dx > 0) should move map right.
        // To move map right, camera must move left (decrease X).
        camera.current.x -= dx / camera.current.zoom;
        camera.current.y -= dy / camera.current.zoom;
    }, []);

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
