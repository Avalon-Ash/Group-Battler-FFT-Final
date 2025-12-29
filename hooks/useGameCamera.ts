
import { useRef, useCallback } from 'react';
import { GameEngine } from '../engine/game';
import { HexUtils } from '../engine/utils';
import { BLOCK_HEIGHT, HEX_SIZE } from '../constants';

export const useGameCamera = (engine: GameEngine) => {
    // Default safe values
    const camera = useRef({ x: 0, y: 0, zoom: 1.0 });

    const centerCamera = useCallback((width: number, height: number) => {
        if (!width || !height || width <= 0 || height <= 0) return;

        const mapConfig = engine.mapConfig;
        
        // 1. Calculate the Centroid of the PLAYABLE SURFACE
        // We iterate through all tiles to find the average X and Y of the *Top Face*.
        // This ignores the massive "pedestal" depth below the tile.
        let minX = Infinity, maxX = -Infinity;
        let minY = Infinity, maxY = -Infinity;
        let validTiles = 0;

        engine.map.getMapKeys().forEach(k => {
            const [q, r] = k.split(',').map(Number);
            const p = HexUtils.toPx(q, r, mapConfig);
            const h = engine.map.getTerrainHeight(q, r);
            
            // Visual Y of the top face is (GroundY - Height)
            const topY = p.y - h;

            if (p.x < minX) minX = p.x;
            if (p.x > maxX) maxX = p.x;
            if (topY < minY) minY = topY;
            if (topY > maxY) maxY = topY;
            
            validTiles++;
        });

        if (validTiles === 0) return;

        // Visual Center of the bounding box
        const visualCenterX = (minX + maxX) / 2;
        const visualCenterY = (minY + maxY) / 2;

        // 2. Layout Specific Adjustments
        // FLAT layout tends to have very tall pedestals at the bottom.
        // We shift the camera center DOWN (positive Y) to push the world UP on screen,
        // effectively cropping the bottom "void" space.
        let offsetY = 0;
        
        if (mapConfig.layout === 'FLAT') {
            // Shift target down by ~1.5 blocks to hide the base pillars
            offsetY = BLOCK_HEIGHT * 1.5; 
        } else {
            // Pointy layout is usually more centered, slight adjustment
            offsetY = BLOCK_HEIGHT * 0.5;
        }

        // 3. Cinematic Zoom Calculation
        // Fit the width of the content with some padding
        const mapWidth = maxX - minX;
        const mapHeight = maxY - minY; // Use visual top-face height
        
        // Add padding (approx 1 hex on sides)
        const paddedW = mapWidth + HEX_SIZE * 3;
        const paddedH = mapHeight + HEX_SIZE * 3;

        const zoomX = width / paddedW;
        const zoomY = height / paddedH;
        
        // Choose the tighter zoom, but clamp for sanity
        let targetZoom = Math.min(zoomX, zoomY);
        
        // Zoom Limits:
        // Min 0.7: Don't show too much void on huge maps
        // Max 1.3: Don't get too pixelated on small maps
        targetZoom = Math.max(0.7, Math.min(1.3, targetZoom));

        // 4. Apply
        camera.current.x = visualCenterX;
        camera.current.y = visualCenterY + offsetY;
        camera.current.zoom = targetZoom;
        
        engine.renderer?.camera.snapTo(camera.current.x, camera.current.y, camera.current.zoom);

    }, [engine.mapConfig, engine.mapVersion]);

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
