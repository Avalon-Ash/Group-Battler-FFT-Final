import React, { useEffect, useRef } from 'react';
import { MatrixConfig } from './types';
import { getMatrixRainBudget } from '../../../engine/renderers/RenderQuality';
interface Drop {
    streamIdx: number;
    pos: number;
    speed: number;
    depth: number;
    seed: number;
}
interface LaneState {
    latestDrop: Drop | null;
}
export const useMatrixRain = (
    canvasRef: React.RefObject<HTMLCanvasElement>, 
    config: MatrixConfig,
    width: number,
    height: number
) => {
    const configRef = useRef(config);
    useEffect(() => { configRef.current = config; }, [config]);
    const timeRef = useRef(0);
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        const initialBudget = getMatrixRainBudget();
        let currentScale = initialBudget.scale;
        canvas.width = Math.max(1, Math.floor(width * currentScale));
        canvas.height = Math.max(1, Math.floor(height * currentScale));
        if (!config.enabled || !initialBudget.enabled) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            if (!config.enabled) return;
        }
        const { direction, fontSize, spacing } = configRef.current;
        const isVertical = direction === 'DOWN' || direction === 'UP';
        const totalSize = fontSize + spacing;
        const laneCount = Math.ceil(isVertical ? width / totalSize : height / totalSize);
        const lanes: LaneState[] = Array.from({ length: laneCount }, () => ({ latestDrop: null }));
        let drops: Drop[] = [];
        let animationId: number;
        function createDrop(laneIdx: number, cfg: MatrixConfig): Drop {
            const depthScale = 1.0 + (Math.random() - 0.5) * cfg.depthVariance;
            return {
                streamIdx: laneIdx,
                pos: 0,
                speed: (1 + Math.random() * 2),
                depth: depthScale,
                seed: Math.random() * 1000
            };
        }
        const boundLimit = isVertical ? height : width;
        for (let i = 0; i < laneCount; i++) {
            const d = createDrop(i, configRef.current);
            d.pos = Math.random() * boundLimit;
            drops.push(d);
            lanes[i].latestDrop = d;
        }
        const getStableChar = (laneIdx: number, cellIdx: number, seed: number, charSet: string, volatility: number, time: number) => {
            const len = charSet.length;
            if (len === 0) return "";
            const timeStep = volatility > 0 ? Math.floor(time * volatility * 0.1) : 0;
            const index = Math.abs((laneIdx * 15485863 + cellIdx * 1231 + timeStep * 7919 + Math.floor(seed)) % len);
            return charSet[index];
        };
        let lastRenderTime = 0;
        const render = (now: number = performance.now()) => {
            const budget = getMatrixRainBudget();

            // ≥2: 停止繪製（保持元素存在、清空畫布）
            if (!budget.enabled) {
                if (canvas.width > 0 && canvas.height > 0) {
                    ctx.clearRect(0, 0, canvas.width, canvas.height);
                }
                animationId = requestAnimationFrame(render);
                return;
            }

            // 更新頻率節流至 30 Hz
            if (budget.hz < 60 && budget.hz > 0) {
                const interval = 1000 / budget.hz;
                if (now - lastRenderTime < interval - 4) {
                    animationId = requestAnimationFrame(render);
                    return;
                }
            }
            lastRenderTime = now;

            // 內部解析度切換
            if (budget.scale !== currentScale) {
                currentScale = budget.scale;
                canvas.width = Math.max(1, Math.floor(width * currentScale));
                canvas.height = Math.max(1, Math.floor(height * currentScale));
            }

            const cfg = configRef.current;
            timeRef.current++;

            if (currentScale < 1.0) {
                ctx.save();
                ctx.scale(currentScale, currentScale);
            }

            ctx.clearRect(0, 0, width, height);
            ctx.textBaseline = 'top';
            let moveDelta = 0, trailDx = 0, trailDy = 0, startBound = 0, endBound = 0;
            switch(cfg.direction) {
                case 'DOWN':  moveDelta = 1;  trailDx = 0; trailDy = -1; startBound = -100; endBound = height + 100; break;
                case 'UP':    moveDelta = -1; trailDx = 0; trailDy = 1;  startBound = height + 100; endBound = -100; break;
                case 'RIGHT': moveDelta = 1;  trailDx = -1; trailDy = 0; startBound = -100; endBound = width + 100; break;
                case 'LEFT':  moveDelta = -1; trailDx = 1;  trailDy = 0; startBound = width + 100; endBound = -100; break;
            }
            const laneSize = cfg.fontSize + cfg.spacing;
            lanes.forEach((lane, idx) => {
                const spawnOrigin = moveDelta > 0 ? -cfg.fontSize * 5 : (isVertical ? height : width) + cfg.fontSize * 5;
                const gapPixels = (cfg.streamGap * (isVertical ? height : width)) + (cfg.trailLength * cfg.fontSize);
                let canSpawn = false;
                if (!lane.latestDrop) {
                    canSpawn = true;
                } else {
                    const lastPos = lane.latestDrop.pos;
                    if (moveDelta > 0) {
                        if (lastPos > spawnOrigin + gapPixels) canSpawn = true;
                    } else {
                        if (lastPos < spawnOrigin - gapPixels) canSpawn = true;
                    }
                }
                if (canSpawn) {
                    if (cfg.streamGap === 0 || Math.random() < 0.1) {
                        const d = createDrop(idx, cfg);
                        d.pos = spawnOrigin;
                        drops.push(d);
                        lane.latestDrop = d;
                    }
                }
            });
            for (let i = drops.length - 1; i >= 0; i--) {
                const drop = drops[i];
                const effectiveSpeed = drop.speed * cfg.speed * drop.depth;
                drop.pos += effectiveSpeed * moveDelta;
                const isOffScreen = moveDelta > 0 ? (drop.pos > endBound + (cfg.trailLength * cfg.fontSize)) : (drop.pos < endBound - (cfg.trailLength * cfg.fontSize));
                if (isOffScreen) {
                    if (lanes[drop.streamIdx].latestDrop === drop) lanes[drop.streamIdx].latestDrop = null;
                    drops.splice(i, 1);
                    continue;
                }
                const size = Math.max(1, cfg.fontSize * drop.depth);
                ctx.font = `bold ${size}px monospace`;
                const depthAlpha = Math.min(1, Math.max(0.2, (drop.depth - 0.2)));
                const lanePos = drop.streamIdx * laneSize;
                for (let j = 0; j < cfg.trailLength; j++) {
                    const charOffset = j * size;
                    let x = 0, y = 0;
                    if (isVertical) { x = lanePos; y = drop.pos + (charOffset * trailDy); }
                    else { x = drop.pos + (charOffset * trailDx); y = lanePos; }
                    if (x < -size || x > width + size || y < -size || y > height + size) continue;
                    const fade = Math.max(0, (1 - j / cfg.trailLength));
                    const alpha = fade * cfg.textOpacity * depthAlpha;
                    const virtualIdx = Math.floor((isVertical ? y : x) / size);
                    const char = getStableChar(drop.streamIdx, virtualIdx, drop.seed, cfg.charSet, cfg.volatility, timeRef.current);
                    if (j === 0) {
                        ctx.fillStyle = cfg.headColor;
                        if (drop.depth > 0.8) { ctx.shadowColor = cfg.headColor; ctx.shadowBlur = 5 * drop.depth; }
                        else ctx.shadowBlur = 0;
                    } else {
                        ctx.fillStyle = cfg.textColor;
                        ctx.shadowBlur = 0;
                    }
                    ctx.globalAlpha = alpha;
                    ctx.fillText(char, x, y);
                }
            }
            ctx.globalAlpha = 1.0;
            ctx.shadowBlur = 0;

            if (currentScale < 1.0) {
                ctx.restore();
            }

            animationId = requestAnimationFrame(render);
        };
        render();
        return () => cancelAnimationFrame(animationId);
    }, [width, height, config.direction, config.fontSize, config.spacing, config.depthVariance, config.streamGap, config.enabled]); 
};