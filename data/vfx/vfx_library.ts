
export interface VFXEntry {
    key: string;
    name: string;
    desc: string;
    visuals: string[];
}

export const VFX_LIBRARY = {
    GENERIC: [
        { key: 'FX_HIT_GENERIC', name: 'Standard Impact', desc: 'Default hit effect', visuals: ['Shockwave', 'Rubble', 'Flash'] },
        { key: 'FX_HIT_FIRE', name: 'Fire Impact', desc: 'Fire damage effect', visuals: ['Sparks', 'Orange Rubble', 'Flash'] },
        { key: 'FX_TELEPORT', name: 'Teleport', desc: 'Unit spawn/move', visuals: ['Vertical Beam', 'Spike'] },
        { key: 'FX_CAST_BREAK', name: 'Cast Break', desc: 'Interruption', visuals: ['Shards', 'Flash'] },
        { key: 'FX_GRID_IMPACT_BLUE', name: 'Grid Impact (Blue)', desc: 'Tech floor ripple', visuals: ['Hex Grid'] },
        { key: 'FX_GRID_IMPACT_RED', name: 'Grid Impact (Red)', desc: 'Corrupt floor ripple', visuals: ['Hex Grid'] }
    ] as VFXEntry[],
    
    FACTION_HITS: [
        { key: 'FX_HIT_BLUE_PHYSICAL', name: 'Imp. Physical', desc: 'Metal/Sparks', visuals: ['Blue Shards'] },
        { key: 'FX_HIT_BLUE_TECH', name: 'Imp. Tech', desc: 'Electric discharge', visuals: ['Lightning'] },
        { key: 'FX_HIT_BLUE_ICE', name: 'Imp. Ice', desc: 'Shattered Glass', visuals: ['Ice Shards'] },
        { key: 'FX_HIT_BLUE_HOLY', name: 'Imp. Holy', desc: 'Divine Flash', visuals: ['Gold Sparks'] },
        { key: 'FX_HIT_BLUE_ARCANE', name: 'Imp. Arcane', desc: 'Magic Dust', visuals: ['Purple Rubble'] },
        { key: 'FX_HIT_RED_PHYSICAL', name: 'Cov. Physical', desc: 'Heavy Iron', visuals: ['Dark Shards'] },
        { key: 'FX_HIT_RED_BLOOD', name: 'Cov. Blood', desc: 'Visceral Splatter', visuals: ['Blood', 'Mist'] },
        { key: 'FX_HIT_RED_HEAVY', name: 'Cov. Heavy', desc: 'Ground Smash', visuals: ['Rocks'] },
        { key: 'FX_HIT_RED_FEL', name: 'Cov. Fel', desc: 'Fel Fire/Poison', visuals: ['Green Flame'] },
        { key: 'FX_HIT_RED_SHADOW', name: 'Cov. Shadow', desc: 'Void Implosion', visuals: ['Dark Energy'] },
        { key: 'FX_HIT_RED_MAGMA', name: 'Cov. Magma', desc: 'Lava Burst', visuals: ['Magma Rocks'] }
    ] as VFXEntry[],

    ULT_BLUE: [
        { key: 'FX_ULT_BLUE_SANCTUARY_IMPACT', name: 'Sanctuary', desc: 'Tank | Holy Smash', visuals: ['Gold Pillars', 'Light'] },
        { key: 'FX_ULT_BLUE_THUNDER_SLAM', name: 'Thunder Slam', desc: 'Warrior | Lightning', visuals: ['Blue Spikes', 'Sparks'] },
        { key: 'FX_ULT_BLUE_GLACIAL_BURST', name: 'Glacial Burst', desc: 'Ranger/Mage | Ice', visuals: ['Ice Shards', 'Blue Rubble'] },
        { key: 'FX_ULT_BLUE_ORBITAL_BEAM', name: 'Orbital Beam', desc: 'Ranger | Laser', visuals: ['Cyan Beam', 'Shockwave'] },
        { key: 'FX_ULT_BLUE_RESURRECTION', name: 'Resurrection', desc: 'Support | Revive', visuals: ['Green Beam', 'Spirits'] }
    ] as VFXEntry[],

    ULT_RED: [
        { key: 'FX_ULT_RED_GUILLOTINE_IMPACT', name: 'Guillotine', desc: 'Tank | Execute', visuals: ['Red Blade', 'Blood'] },
        { key: 'FX_ULT_RED_RAGNAROK_ERUPTION', name: 'Ragnarok', desc: 'Warrior | Magma', visuals: ['Lava Cracks', 'Explosion'] },
        { key: 'FX_ULT_RED_NUKE_FLASH', name: 'Nuke Flash', desc: 'Ranger | Explosion', visuals: ['Whiteout', 'Shockwave'] },
        { key: 'FX_ULT_RED_METEOR_IMPACT', name: 'Meteor', desc: 'Mage | Impact', visuals: ['Fireball', 'Crater'] },
        { key: 'FX_ULT_RED_SOUL_WEB', name: 'Soul Web', desc: 'Support | Link', visuals: ['Purple Chains'] }
    ] as VFXEntry[],

    STATUS: [
        { key: 'STUN', name: 'Stun', desc: 'Crowd Control', visuals: ['Halo', 'Stars'] },
        { key: 'SILENCE', name: 'Silence', desc: 'Crowd Control', visuals: ['Lock Icon'] },
        { key: 'BANISH', name: 'Banish', desc: 'Stasis', visuals: ['Crystal Cage'] },
        { key: 'POISON', name: 'Poison', desc: 'DoT', visuals: ['Green Bubbles'] },
        { key: 'BURN', name: 'Burn', desc: 'DoT', visuals: ['Fire Particles'] },
        { key: 'REGEN', name: 'Regen', desc: 'HoT', visuals: ['Green Crosses'] }
    ] as VFXEntry[],

    PROJECTILES: [
        { key: 'ARROW', name: 'Arrow', desc: 'Physical', visuals: ['Arc', 'Trail'] },
        { key: 'BOLT', name: 'Bolt', desc: 'Energy', visuals: ['Linear'] },
        { key: 'FIREBALL', name: 'Fireball', desc: 'Magic', visuals: ['Wobble', 'Spin'] },
        { key: 'BOMB', name: 'Bomb', desc: 'Explosive', visuals: ['Arc', 'Spin'] }
    ] as VFXEntry[],

    IMP_PROJ: [
        { key: 'PROJ_BLUE_SNIPER', name: 'Sniper Shot', desc: 'Hex Dart', visuals: ['High Speed', 'Linear'] },
        { key: 'PROJ_BLUE_ICE_ARROW', name: 'Ice Arrow', desc: 'Crystal', visuals: ['Arc', 'Spin'] },
        { key: 'PROJ_BLUE_ORB', name: 'Arcane Orb', desc: 'Magic Sphere', visuals: ['Wobble', 'Trail'] },
        { key: 'PROJ_BLUE_FROST_BOLT', name: 'Frost Bolt', desc: 'Ice Shard', visuals: ['Linear'] }
    ] as VFXEntry[],

    COV_PROJ: [
        { key: 'PROJ_RED_HEAVY_BOLT', name: 'Heavy Bolt', desc: 'Siege Ammo', visuals: ['Slow', 'Linear'] },
        { key: 'PROJ_RED_CHAOS_ORB', name: 'Chaos Orb', desc: 'Fel Magic', visuals: ['Wobble', 'Spin'] },
        { key: 'PROJ_RED_AXE', name: 'Throwing Axe', desc: 'Physical', visuals: ['Arc', 'Spin'] },
        { key: 'PROJ_RED_SHADOW', name: 'Shadow Bolt', desc: 'Void', visuals: ['Wobble', 'Dark Trail'] }
    ] as VFXEntry[],

    CAST_RINGS: [
        { key: 'BASIC', name: 'Basic Cast', desc: 'Weak', visuals: ['Simple Ring'] },
        { key: 'ACTIVE', name: 'Active Cast', desc: 'Standard', visuals: ['Runes', 'Spin'] },
        { key: 'ULT', name: 'Ult Cast', desc: 'Strong', visuals: ['Complex', 'Fast Spin'] }
    ] as VFXEntry[]
};
