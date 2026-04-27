
import { GameEngine, Agent } from "../game";
import { Role, Team, Skill, AnimState } from "../../types";
import { UNIT_DB } from "../../data/units";
import { FACTION_VISUALS } from "../../data/vfx/faction_visuals";
import { UnitShatter } from "./visuals/effects/UnitShatter";

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
        if (a.fullyDead) return;
        if (!a.deadLogged) {
            engine.log(a, 'DEATH', '死亡', null, '陣亡');
            engine.events.push({ 
                type: 'DEATH', 
                pos: { x: a.px, y: a.py, z: a.physics.z }, 
                sourceId: a.id, 
                targetId: a.id,
                team: a.team 
            });
            
            if (a.lastHitSourceId) {
                engine.events.push({
                    type: 'KILL',
                    pos: { x: a.px, y: a.py },
                    sourceId: a.lastHitSourceId,
                    targetId: a.id
                });
            }
            
            a.deadLogged = true;
            a.deathTimer = a.DEATH_ANIM_DURATION; 
            
            // Clear status VFX timers
            if (engine.renderer) {
                engine.renderer.vfx.agentVFX.clearAgent(a.id);
            }

            // Trigger Unit Shatter (Ragdoll Parts)
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

            UnitShatter.spawn(engine.vfx, a, groundZ, impactX, impactY);
        }
        // SSOT: AnimationSystem will see hp <= 0 and set AnimState.DEAD
        engine.map.unregisterAgent(a);
        a.isMoving = false; 
        a.path = [];
        a.trailHistory = [];
    }
}
