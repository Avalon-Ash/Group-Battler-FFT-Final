const types = ['SHOCKWAVE', 'SPARK', 'RING', 'PILLAR', 'SMOKE', 'SHARD', 'HEX_GLOW', 'MAGIC_CIRCLE', 'GIANT_HEX', 'BLAST', 'CRACKS', 'RUBBLE', 'DOMAIN', 'GRID_FIELD', 'SLASH', 'BEAM', 'BLACK_HOLE', 'SMOKE_PUFF', 'DUST', 'SPIKE', 'GLOW', 'CHIP', 'ATMOSPHERE', 'CHAOS_RIFT'];
const vf_procedural = ['PILLAR', 'BEAM', 'HEX_BEAM', 'GRID_FIELD', 'DOMAIN', 'MAGIC_CIRCLE', 'DEATH_RAY', 'SHOCKWAVE', 'RING', 'BLAST', 'HEX_GLOW', 'BLACK_HOLE'];
const pr_procedural = ['PILLAR', 'HEX_BEAM', 'GIANT_HEX', 'DOMAIN', 'DEATH_RAY', 'BEAM', 'MAGIC_CIRCLE', 'BLACK_HOLE'];
const pr_ground = ['SHOCKWAVE', 'RING', 'BLAST', 'CRACKS', 'GRID_FIELD', 'HEX_GLOW'];
const switch_types = ['SMOKE', 'GLOW_SPRITE', 'SPIKE', 'SPARK', 'ROCK', 'HEX_LOCK', 'SHADOW_BLOB', 'CRACKS', 'SLASH', 'HEX_GRID', 'CHAOS_RIFT', 'BEAM'];

for (const t of types) {
    let rendered_by = '';
    if (pr_procedural.includes(t)) rendered_by = 'ProceduralPainter';
    else if (pr_ground.includes(t)) rendered_by = 'GroundPainter';
    else rendered_by = 'BillboardPainter';

    let loads_image = !vf_procedural.includes(t);
    if (loads_image && rendered_by === 'BillboardPainter') {
        let final_type = t;
        if (['DUST', 'PEBBLE', 'CHIP', 'RUBBLE', 'DEBRIS', 'SHARD'].includes(final_type)) final_type = 'ROCK';
        if (['CLOUD', 'SMOKE_PUFF', 'MUSHROOM'].includes(final_type)) final_type = 'SMOKE';
        if (['GLOW', 'FLARE', 'CORE', 'ATMOSPHERE'].includes(final_type)) final_type = 'GLOW_SPRITE';

        if (!switch_types.includes(final_type)) {
            console.log('MISSING TEXTURE AND RENDERED AS BILLBOARD:', t);
        }
    }
}
