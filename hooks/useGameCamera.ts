
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

        // 1. Terrain Bounds
        engine.mapKeys.forEach(k => {
            const [q, r] = k.split(',').map(Number);
            const p = HexUtils.toPx(q, r, engine.mapConfig);
            const h = engine.map.getTerrainHeight(q, r);
            
            const halfW = 20;
            if (p.x - halfW < minX) minX = p.x - halfW;
            if (p.x + halfW > maxX) maxX = p.x + halfW;
            
            // Critical: Include the Height of the block in the bounding box
            const visualTop = p.y - h - BLOCK_HEIGHT; 
            const visualBottom = p.y + BLOCK_HEIGHT;

            if (visualTop < minY) minY = visualTop;
            if (visualBottom > maxY) maxY = visualBottom;
            
            count++;
        });

        // 2. Unit Bounds
        engine.agents.forEach(a => {
            if (a.hp <= 0 && a.fullyDead) return;
            if (a.px < minX) minX = a.px;
            if (a.px > maxX) maxX = a.px;
            
            const h = engine.map.getTerrainHeight(a.q, a.r);
            // Include jump height + unit visual height
            const topY = a.py - h - a.physics.z - 120; 
            if (topY < minY) minY = topY;
            if (a.py > maxY) maxY = a.py;
            count++;
        });

        if (count === 0) {
            const centerHex = { q: Math.floor(engine.mapConfig.w / 2), r: Math.floor(engine.mapConfig.h / 2) };
            const p = HexUtils.toPx(centerHex.q, centerHex.r, engine.mapConfig);
            minX = maxX = p.x;
            minY = maxY = p.y;
        }

        const mapCenterX = (minX + maxX) / 2;
        const mapCenterY = (minY + maxY) / 2;
        const mapW = maxX - minX + 200; // Padding
        const mapH = maxY - minY + 200;

        // Auto Zoom Fit
        const zoomX = width / mapW;
        const zoomY = height / mapH;
        const bestZoom = Math.min(zoomX, zoomY, 1.2); // Cap zoom at 1.2

        camera.current.x = mapCenterX;
        camera.current.y = mapCenterY;
        camera.current.zoom = Math.max(0.5, bestZoom); // Min zoom 0.5
        
        engine.renderer?.camera.snapTo(camera.current.x, camera.current.y, camera.current.zoom);

    }, [engine.mapConfig, engine.mapKeys, engine.agents]);

    const pan = useCallback((dx: number, dy: number) => {
        if (isNaN(dx) || isNaN(dy)) return;
        camera.current.x -= dx / camera.current.zoom;
        camera.current.y -= dy / camera.current.zoom;
    }, []);

    const zoom = useCallback((delta: number) => {
        if (isNaN(delta)) return;
        const newZoom = Math.max(0.4, Math.min(3.0, camera.current.zoom + delta));
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
