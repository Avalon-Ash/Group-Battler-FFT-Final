
// [ENTITY] 純資料容器，不放任何方法。
// 生命週期（存檔／重置）在 AgentLifecycle.ts；其他邏輯請移至對應 System。

import { Skill, Hex, BodyTypeId, EffectSlots, SpecialVisualStatus, AgentView } from "../../types";
import { Team, Role, MovementType, AnimState, AIState, ActionState } from "../types/Enums";
import { RagdollBone } from "../types/ragdoll";
import { HexUtils, MapConfig } from "../utils";
import { BTNode } from "../behaviorTree";
import { AGENT_CONSTANTS } from "../../constants";
import { createEffectSlots } from "./Effects";
import { createAgentView } from "./ViewCommands";

export type { SpecialVisualStatus, AgentView };

export class Agent {
    public id: string;
    public team: Team;
    public role: Role;
    public q: number;
    public r: number;
    public px: number;
    public py: number;
    public bodyType?: BodyTypeId;

    public hp: number = 100;
    public maxHp: number = 100;
    public shield: number = 0;
    public maxShield: number = 0;
    public mp: number = 0;
    public maxMp: number = 100;
    public moveSpeed: number = 1.0;
    public moveSpeedMult: number = 1.0;
    public jump: number = 1;
    public weight: number = 1;
    public movementType: MovementType = MovementType.GROUND;

    public skillIds: (string | null)[] = [null, null, null];
    public skills: (Skill | null)[] = [];
    public castingSkillIdx: number = -1;
    public castTimer: number = 0;
    public castingAnimationTimer: number = 0;
    public curCDs: number[] = [0, 0, 0];
    public currentTelegraph: {q: number, r: number}[] | null = null;

    public isMoving: boolean = false;
    public path: Hex[] = [];
    public trajectory: Hex[] = [];
    public moveProgress: number = 0;
    public stuckTicks: number = 0;
    public facing: number = 1;
    public target: Agent | null = null;
    public targetHex: Hex | null = null;
    public _savedCombatTarget?: Agent | null = null;
    public aiState: AIState = AIState.IDLE;
    public bt: BTNode | null = null;
    
    public aiUpdateTimer: number = 0;
    public aiUpdateInterval: number = AGENT_CONSTANTS.DEFAULT_AI_UPDATE_INTERVAL;
    public forceAiUpdate: boolean = false;

    // SSOT Update: Store terrain height 'h' to ensure trails respect topography
    public trailHistory: {x: number, y: number, z: number, h: number}[] = [];

    // [ECS-lite S1] 狀態效果槽位（固定 13 槽，零每幀配置）
    public effects: EffectSlots = createEffectSlots();

    public banished: boolean = false;
    public outOfBounds: boolean = false;


    public drStacks: Record<string, number> = {};
    public drTimers: Record<string, number> = {};

    public dragOverQ: number | null = null;
    public dragOverR: number | null = null;
    public view: AgentView = createAgentView();
    // [ownership] CC 施加的特殊外觀（狀態域：CCManager 施加、ControlSystem 到期清除）；visualStatus 由 AnimationSystem 從它推導。
    public ccVisual: SpecialVisualStatus = 'NONE';
    public hasLandedLastStand: boolean = false; // Track one-time EMP hit
    public spawnTimer: number = 0;
    public escapeCooldown: number = 0; // Added missing property
    public _interruptCooldown: number = 0;
    public _castCompleteCooldown: number = 0;

    public deadLogged: boolean = false;
    public deathTimer: number = 0;
    public readonly DEATH_ANIM_DURATION = AGENT_CONSTANTS.DEATH_ANIM_DURATION;
    public fullyDead: boolean = false;
    public ragdoll: RagdollBone[] | null = null; // [ARCH] null = 未啟動，死亡時由 AgentManager 初始化
    public animState: AnimState = AnimState.IDLE;
    public lastHitDamage: number = 0;
    public lastHitSourceId: string | null = null;
    public actionState: ActionState = ActionState.IDLE;
    public fearMoveTimer: number = 0;

    public physics = {
        x: 0, y: 0, z: 0,
        vx: 0, vy: 0, vz: 0,
        angle: 0, vAngle: 0
    };

    public initialState: { q: number, r: number, maxHp: number, skillIds: (string|null)[], role: Role, bodyType?: BodyTypeId };

    constructor(id: string, team: Team, q: number, r: number, config: MapConfig) {
        this.id = id;
        this.team = team;
        this.role = Role.WARRIOR;
        this.q = q;
        this.r = r;

        const p = HexUtils.toPx(q, r, config);
        this.px = p.x;
        this.py = p.y;
        this.facing = team === Team.BLUE ? 1 : -1;
        
        this.aiUpdateInterval = AGENT_CONSTANTS.DEFAULT_AI_UPDATE_INTERVAL;
        this.aiUpdateTimer = 0;

        this.initialState = { q, r, maxHp: 100, skillIds: [], role: Role.WARRIOR, bodyType: this.bodyType };
    }
}
