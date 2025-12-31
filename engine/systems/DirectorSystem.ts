
import { GameEngine, Agent } from "../game";
import { HexUtils } from "../utils";
import { Point } from "../../types";

export class DirectorSystem {
    // Configuration
    private readonly IDLE_ZOOM = 0.9;
    private readonly COMBAT_ZOOM = 1.15;
    private readonly ULT_ZOOM = 1.45;
    
    // Controls
    public enabled: boolean = true;

    // State
    private currentFocusPoint: Point = { x: 0, y: 0 };
    private currentZoomLevel: number = 1.0;
    
    // 興趣點平滑過渡用
    private lastCentroidX: number = 0;
    private lastCentroidY: number = 0;
    private hasInitialized: boolean = false;

    public reset(engine: GameEngine) {
        const ds = engine.state.director;
        ds.targetId = null;
        ds.focusTimer = 0;
        ds.priorityTimer = 0;
        this.hasInitialized = false;
        // Default to enabled on reset
        this.enabled = true;
    }

    public forceFocus(engine: GameEngine, id: string, duration: number = 2.0) {
        const ds = engine.state.director;
        ds.targetId = id;
        ds.priorityTimer = duration; // 優先權計時器，防止被普通邏輯覆蓋
        ds.focusTimer = duration;
    }

    public update(engine: GameEngine, dt: number) {
        if (!this.enabled) return;

        const ds = engine.state.director;
        
        // 1. Timer Logic
        if (ds.priorityTimer > 0) ds.priorityTimer -= dt;
        if (ds.focusTimer > 0) ds.focusTimer -= dt;

        // 2. Select Target (Decision Making)
        this.decideTarget(engine, ds);

        // 3. Calculate Cinematic Frame (Computation)
        const frame = this.calculateFrame(engine, ds.targetId);

        // 4. Push to Camera System (Action)
        if (engine.renderer && frame) {
            engine.renderer.camera.setDirectorTarget(frame.x, frame.y, frame.zoom);
        }
    }

    private decideTarget(engine: GameEngine, ds: any) {
        // 如果有強制優先權 (如奧義剛放)，不切換目標
        if (ds.priorityTimer > 0) return;

        // 如果當前目標無效或計時結束，尋找新目標
        let needNewTarget = false;
        
        if (ds.targetId) {
            const current = engine.agents.find(a => a.id === ds.targetId);
            if (!current || current.hp <= 0 || current.banished) {
                needNewTarget = true;
            } else if (ds.focusTimer <= 0) {
                // 時間到，嘗試切換更有趣的目標
                needNewTarget = true; 
            }
        } else {
            needNewTarget = true;
        }

        if (needNewTarget) {
            const bestCandidate = this.findBestCandidate(engine);
            if (bestCandidate) {
                // 如果目標改變了，設定新的關注時間
                if (ds.targetId !== bestCandidate.id) {
                    ds.targetId = bestCandidate.id;
                    // 根據動作給予不同的鏡頭時間
                    // 奧義/施法：給多一點時間 (3-4s)
                    // 移動/被打：給少一點時間 (2-3s)
                    const isAction = bestCandidate.castingSkillIdx !== -1;
                    ds.focusTimer = isAction ? 4.0 : 2.5;
                }
            } else {
                // 沒人活著，清空目標 (鏡頭將飄向戰場中心)
                ds.targetId = null;
            }
        }
    }

    private findBestCandidate(engine: GameEngine): Agent | null {
        let candidates: Agent[] = [];
        let maxScore = -1;
        let best: Agent | null = null;

        for (const a of engine.agents) {
            if (a.hp <= 0 || a.banished) continue;

            // 評分系統 (Director Scoring)
            let score = Math.random() * 10; // 基礎隨機性，避免死板

            // A. 狀態加權
            if (a.castingSkillIdx !== -1) {
                const skill = a.skills[a.castingSkillIdx];
                if (skill?.tag === 'ULT') score += 50; // 奧義極高權重
                else if (skill?.tag === 'ACTIVE') score += 20;
                else score += 5; // 普攻
            }
            if (a.hitFlashTimer > 0) score += 15; // 正在被打
            if (a.isMoving) score += 5;

            // B. 職業加權 (DPS 和 Tank 打架比較好看)
            if (a.role === 'WARRIOR' || a.role === 'TANK') score += 2;

            if (score > maxScore) {
                maxScore = score;
                best = a;
            }
        }
        return best;
    }

    private calculateFrame(engine: GameEngine, targetId: string | null): { x: number, y: number, zoom: number } | null {
        let targetX = 0;
        let targetY = 0;
        let targetZoom = this.IDLE_ZOOM;

        const mainActor = targetId ? engine.agents.find(a => a.id === targetId) : null;

        if (mainActor && mainActor.hp > 0) {
            // --- 戰鬥構圖邏輯 ---
            
            // 1. 基礎位置：主角
            targetX = mainActor.px;
            targetY = mainActor.py;
            
            // 2. 關係修正：如果有攻擊目標，鏡頭移向兩者中間
            if (mainActor.target && mainActor.target.hp > 0) {
                const t = mainActor.target;
                
                // 權重平均：主角 60%，目標 40% (讓鏡頭稍微偏向主角)
                targetX = mainActor.px * 0.6 + t.px * 0.4;
                targetY = mainActor.py * 0.6 + t.py * 0.4;
                
                // 3. 動態縮放：根據距離調整
                // 距離越近，Zoom 越大 (Close up fight)
                const dist = HexUtils.dist(mainActor, t); // Hex distance
                if (dist < 2) targetZoom = this.COMBAT_ZOOM; // Close combat
                else if (dist < 6) targetZoom = 1.05;        // Mid range
                else targetZoom = 0.95;                      // Long range sniping
                
            } else if (mainActor.isMoving && mainActor.path.length > 0) {
                // 如果在移動，鏡頭稍微看向前方 (Look Ahead)
                // 預判 100px
                targetX += mainActor.physics.vx * 0.5; 
                targetY += mainActor.physics.vy * 0.5;
                targetZoom = 1.0;
            } else {
                // 待機特寫
                targetZoom = 1.1; 
            }

            // 4. 奧義特寫 override
            if (mainActor.castingSkillIdx !== -1) {
                const skill = mainActor.skills[mainActor.castingSkillIdx];
                if (skill?.tag === 'ULT') {
                    // 奧義時，鏡頭聚焦於施法者，並拉近
                    targetX = mainActor.px;
                    targetY = mainActor.py - 20; // 稍微抬高一點構圖
                    targetZoom = this.ULT_ZOOM;
                }
            }

        } else {
            // --- 廣角模式 ---
            // 沒有特定目標，計算所有存活單位的重心
            let sumX = 0, sumY = 0, count = 0;
            for (const a of engine.agents) {
                if (a.hp > 0) {
                    sumX += a.px;
                    sumY += a.py;
                    count++;
                }
            }

            if (count > 0) {
                targetX = sumX / count;
                targetY = sumY / count;
                // 根據單位分佈廣度調整 Zoom? 暫時固定廣角
                targetZoom = this.IDLE_ZOOM;
            } else {
                // 完全沒人，看地圖中心
                const centerHex = { q: Math.floor(engine.mapConfig.w/2), r: Math.floor(engine.mapConfig.h/2) };
                const centerPx = HexUtils.toPx(centerHex.q, centerHex.r, engine.mapConfig);
                targetX = centerPx.x;
                targetY = centerPx.y;
                targetZoom = 0.8;
            }
        }

        // --- 平滑重心 (Stabilizer) ---
        // 避免因為目標切換導致瞬間座標跳變
        if (!this.hasInitialized) {
            this.lastCentroidX = targetX;
            this.lastCentroidY = targetY;
            this.hasInitialized = true;
        }

        // 這裡做一層極輕微的緩衝，防止計算出的 frame 跳動
        // 真正的物理慣性由 CameraSystem 處理
        this.lastCentroidX += (targetX - this.lastCentroidX) * 0.1;
        this.lastCentroidY += (targetY - this.lastCentroidY) * 0.1;

        return { x: targetX, y: targetY, zoom: targetZoom };
    }
}
