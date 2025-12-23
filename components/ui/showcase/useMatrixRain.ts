
import React, { useEffect, useRef } from 'react';
import { MatrixConfig } from './types';

// A single "Drop" or "Snake" of code
interface Drop {
    streamIdx: number; // Which lane (column/row) this drop is in
    pos: number;       // Current head position along the flow axis
    speed: number;     // Base speed
    depth: number;     // 0.5 (far) to 1.5 (close) - Affects size, speed, opacity
    seed: number;      // Random seed for character stability
}

// Tracks the state of a lane to determine when to spawn the next drop
interface LaneState {
    latestDrop: Drop | null; // Reference to the most recently spawned drop in this lane
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

        canvas.width = width;
        canvas.height = height;

        const { direction, fontSize, spacing } = configRef.current;
        const isVertical = direction === 'DOWN' || direction === 'UP';
        
        // 1. Setup Grid / Lanes
        const totalSize = fontSize + spacing;
        const laneCount = Math.ceil(isVertical ? width / totalSize : height / totalSize);
        
        // Lanes track the latest drop to calculate gaps
        const lanes: LaneState[] = Array.from({ length: laneCount }, () => ({
            latestDrop: null
        }));

        // Active Drops (The visible entities)
        let drops: Drop[] = [];

        let animationId: number;

        // --- Helper: Create a new Drop ---
        function createDrop(laneIdx: number, cfg: MatrixConfig): Drop {
            // Depth Logic:
            // Variance 0 = Always 1.0
            // Variance 1 = Range 0.5 to 1.5
            const depthScale = 1.0 + (Math.random() - 0.5) * cfg.depthVariance;
            
            return {
                streamIdx: laneIdx,
                pos: 0, // Will be set by spawner
                speed: (1 + Math.random() * 2), // Base randomness
                depth: depthScale,
                seed: Math.random() * 1000
            };
        }

        // Initial Seed: Fill screen with random drops
        const boundLimit = isVertical ? height : width;
        for (let i = 0; i < laneCount; i++) {
            // Spawn 1 drop per lane initially for coverage
            const d = createDrop(i, configRef.current);
            d.pos = Math.random() * boundLimit;
            drops.push(d);
            lanes[i].latestDrop = d;
        }

        // --- Helper: Stable Character Picker ---
        const getStableChar = (laneIdx: number, cellIdx: number, seed: number, charSet: string, volatility: number, time: number) => {
            const len = charSet.length;
            if (len === 0) return "";
            const timeStep = volatility > 0 ? Math.floor(time * volatility * 0.1) : 0;
            // Mix seed into the hash to make different drops in same lane look different
            const index = Math.abs((laneIdx * 15485863 + cellIdx * 1231 + timeStep * 7919 + Math.floor(seed)) % len);
            return charSet[index];
        };

        const render = () => {
            const cfg = configRef.current;
            timeRef.current++;
            
            // 1. Clear Frame
            ctx.clearRect(0, 0, width, height);
            ctx.textBaseline = 'top';

            // 2. Determine Directions
            let moveDelta = 0; // +1 or -1
            let trailDx = 0; 
            let trailDy = 0;
            let startBound = 0;
            let endBound = 0;

            switch(cfg.direction) {
                case 'DOWN':  
                    moveDelta = 1;  trailDx = 0; trailDy = -1; 
                    startBound = -100; endBound = height + 100;
                    break;
                case 'UP':    
                    moveDelta = -1; trailDx = 0; trailDy = 1;  
                    startBound = height + 100; endBound = -100;
                    break;
                case 'RIGHT': 
                    moveDelta = 1;  trailDx = -1; trailDy = 0; 
                    startBound = -100; endBound = width + 100;
                    break;
                case 'LEFT':  
                    moveDelta = -1; trailDx = 1;  trailDy = 0; 
                    startBound = width + 100; endBound = -100;
                    break;
            }

            const laneSize = cfg.fontSize + cfg.spacing;

            // 3. Spawner Logic (Replenish Drops)
            lanes.forEach((lane, idx) => {
                // Determine spawn point
                // DOWN/RIGHT (Positive Move): Spawn at negative bound
                // UP/LEFT (Negative Move): Spawn at positive bound
                const spawnOrigin = moveDelta > 0 ? -cfg.fontSize * 5 : (isVertical ? height : width) + cfg.fontSize * 5;
                
                // We use a normalized "Gap" multiplier. 
                const gapPixels = (cfg.streamGap * (isVertical ? height : width)) + (cfg.trailLength * cfg.fontSize);
                
                let canSpawn = false;
                
                if (!lane.latestDrop) {
                    // If no active drop in this lane (e.g. it was culled), spawn immediately
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
                    // Random chance to stagger slightly, unless gap is 0 (force flood)
                    if (cfg.streamGap === 0 || Math.random() < 0.1) {
                        const d = createDrop(idx, cfg);
                        d.pos = spawnOrigin;
                        drops.push(d);
                        lane.latestDrop = d;
                    }
                }
            });

            // 4. Update & Render Drops
            // Iterate backwards to allow removal
            for (let i = drops.length - 1; i >= 0; i--) {
                const drop = drops[i];
                
                // A. Move
                // Speed is affected by Depth (Parallax): Closer (Depth > 1) = Faster
                const effectiveSpeed = drop.speed * cfg.speed * drop.depth;
                drop.pos += effectiveSpeed * moveDelta;
                
                // B. Cull Off-Screen
                const isOffScreen = moveDelta > 0 ? (drop.pos > endBound + (cfg.trailLength * cfg.fontSize)) : (drop.pos < endBound - (cfg.trailLength * cfg.fontSize));
                
                if (isOffScreen) {
                    // If this was the tracked "latest" drop, clear the reference so spawner knows the lane is empty
                    if (lanes[drop.streamIdx].latestDrop === drop) {
                        lanes[drop.streamIdx].latestDrop = null;
                    }
                    drops.splice(i, 1);
                    continue;
                }

                // C. Render
                // Font Size scaled by Depth
                const size = Math.max(1, cfg.fontSize * drop.depth);
                ctx.font = `bold ${size}px monospace`;
                
                // Opacity scaled by Depth (Far = Dimmer)
                const depthAlpha = Math.min(1, Math.max(0.2, (drop.depth - 0.2)));
                
                const lanePos = drop.streamIdx * laneSize;

                for (let j = 0; j < cfg.trailLength; j++) {
                    const charOffset = j * size;
                    
                    let x = 0, y = 0;
                    if (isVertical) {
                        x = lanePos;
                        y = drop.pos + (charOffset * trailDy);
                    } else {
                        x = drop.pos + (charOffset * trailDx);
                        y = lanePos;
                    }

                    // Simple cull for individual characters
                    if (x < -size || x > width + size || y < -size || y > height + size) continue;

                    // Fade trail
                    const fade = Math.max(0, (1 - j / cfg.trailLength));
                    const alpha = fade * cfg.textOpacity * depthAlpha;
                    
                    const virtualIdx = Math.floor((isVertical ? y : x) / size);
                    const char = getStableChar(drop.streamIdx, virtualIdx, drop.seed, cfg.charSet, cfg.volatility, timeRef.current);

                    if (j === 0) {
                        ctx.fillStyle = cfg.headColor;
                        // Only add glow for close items or high quality
                        if (drop.depth > 0.8) {
                            ctx.shadowColor = cfg.headColor;
                            ctx.shadowBlur = 5 * drop.depth;
                        } else {
                            ctx.shadowBlur = 0;
                        }
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
            animationId = requestAnimationFrame(render);
        };

        render();

        return () => {
            cancelAnimationFrame(animationId);
        };
    }, [width, height, config.direction, config.fontSize, config.spacing, config.depthVariance, config.streamGap]); 
};
