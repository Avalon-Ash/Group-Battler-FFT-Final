// ╔══════════════════════════════════════════════════════════╗
// ║  views/l3 — 單位檢查器與技能配置的唯讀快照                ║
// ║  職責：把 Agent 與技能庫轉成純資料，UI 不碰 Agent         ║
// ║  [ARCH] 內容沒變就回傳同一個物件，useSyncExternalStore    ║
// ║ [ARCH] 放逐／出界用 availability，不假報陣亡。            ║
// ║  才不會無限重繪；陣亡、隊伍色、顯示哪種狀態在這裡判斷     ║
// ╚══════════════════════════════════════════════════════════╝
import type { GameEngine } from '../../../game';
import type { Skill } from '../../../../types';
import type { InspectorStatusKind, InspectorView, SkillLoadoutView } from '../../../../types/ui/l3';
import { statusAvailability } from '../../../core/StatusQueries';
import { displayAiState } from '../../../core/AgentDerived';
import { resolveBodyType } from '../../../../data/units/appearance/bodyTypes';
import { ROLE_LABEL, SKILL_ROLE_ORDER, SKILL_SLOT_TAGS, SKILL_TEAM_SUFFIX, TEAM_TONE } from '../../../../data/ui/labels/l3';

interface CacheEntry<V> {
    signature: string;
    view: V;
}

const inspectorCaches = new WeakMap<GameEngine, Map<string, CacheEntry<InspectorView>>>();
const loadoutCaches = new WeakMap<GameEngine, Map<string, CacheEntry<SkillLoadoutView>>>();
const groupCaches = new WeakMap<GameEngine, CacheEntry<Map<Skill['tag'], SkillLoadoutView['slots'][number]['groups']>>>();

const cacheOf = <V>(store: WeakMap<GameEngine, Map<string, CacheEntry<V>>>, engine: GameEngine): Map<string, CacheEntry<V>> => {
    let cache = store.get(engine);
    if (!cache) {
        cache = new Map();
        store.set(engine, cache);
    }
    return cache;
};

/** 選取單位的檢查器快照；單位不存在回傳 null。 */
export function selectInspectorView(engine: GameEngine, agentId: string | null | undefined): InspectorView | null {
    if (!agentId) return null;
    const agent = engine.agents.find((a) => a.id === agentId);
    if (!agent) return null;

    const statusTags: InspectorStatusKind[] = [];
    if (agent.effects.STUN.remaining > 0) statusTags.push('STUN');
    if (agent.effects.SILENCE.remaining > 0) statusTags.push('SILENCE');

    const availability = statusAvailability(agent);
    const isDead = availability === 'DEAD';
    const aiState = displayAiState(agent);
    const bodyType = resolveBodyType(agent);
    const hp = Math.round(agent.hp);
    const maxHp = Math.round(agent.maxHp);
    const mp = Math.round(agent.mp);
    const maxMp = Math.round(agent.maxMp);
    const shield = Math.round(agent.shield);
    const signature = [
        agent.id, agent.team, agent.role, bodyType, hp, maxHp, mp, maxMp, shield, agent.q, agent.r,
        isDead, availability, statusTags.join(','), aiState, agent.actionState,
    ].join('|');

    const cache = cacheOf(inspectorCaches, engine);
    const prev = cache.get(agentId);
    if (prev && prev.signature === signature) return prev.view;

    const view: InspectorView = {
        id: agent.id,
        role: agent.role,
        team: agent.team,
        teamTone: TEAM_TONE[agent.team],
        bodyType,
        hp,
        maxHp,
        mp,
        maxMp,
        shield,
        q: agent.q,
        r: agent.r,
        isDead,
        availability,
        statusTags,
        aiState,
        actionState: agent.actionState,
    };
    cache.set(agentId, { signature, view });
    return view;
}

const dbSignature = (db: readonly Skill[]): string =>
    db.map((s) => `${s.id}:${s.name}:${s.tag}:${s.role}:${s.team ?? ''}`).join(';');

const skillSignature = (s: Skill | null): string =>
    s ? `${s.id}:${s.name}:${s.desc ?? ''}:${s.power}:${s.cd}:${s.cost}:${s.range}:${s.visual ?? ''}:${s.color}` : '-';

/** 每種 tag 的技能選項（依職業分組）。只在技能庫的名單或名稱變了才重建。 */
function groupsByTag(engine: GameEngine, dbSig: string): Map<Skill['tag'], SkillLoadoutView['slots'][number]['groups']> {
    const cached = groupCaches.get(engine);
    if (cached && cached.signature === dbSig) return cached.view;
    const view = new Map<Skill['tag'], SkillLoadoutView['slots'][number]['groups']>();
    for (const tag of SKILL_SLOT_TAGS) {
        const groups: SkillLoadoutView['slots'][number]['groups'] = [];
        for (const role of SKILL_ROLE_ORDER) {
            const skills = engine.skillDB.filter((s) => s.tag === tag && s.role === role);
            if (skills.length === 0) continue;
            groups.push({
                label: ROLE_LABEL[role],
                options: skills.map((s) => ({
                    value: s.id,
                    label: s.team === undefined ? s.name : `${s.name}${SKILL_TEAM_SUFFIX[s.team]}`,
                })),
            });
        }
        view.set(tag, groups);
    }
    groupCaches.set(engine, { signature: dbSig, view });
    return view;
}

/** 單位四個技能槽的配置與可選技能；單位不存在回傳 null。技能庫被編輯時（UPDATE_SKILL）也會產生新快照。 */
export function selectSkillLoadoutView(engine: GameEngine, agentId: string | null | undefined): SkillLoadoutView | null {
    if (!agentId) return null;
    const agent = engine.agents.find((a) => a.id === agentId);
    if (!agent) return null;

    const db = engine.skillDB;
    const dbSig = dbSignature(db);
    const slotSkills = SKILL_SLOT_TAGS.map((_, i) => {
        const id = agent.skillIds[i] ?? null;
        return { id, skill: id ? db.find((s) => s.id === id) ?? null : null };
    });
    const signature = [agentId, dbSig, ...slotSkills.map((s) => `${s.id ?? ''}=${skillSignature(s.skill)}`)].join('|');

    const cache = cacheOf(loadoutCaches, engine);
    const prev = cache.get(agentId);
    if (prev && prev.signature === signature) return prev.view;

    const groups = groupsByTag(engine, dbSig);
    const view: SkillLoadoutView = {
        agentId,
        slots: SKILL_SLOT_TAGS.map((tag, slot) => ({
            slot,
            tag,
            skillId: slotSkills[slot].id,
            skill: slotSkills[slot].skill,
            groups: groups.get(tag) ?? [],
        })),
    };
    cache.set(agentId, { signature, view });
    return view;
}
