import { describe, it, expect } from 'vitest';
import { createHash } from 'node:crypto';
import { AudioPRNG, clearSynthCache, createSynthBuffer } from '../engine/audio/Synth';
import type { SynthId } from '../data/audio/cues';

// 改參數前擷取：44100 Hz、固定種子 133742，完整 PCM 位元組的 SHA-256。
const GOLDEN = {
    "HIT_LIGHT": {
        "length": 3969,
        "sha256": "f2e3b0ebcf32f3664bfdd161dfd12d550761e6c3a250da124b89d7f4303365f7"
    },
    "HIT_HEAVY": {
        "length": 9702,
        "sha256": "731502b1ec94d075f65ed8c799da350e1dbe81887f7e1e28e71a418acafc4eab"
    },
    "SLASH": {
        "length": 6174,
        "sha256": "634d2a52d4e5cf311aee5a872c74245cf1e56d5cbebd1c7b2be72959da32d35e"
    },
    "BOW": {
        "length": 5292,
        "sha256": "0d5b345281b84b21f43dd4d7991b751dcaf88b103b7d375b02ad25f24d5fea69"
    },
    "FIRE": {
        "length": 13230,
        "sha256": "94ebfc051dc7bb1a885bc1cc3c3935e8df2dea4eef2d2f57007a506ef48e7242"
    },
    "ICE": {
        "length": 9702,
        "sha256": "9eddba3868c6f7bfe68e59caadac1af09fd22f91f5b9e695c8cdd541eac4c9f4"
    },
    "HEAL": {
        "length": 17640,
        "sha256": "5b717a8c1c35ea0192db1e3c2e5788108840a8410df422777e7e7cf6f86f6f93"
    },
    "DEATH": {
        "length": 19845,
        "sha256": "19811a49698e11537185e05c173454762be54ee2cad58f7f8f1229bfa75ec366"
    },
    "SPAWN": {
        "length": 11025,
        "sha256": "14803b9d91cb1f10d227f4dce8a77b0765be42a9368d0ce5b67ad6b1662cf339"
    },
    "COLLAPSE": {
        "length": 15434,
        "sha256": "a4d971905f9e4fb69d02dd688b6844e57db58c446ee05a06307009144e795d19"
    },
    "RUMBLE": {
        "length": 22050,
        "sha256": "f05be225d76a67bf7e7798cb5b87f73277dbeb7ae4c2b88e145c64aecab198fb"
    },
    "STUN": {
        "length": 11025,
        "sha256": "a63847d6f0e8cf7aa803c7c278ade54c0a4eee8d3b44957392caec39eb1aa626"
    },
    "UI_CLICK": {
        "length": 1543,
        "sha256": "500bfa357aa4e64247682516620908d0b61edaba13556f2f0cdba04fe8350f25"
    },
    "UI_HOVER": {
        "length": 1323,
        "sha256": "c7402c0018a1a0b8a621c62b59fb7f2a4f559f6a5596e5c71c8b8992cf08195e"
    },
    "UI_START": {
        "length": 15434,
        "sha256": "ddb52aed7b4cf2e41fe2ed6c9e6d5ef672a92de95330124ecfeba077b1b226a7"
    },
    "VICTORY": {
        "length": 37485,
        "sha256": "bcd19edcdb9ef7b3eabb817d07e26c0b56b535efa830a2cc190087e2c477aa1e"
    },
    "DEFEAT": {
        "length": 39690,
        "sha256": "74c362c393b9d340f7aedab6f018acec067219c213b8ec3784040e5288d3730c"
    },
    "BGM_PAD": {
        "length": 176400,
        "sha256": "eb4c2c54821ced7a6a65990d02c1f42ad42b788926263e5ff99854e799873407"
    }
} as const satisfies Record<SynthId, { length: number; sha256: string }>;

describe('Synth PCM golden', () => {
    for (const id of Object.keys(GOLDEN) as SynthId[]) {
        it(id, () => {
            clearSynthCache();
            const ctx = {
                sampleRate: 44100,
                createBuffer(channels: number, length: number, sampleRate: number) {
                    const data = new Float32Array(length);
                    return { numberOfChannels: channels, length, sampleRate, getChannelData: () => data } as unknown as AudioBuffer;
                }
            } as unknown as BaseAudioContext;
            const data = createSynthBuffer(ctx, id, new AudioPRNG(133742)).getChannelData(0);
            expect(data.length).toBe(GOLDEN[id].length);
            expect(createHash('sha256').update(new Uint8Array(data.buffer, data.byteOffset, data.byteLength)).digest('hex')).toBe(GOLDEN[id].sha256);
        });
    }
});
