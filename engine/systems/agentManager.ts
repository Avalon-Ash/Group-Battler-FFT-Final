
// ╔══════════════════════════════════════════════════════════╗
// ║  AgentManager — 單位生命週期管理                         ║
// ║  職責：addAgent / handleDeadState / updateDeathState      ║
// ║  上游：GameEngine.tick（每幀呼叫 updateDeathState）       ║
// ║  下游：RagdollFactory / UnitShatter / VFXSystem(clearAgent)║
// ║  [ARCH] deathTimer 由此累計，UnitDeathPainter 消費        ║
// ║  [TODO: RAGDOLL] ragdoll 快照由此建立，物理由 Painter 實作║
// ╚══════════════════════════════════════════════════════════╝

import { GameEngine } from "../game";           // GameEngine 仍從 game.ts 取（避免循環依賴）
import { Agent } from "../core/Agent";
import { Role, Team, Skill, AnimState } from "../../types";            // [ARCH] Agent 型別契約統一從 types.ts 取
import { UNIT_DB } from "../../data/units";
import { FACTION_VISUALS } from "../../data/vfx/faction_visuals";
import { UnitShatter } from "./visuals/effects/UnitShatter";
import { RagdollFactory } from "./unit/RagdollFactory";

export class AgentManager {
    public addAgent(engine: GameEngine, team: Team, q: number, r: number, hpOverride?: number, roleOverride?: Role): Agent | null {
        if (!engine.map.isValid(q, r) || engine.map.isBlocked(q, r, engine)) return null;
        
        const id = engine.nextId(team === Team.BLUE ? 'BLU' : 'RED');
        const a = new Agent(id, team, q, r, engine.mapConfig);
        
        if (roleOverride) {
            a.role = roleOverride;
        } else {
            const allRoles = [Role.TANK, Role.WARRIOR, Role.RANGER, Role.MAGE, Role.SUPPORT];
            a.role = allRoles[Math.floor(Math.random() * allRoles.length)];
        }
        
        const stats = UNIT_DB[a.role];
        a.maxHp = hpOverride || stats.maxHp;
        a.hp = a.maxHp;
        a.maxMp = stats.maxMp;
        a.moveSpeed = stats.moveSpeed; 
        a.movementType = stats.movementType;
        a.jump = stats.jump;
        a.weight = stats.weight;

        const validSkills = engine.skillDB.filter(s => s.role === a.role && (s.team === undefined || s.team === team));
        const rndS = (ar: Skill[]) => ar.length > 0 ? ar[Math.floor(Math.random() * ar.length)].id : null;
        
        a.skillIds = [
            rndS(validSkills.filter(s => s.tag === 'ULT')),
            rndS(validSkills.filter(s => s.tag === 'ACTIVE')),
            rndS(validSkills.filter(s => s.tag === 'BASIC'))
        ];
        
        const visual = FACTION_VISUALS[team] || FACTION_VISUALS[Team.BLUE];
        a.spawnTimer = 0.5;
        engine.events.push({ type: 'SPAWN', pos: { x: a.px, y: a.py }, color: visual.primaryColor, sourceId: a.id });

        if (engine.isRunning) {
            a.skills = a.skillIds.map(id => engine.skillDB.find(s => s.id === id) || null);
            a.bt = engine.ai.buildAI(a, engine);
            // SSOT: Initial state handled by AnimationSystem
        }

        engine.agents.push(a);
        engine.map.registerAgent(a);
        return a;
    }

    public handleDeadState(a: Agent, engine: GameEngine) {
        if (a.fullyDead || a.deadLogged) return;
        
        engine.log(a, 'DEATH', '死亡', null, '陣亡');
        engine.events.push({ 
            type: 'DEATH', 
            pos: { x: a.px, y: a.py, z: 0 }, 
            sourceId: a.id, 
            targetId: a.id,
            team: a.team 
        });
        
        if (a.lastHitSourceId) {
            engine.events.push({
                type: 'KILL',
                pos: { x: a.px, y: a.py, z: 0 },
                sourceId: a.lastHitSourceId,
                targetId: a.id
            });
        }
            
        a.deadLogged = true;
        a.deathTimer = 0; // [FIX] Start accumulator at 0 for UnitDeathPainter
        
        // ── [FIX] Freeze physics on death ──
        a.physics.vx = 0;
        a.physics.vy = 0;
        a.physics.vz = 0;
        a.physics.x = 0;
        a.physics.y = 0;
        a.physics.z = 0;
        a.isMoving = false;
        a.outOfBounds = false;
        a.banishTimer = 0;
        a.banishMax = 0;
        a.stasisTimer = 0;
        a.stasisMax = 0;
        a.path = [];
        a.trailHistory = [];
        // ──────────────────────────────────

        // [PROMPT] 強制遍歷 activeCCVFX 並清理及回收長效粒子
        if (engine.renderer && engine.renderer.vfx) {
            // Cleanup timers in tracking system
            engine.renderer.vfx.agentVFX.clearAgent(a.id);
            
            // Manually force owned particles life to -1 if they aren't caught by the general ownerId loop
            const particles = engine.renderer.vfx.state.particles;
            for (let i = particles.length - 1; i >= 0; i--) {
                if (particles[i].ownerId === a.id) {
                    particles[i].life = -1;
                }
            }
        }
        a.activeCCVFX = [];

        // [FIX] Trigger Unit Shatter (Ragdoll Parts)
        // NOTE: engine.vfx points to engine.renderer.vfx via getter, ensuring SSOT VFX system.
        const groundZ = engine.getTerrainHeight(a.q, a.r);
        
        const IMPACT_STRENGTH = 300;
        let impactX = 0, impactY = 0;
        if (a.lastHitSourceId) {
            const src = engine.agents.find(x => x.id === a.lastHitSourceId);
            if (src) {
                const dx = a.px - src.px;
                const dy = a.py - src.py;
                const len = Math.sqrt(dx * dx + dy * dy) || 1;
                impactX = (dx / len) * IMPACT_STRENGTH;
                impactY = (dy / len) * IMPACT_STRENGTH;
            }
        }
        if (impactX === 0 && impactY === 0) {
            const angle = Math.random() * Math.PI * 2;
            impactX = Math.cos(angle) * IMPACT_STRENGTH * 0.6;
            impactY = Math.sin(angle) * IMPACT_STRENGTH * 0.6;
        }
        
        // [ARCH] 建立 Ragdoll 初始骨骼快照，供 UnitDeathPainter 使用
        // [TODO: RAGDOLL] 這裡只是靜態快照，物理演算在 UnitDeathPainter.draw() 階段加入
        a.ragdoll = RagdollFactory.createFromAgent(a, impactX, impactY);

        UnitShatter.spawn(engine.vfx, a, groundZ, impactX, impactY);
        // SSOT: AnimationSystem will see hp <= 0 and set AnimState.DEAD
        engine.map.unregisterAgent(a);
    }

    /**
     * [ARCH] 累計死亡計時器，為 UnitDeathPainter 提供資料基礎
     * 當累計時間超過 DEATH_ANIM_DURATION 後將單位標記為 fullyDead
     */
    public updateDeathState(agent: Agent, dt: number) {
        if (agent.hp <= 0 && !agent.fullyDead) {
            // [ARCH] deathTimer 為 UnitDeathPainter 提供死亡進度資料
            // [TODO: RAGDOLL] 當布娃娃系統實作後，此數值將驅動物理分解動畫的時間軸
            agent.deathTimer += dt;

            if (agent.deathTimer >= agent.DEATH_ANIM_DURATION) {
                // fullyDead 設為 true 後，deathTimer 停止累計（見外部 tick 判斷或此處 if 條件）
                agent.fullyDead = true;
            }
        }
    }
}
