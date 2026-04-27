
import { useRef, useCallback } from 'react';
import { GameEngine } from '../engine/game';
import { HexUtils } from '../engine/utils';
import { BLOCK_HEIGHT, HEX_SIZE } from '../constants';

/**
 * 攝像機座標映射鉤子 v29.0
 * 僅保留初始化與座標獲取。位移交給 CameraSystem。
 */
export const useGameCamera = (engine: GameEngine) => {
    const camera = useRef({ x: 0, y: 0, zoom: 1.0 });

    const centerCamera = useCallback((width: number, height: number) => {
        if (!width || !height || width <= 0 || height <= 0) return;

        engine.screenW = width;
        engine.screenH = height;
        engine.screenAspect = width / height;

        const mapConfig = engine.mapConfig;
        let minX = Infinity, maxX = -Infinity;
        let minY = Infinity, maxY = -Infinity;
        let validTiles = 0;

        engine.map.getMapKeys().forEach(k => {
            const [q, r] = k.split(',').map(Number);
            const p = HexUtils.toPx(q, r, mapConfig);
            const h = engine.map.getTerrainHeight(q, r);
            const topY = p.y - h;

            if (p.x < minX) minX = p.x;
            if (p.x > maxX) maxX = p.x;
            if (topY < minY) minY = topY;
            if (topY > maxY) maxY = topY;
            
            validTiles++;
        });

        if (validTiles === 0) return;

        const visualCenterX = (minX + maxX) / 2;
        const visualCenterY = (minY + maxY) / 2;

        let offsetY = mapConfig.layout === 'FLAT' ? BLOCK_HEIGHT * 1.5 : BLOCK_HEIGHT * 0.5;

        const mapWidth = maxX - minX;
        const mapHeight = maxY - minY;
        const paddedW = mapWidth + HEX_SIZE * 3;
        const paddedH = mapHeight + HEX_SIZE * 3;

        let targetZoom = Math.max(0.7, Math.min(1.3, Math.min(width / paddedW, height / paddedH)));

        camera.current.x = visualCenterX;
        camera.current.y = visualCenterY + offsetY;
        camera.current.zoom = targetZoom;
        
        // 同步至物理系統
        engine.renderer?.camera.snapTo(camera.current.x, camera.current.y, camera.current.zoom);

    }, [engine.mapConfig, engine.mapVersion]);

    const zoom = useCallback((delta: number) => {
        if (isNaN(delta)) return;
        camera.current.zoom = Math.max(0.4, Math.min(3.0, camera.current.zoom + delta));
    }, []);

    return { 
        camera, 
        centerCamera, 
        zoom
    };
};
