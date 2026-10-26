"""Verify isolated full-animation trials and create an offline Canvas 2D gallery.

Raw PNGs remain authoritative. Packed WebP RGB is lossy; alpha and anchor offsets
must remain exact. Review uses one fixed scale, never character-dependent fitting.
"""
import argparse
import hashlib
import json
import shutil
import subprocess
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[3]
TRIAL = ROOT / 'tools/ui-e2e/out/faction-animation-v01'
OUT = ROOT / 'docs/art/faction-animation-v01'
ROLES = ['TANK', 'WARRIOR', 'RANGER', 'MAGE', 'SUPPORT']
DIRS = ['SE', 'SW', 'NE', 'NW']
CLIPS = {'idle': (6, 6, True), 'walk': (6, 10, True), 'attack': (6, 12, False),
         'cast': (6, 10, False), 'hit': (3, 12, False), 'death': (6, 8, False)}
BG = '#e2e7eb'


def read(path):
    return json.loads(path.read_text(encoding='utf-8-sig'))


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def approved(team, role, body):
    if team == 'BLUE' and role == 'WARRIOR':
        return ROOT / 'tools/ui-e2e/out/lionheart-warrior-trial/overscan/raw' / body.lower() / 'BLUE_WARRIOR'
    faction = 'lionheart' if team == 'BLUE' else 'ashen'
    return ROOT / f'docs/art/{faction}-roles-v01/frames' / role.lower() / body.lower()


def frames_dir(team, role, body):
    return TRIAL / 'raw' / team.lower() / role.lower() / body.lower() / f'{team}_{role}'


def paste(sheet, frame, xy, scale=1):
    if scale != 1:
        frame = frame.resize((round(frame.width*scale), round(frame.height*scale)), Image.Resampling.LANCZOS)
    sheet.paste(frame, xy, frame)


def contacts(team, role, body, clips):
    target = TRIAL / 'qa' / team.lower() / role.lower() / body.lower()
    target.mkdir(parents=True, exist_ok=True)
    font = ImageFont.truetype('C:/Windows/Fonts/arial.ttf', 18)
    for anim, (count, _, _) in clips.items():
        sheet = Image.new('RGB', (count*224, 4*248+32), BG)
        draw = ImageDraw.Draw(sheet)
        draw.text((8, 4), f'{team} {role} {body} / {anim} / fixed 0.5 scale', font=font, fill='#22394d')
        for row, direction in enumerate(DIRS):
            for n in range(count):
                draw.text((n*224+6, 32+row*248), f'{direction} {n:02}', font=font, fill='#22394d')
                with Image.open(frames_dir(team, role, body) / f'{anim}_{direction}_{n:02}.png') as frame:
                    paste(sheet, frame.convert('RGBA'), (n*224, 56+row*248), .5)
        sheet.save(target / f'{anim}.png')


def overview(team, anim):
    font = ImageFont.truetype('C:/Windows/Fonts/msjh.ttc', 18)
    faction = '獅心' if team == 'BLUE' else '灰燼'
    count, fps, _ = CLIPS[anim]
    frames = []
    for n in range(count):
        sheet = Image.new('RGB', (1120, 508), BG)
        draw = ImageDraw.Draw(sheet)
        draw.text((12, 8), f'{faction} / {anim} / SE / 上男、下女 / 固定 0.5 倍', font=font, fill='#22394d')
        for col, (role, label) in enumerate(zip(ROLES, ['騎士', '戰士', '遊俠', '法師', '輔助'])):
            draw.text((col*224+80, 35), label, font=font, fill='#22394d')
            for row, body in enumerate(['MALE', 'FEMALE']):
                with Image.open(frames_dir(team, role, body) / f'{anim}_SE_{n:02}.png') as frame:
                    paste(sheet, frame.convert('RGBA'), (col*224, 60+row*224), .5)
        frames.append(sheet)
    duration = [round(1000/fps)]*(count-1) + [1000]
    frames[0].save(OUT / f'{team.lower()}-{anim}.gif', save_all=True,
                   append_images=frames[1:], duration=duration, loop=0, disposal=2)


def gallery(manifest):
    template = (ROOT / 'tools/assets/blender/animation_trial_gallery.html').read_text(encoding='utf-8')
    (OUT / 'index.html').write_text(template.replace('__TRIAL_MANIFEST__', json.dumps(manifest)), encoding='utf-8')


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--team', choices=['BLUE', 'RED'], help='Partial audit without combined gallery')
    parser.add_argument('--base', default='1f42c87')
    args = parser.parse_args()
    OUT.mkdir(parents=True, exist_ok=True)
    (OUT / 'atlases').mkdir(exist_ok=True)
    teams = [args.team] if args.team else ['BLUE', 'RED']
    results = {}
    combined = None
    total = 0
    for team in teams:
        for role in ROLES:
            for body in ['MALE', 'FEMALE']:
                directory = frames_dir(team, role, body)
                meta = read(directory.parent / 'render-meta.json')
                audit = read(directory.parent / 'skin-integrity.json')
                packed = TRIAL / 'packed' / team.lower() / role.lower() / body.lower()
                manifest = read(packed / 'manifest.json')
                key = f'{team}:{role}:{body}'
                assert set(manifest['units']) == {key}
                assert audit['status'] == 'PASS' and audit['body'] == body and audit['role'] == role
                assert meta['cellPx'] == 448 and meta['baseCellPx'] == 256 and meta['paddingPx'] == 96
                assert meta['anchor'] == {'x': 224, 'y': 280.32}
                assert meta['baseAnchor'] == {'x': 128, 'y': 184.32}
                assert meta['pxPerWorldUnit'] == round(256/3.6, 3) and meta['outlinePx'] == 2
                assert meta['directions'] == DIRS
                for field in ['cellPx', 'baseCellPx', 'paddingPx', 'anchor', 'baseAnchor', 'pxPerWorldUnit', 'directions']:
                    assert manifest[field] == meta[field]
                error = max(abs(b[i]-a[i]-96) for a, b in zip(meta['baseProjectionProbes'], meta['expandedProjectionProbes']) for i in [0, 1])
                assert error < .0001
                clips = {name: spec for name, spec in CLIPS.items() if name != 'cast' or role in ['MAGE', 'SUPPORT']}
                expected = {f'{anim}_{d}_{n:02}.png' for anim, (count, _, _) in clips.items() for d in DIRS for n in range(count)}
                assert {p.name for p in directory.glob('*.png')} == expected
                unit = manifest['units'][key]
                assert set(unit['anims']) == set(clips)
                atlas = Image.open(packed / unit['file']).convert('RGBA')
                assert atlas.size == (unit['atlas']['w'], unit['atlas']['h'])
                margins = {}
                for anim, (count, fps, loop) in clips.items():
                    clip = unit['anims'][anim]
                    assert clip['fps'] == fps and clip['loop'] == loop and set(clip['frames']) == set(DIRS)
                    for direction in DIRS:
                        assert len(clip['frames'][direction]) == count
                        for n, rect in enumerate(clip['frames'][direction]):
                            name = f'{anim}_{direction}_{n:02}.png'
                            with Image.open(directory / name) as source:
                                im = source.convert('RGBA')
                            assert im.size == (448, 448)
                            alpha = im.getchannel('A')
                            full = alpha.getbbox()
                            assert full, f'Empty {key}/{name}'
                            margin = min(full[0], full[1], 448-full[2], 448-full[3])
                            assert margin >= 16, f'Unsafe edge {key}/{name}: {margin}'
                            margins[name] = margin
                            bounds = alpha.point(lambda a: 255 if a > 8 else 0).getbbox()
                            left, top, right, bottom = bounds
                            assert (rect['w'], rect['h']) == (right-left, bottom-top)
                            assert (rect['ox'], rect['oy']) == (round(left-224, 2), round(top-280.32, 2))
                            x, y, w, h = [rect[f] for f in ['x', 'y', 'w', 'h']]
                            assert x >= 0 and y >= 0 and x+w <= atlas.width and y+h <= atlas.height
                            assert atlas.crop((x, y, x+w, y+h)).getchannel('A').tobytes() == alpha.crop(bounds).tobytes()
                            if anim == 'idle' and n == 0:
                                with Image.open(approved(team, role, body) / name) as reference:
                                    assert reference.convert('RGBA').tobytes() == im.tobytes(), f'Standing changed {key}/{name}'
                if team == 'BLUE' and role == 'WARRIOR':
                    # Both faction warriors retain the same original Barbarian GLB.
                    reference_audit = read(ROOT / 'docs/art/ashen-roles-v01/validation.json')['units'][f'WARRIOR:{body}']['rigAudit']
                else:
                    faction = 'lionheart' if team == 'BLUE' else 'ashen'
                    reference_audit = read(ROOT / f'docs/art/{faction}-roles-v01/validation.json')['units'][f'{role}:{body}']['rigAudit']
                assert audit['sourceReference'] == reference_audit['original'], f'Original source changed {key}'
                total += len(expected)
                results[key] = {'frames': len(expected), 'minFullAlphaMarginPx': min(margins.values()),
                                'projectionErrorPx': error, 'standingPixelExact': True, 'originalRigUnchanged': True,
                                'sourceRaw': str(directory.relative_to(ROOT)), 'rigAudit': audit,
                                'frameMargins': margins, 'packedSha256': digest(packed / unit['file'])}
                if combined is None:
                    combined = {k: v for k, v in manifest.items() if k != 'units'}
                    combined['referenceHeightPx'] = 158.3
                    combined['units'] = {}
                combined['units'][key] = {**unit, 'file': 'atlases/' + unit['file']}
                shutil.copy2(packed / unit['file'], OUT / 'atlases' / unit['file'])
                contacts(team, role, body, clips)
                print('VERIFIED', key, len(expected), 'margin', min(margins.values()), flush=True)
    formal = {}
    for path in subprocess.check_output(['git', 'ls-files', 'public/assets/units'], cwd=ROOT, text=True).splitlines():
        before = hashlib.sha256(subprocess.check_output(['git', 'show', f'{args.base}:{path}'], cwd=ROOT)).hexdigest()
        assert digest(ROOT/path) == before
        formal[path] = before
    result = {'status': 'PASS', 'base': args.base, 'frameCount': total, 'unitCount': len(results),
              'referenceHeightPx': 158.3, 'formalUnchanged': formal, 'units': results,
              'limits': ['Packed RGB is lossy; only alpha is pixel exact.',
                         'Head-rigid accessories have no collision simulation; visual review is separate.',
                         'Rig audit checks original meshes/rest bones and clip names/ranges, not every keyframe.']}
    name = f'validation-{args.team.lower()}.json' if args.team else 'validation.json'
    (OUT/name).write_text(json.dumps(result, ensure_ascii=False, indent=2)+'\n', encoding='utf-8')
    if not args.team:
        assert total == 2352 and len(results) == 20
        (OUT/'manifest.json').write_text(json.dumps(combined, separators=(',', ':'))+'\n', encoding='utf-8')
        gallery(combined)
        for team in teams:
            for anim in ['attack', 'death']:
                overview(team, anim)
    print('PASS', total, 'frames', flush=True)


if __name__ == '__main__':
    main()
