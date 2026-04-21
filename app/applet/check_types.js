const types = ['SHOCKWAVE', 'SPARK', 'RING', 'PILLAR', 'SMOKE', 'SHARD', 'HEX_GLOW', 'MAGIC_CIRCLE', 'GIANT_HEX', 'BLAST', 'CRACKS', 'RUBBLE', 'DOMAIN', 'GRID_FIELD', 'SLASH', 'BEAM', 'BLACK_HOLE', 'SMOKE_PUFF', 'DUST', 'SPIKE', 'GLOW', 'CHIP', 'ATMOSPHERE', 'CHAOS_RIFT'];
const procedural = ['PILLAR', 'BEAM', 'HEX_BEAM', 'GRID_FIELD', 'DOMAIN', 'MAGIC_CIRCLE', 'DEATH_RAY', 'SHOCKWAVE', 'RING', 'BLAST', 'HEX_GLOW', 'BLACK_HOLE'];
const factoryRename = ['DUST', 'PEBBLE', 'CHIP', 'RUBBLE', 'DEBRIS', 'SHARD', 'CLOUD', 'SMOKE_PUFF', 'MUSHROOM', 'GLOW', 'FLARE', 'CORE', 'ATMOSPHERE'];
const factorySwitch = ['SMOKE', 'GLOW_SPRITE', 'SPIKE', 'SPARK', 'ROCK', 'HEX_LOCK', 'SHADOW_BLOB', 'CRACKS', 'SLASH', 'HEX_GRID', 'CHAOS_RIFT', 'BEAM'];

types.forEach(t => {
    if(!procedural.includes(t) && !factoryRename.includes(t) && !factorySwitch.includes(t)) {
        console.log('MISSING:', t);
    }
});
