
import { GameEngine, Agent } from "../game";
import { Role, Team, Skill, AnimState } from "../../types";
import { UNIT_DB } from "../../data/units";
import { COLORS } from "../../constants";
import { HexUtils } from "../utils";

export class AgentManager {
    constructor() {}

    public addAgent(engine: GameEngine, team: Team, q: number, r: number, hpOverride?: number): Agent | null {
        if (!engine.map.isValid(q, r) || engine.map.isBlocked(q, r, engine)) return null;
        
        const a = new Agent(team, q, r, engine.mapConfig);
        
        // Smart Role Selection Strategy
        // Count existing roles in the team to maintain composition balance
        const allRoles = [Role.TANK, Role.WARRIOR, Role.RANGER, Role.MAGE, Role.SUPPORT];
        const teamAgents = engine.agents.filter(ag => ag.team === team);
        const roleCounts = new Map<Role, number>();
        allRoles.forEach(role => roleCounts.set(role, 0));
        teamAgents.forEach(ag => roleCounts.set(ag.role, (roleCounts.get(ag.role) || 0) + 1));
        
        // Find roles with minimum count
        let minCount = 999;
        roleCounts.forEach(c => { if(c < minCount) minCount = c; });
        
        const candidates = allRoles.filter(role => roleCounts.get(role) === minCount);
        a.role = candidates[Math.floor(Math.random() * candidates.length)];
        
        // ID Generation
        const suffix = Math.random().toString(36).substr(2, 4).toUpperCase();
        a.id = `${a.role}-${suffix}`;
        
        // Apply Base Stats from DB
        const stats = UNIT_DB[a.role];
        a.maxHp = hpOverride || stats.maxHp;
        a.hp = a.maxHp;
        a.maxMp = stats.maxMp;
        a.moveSpeed = stats.moveSpeed; 
        
        // Critical Fix: Copy Physics/Movement properties
        a.movementType = stats.movementType;
        a.jump = stats.jump;
        a.weight = stats.weight;

        // Skill Selection: 1 Ult, 1 Active, 1 Basic
        const validSkills = engine.skillDB.filter(s => s.role === a.role && (s.team === undefined || s.team === team));
        const rnd = (ar: Skill[]) => ar.length > 0 ? ar[Math.floor(Math.random() * ar.length)].id : null;
        
        a.skillIds = [
            rnd(validSkills.filter(s => s.tag === 'ULT')),
            rnd(validSkills.filter(s => s.tag === 'ACTIVE')),
            rnd(validSkills.filter(s => s.tag === 'BASIC'))
        ];
        
        // Spawn Effect
        a.spawnTimer = 0.5;
        engine.events.push({ 
            type: 'SPAWN', 
            pos: { x: a.px, y: a.py },
            color: COLORS[team],
            sourceId: a.id
        });

        // CRITICAL FIX: If game is already running, we must build AI immediately
        // otherwise this unit will be brainless until next restart.
        if (engine.isRunning) {
            a.skills = a.skillIds.map(id => {
                if (!id) return null;
                return engine.skillDB.find(s => s.id === id) || null;
            });
            a.bt = engine.ai.buildAI(a, engine);
            a.animState = AnimState.IDLE;
        }

        // Register
        engine.agents.push(a);
        engine.agentMap.set(HexUtils.hash(q, r), a);
        
        return a;
    }

    public handleDeadState(a: Agent, engine: GameEngine) {
        if (a.fullyDead) return;
        
        if (!a.deadLogged) {
            engine.log(a, 'DEATH', '死亡', null, '陣亡');
            
            // Push Event: Renderer will handle the visual explosion (Shatter)
            engine.events.push({ 
                type: 'DEATH', 
                pos: {x: a.px, y: a.py}, 
                sourceId: a.id,
                team: a.team // Pass team for color coding debris
            });
            
            a.deadLogged = true;
            a.setAnim(AnimState.DEAD);
            
            // Remove from spatial map so others can walk here
            engine.agentMap.delete(HexUtils.hash(a.q, a.r));
            
            // SANITIZATION: Clear all Status Effects
            a.banished = false;
            a.stunTimer = 0;
            a.silenceTimer = 0;
            a.visualStatus = 'NONE';
            
            // INSTANT VANISH: logic is done, body is hidden, particles take over
            a.fullyDead = true; 
            a.isMoving = false; 
            a.path = [];
        }
    }
}
