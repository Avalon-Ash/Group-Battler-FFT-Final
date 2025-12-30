
import { PROCEDURAL_VISUALS } from "./procedural_visuals";
import { SKILL_SEQUENCES } from "./SkillSequences";

export interface VFXEntry {
    key: string;
    name: string;
    desc: string;
    visuals: string[];
}

export const VFX_LIBRARY = {
    CORE_SEQUENCES: [
        { key: 'DATA_DRIVEN', name: 'v9.2 Sequence Engine', desc: 'SSOT Compliant JSON visual pipeline. Maps logic IDs to tiered visual actions with precise Z-depth.', visuals: ['VisualMath', 'Delayed Emitters', 'Camera Shake'] },
        { key: 'AUTO_FLAVOR', name: 'Procedural Flavoring', desc: '150+ generated sequences with class-specific logic (Tanks use Heavy, Rangers use Beams).', visuals: ['Role Aware', 'Faction Shaders'] }
    ] as VFXEntry[],

    ACTION_VERBS: [
        { key: 'PARTICLE', name: 'Particle Action', desc: 'Trigger complex emitters from Registry. Auto-resolves ground height.', visuals: ['Emitters'] },
        { key: 'BEAM', name: 'Beam Action', desc: 'Connect source and target with procedural lasers using 3D anchors.', visuals: ['Vector Beams'] },
        { key: 'SHAKE', name: 'Shake Action', desc: 'Direct camera trauma application via CameraSystem.', visuals: ['Screen Shake'] },
        { key: 'GRID_PULSE', name: 'Grid Pulse', desc: 'Floor-plane hexagonal expansion. Uses Z_LAYERS.OVERLAY bias.', visuals: ['Floor Vector'] },
        { key: 'HEAVEN_FALL', name: 'Heaven Fall', desc: 'Sky-to-ground high altitude impact physics.', visuals: ['Vertical Physics'] }
    ] as VFXEntry[],

    GENERIC_HITS: [
        { key: 'FX_HIT_GENERIC', name: 'Standard Impact', desc: 'Universal impact for physical skills.', visuals: ['Shockwave', 'Rubble'] },
        { key: 'FX_HIT_FIRE', name: 'Thermal Burst', desc: 'Fire damage impact.', visuals: ['Sparks', 'Orange Rubble'] },
        { key: 'FX_TELEPORT', name: 'Neural Transit', desc: 'Unit spawn / warp sequence.', visuals: ['Pillar', 'Spike'] }
    ] as VFXEntry[],

    IMPERIAL_FLAVOR: [
        { key: 'FX_HIT_BLUE_TANK', name: 'Imp. Shield Impact', desc: 'Tech-order impact sounds/looks.', visuals: ['Cyan Glow'] },
        { key: 'FX_HIT_BLUE_RANGER', name: 'Imp. Sniper Hit', desc: 'High-speed kinetic impact.', visuals: ['Tech Sparks'] },
        { key: 'FX_ULT_BLUE_IMPACT', name: 'Imp. Final Strike', desc: 'Holy/Tech cinematic burst.', visuals: ['Giant Hex'] }
    ] as VFXEntry[],

    COVENANT_FLAVOR: [
        { key: 'FX_HIT_RED_TANK', name: 'Cov. Heavy Crushing', desc: 'Visceral impact visuals.', visuals: ['Blood', 'Deep Rubble'] },
        { key: 'FX_HIT_RED_MAGE', name: 'Cov. Void Rupture', desc: 'Chaos-void energy hit.', visuals: ['Shadow Mist'] },
        { key: 'FX_ULT_RED_IMPACT', name: 'Cov. Apocalypse', desc: 'Covenant ultimate burst sequence.', visuals: ['Meteor Burst'] }
    ] as VFXEntry[]
};
