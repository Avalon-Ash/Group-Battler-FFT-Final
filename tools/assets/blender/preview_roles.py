"""Validate and present actual four-direction faction role renders, offline only.

No paint-over, per-character resizing or formal atlas writes. The 0.5 source row
is a downsampled preview, not a measurement of the live game's memory or visuals.
"""
import argparse
import hashlib
import json
import shutil
import subprocess
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[3]
ROLES = {'TANK': '坦克', 'RANGER': '遊俠', 'MAGE': '法師', 'SUPPORT': '輔助'}
DIRS = ['SE', 'SW', 'NE', 'NW']


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--raw', required=True)
    parser.add_argument('--out', required=True)
    parser.add_argument('--characters', required=True)
    parser.add_argument('--base', required=True, help='Merged main revision used for formal asset integrity')
    parser.add_argument('--faction', choices=('lionheart', 'ashen'), default='lionheart')
    args = parser.parse_args()
    ashen = args.faction == 'ashen'
    team, faction = ('RED', '灰燼') if ashen else ('BLUE', '獅心')
    roles = {'TANK': '坦克', 'WARRIOR': '戰士', 'RANGER': '遊俠', 'MAGE': '法師', 'SUPPORT': '輔助'} if ashen else ROLES
    total = len(roles) * 8
    raw, out = Path(args.raw), Path(args.out)
    out.mkdir(parents=True, exist_ok=True)
    font = ImageFont.truetype('C:/Windows/Fonts/msjh.ttc', 20)
    small = ImageFont.truetype('C:/Windows/Fonts/msjh.ttc', 15)
    title = ImageFont.truetype('C:/Windows/Fonts/msjhbd.ttc', 28)
    results = {}
    overview = Image.new('RGB', (len(roles) * 280, 1200), '#e2e7eb')
    od = ImageDraw.Draw(overview)
    od.text((30, 15), '灰燼軍團 / 五職業男女站姿試作' if ashen else '獅心軍團 / 其餘四職業男女站姿試作', font=title, fill='#22394d')
    od.text((30, 58), '同骨架、同身形；僅離線小樣，尚未接入遊戲', font=small, fill='#4a5965')
    for col, role in enumerate(roles):
        od.text((col * 280 + 30, 98), roles[role], font=font, fill='#22394d')
    for role, label in roles.items():
        sheet = Image.new('RGB', (1120, 930), '#e2e7eb')
        draw = ImageDraw.Draw(sheet)
        draw.text((30, 16), f'{faction} {label} / 男女四向站姿 V01', font=title, fill='#22394d')
        subtitle = '深紅 / 暗甲 / 裂紋徽記 · 原生烘焙 · 固定角色尺度與腳點' if ashen else '沿用戰士男 V01 / 女 V02 風格 · 原生烘焙 · 固定角色尺度與腳點'
        draw.text((30, 60), subtitle, font=small, fill='#4a5965')
        for col, direction in enumerate(DIRS):
            draw.text((150 + col * 256, 96), direction, font=font, fill='#22394d')
        for row, body in enumerate(('male', 'female')):
            directory = raw / role.lower() / body
            meta = json.loads((directory / 'render-meta.json').read_text())
            audit = json.loads((directory / 'skin-integrity.json').read_text())
            assert audit['status'] == 'PASS' and audit['role'] == role and audit['body'] == body.upper()
            assert audit.get('team', 'BLUE') == team
            assert meta['baseCellPx'] == 256 and meta['paddingPx'] == 96 and meta['cellPx'] == 448
            assert meta['baseAnchor'] == {'x': 128, 'y': 184.32}
            assert meta['anchor'] == {'x': 224, 'y': 280.32}
            assert meta['outlinePx'] == 2 and meta['pxPerWorldUnit'] == round(256 / 3.6, 3)
            projection_error = max(abs(after[i] - before[i] - 96)
                                   for before, after in zip(meta['baseProjectionProbes'], meta['expandedProjectionProbes'])
                                   for i in (0, 1))
            assert projection_error < 0.0001
            frame_dir = directory / f'{team}_{role}'
            expected = {f'idle_{d}_00.png' for d in DIRS}
            assert {p.name for p in frame_dir.glob('*.png')} == expected
            draw.text((20, 135 + row * 280), '男版' if row == 0 else '女版', font=font, fill='#22394d')
            data = {'rigAudit': audit, 'projectionErrorPx': projection_error, 'frames': {}}
            export = out / 'frames' / role.lower() / body
            export.mkdir(parents=True, exist_ok=True)
            for col, direction in enumerate(DIRS):
                path = frame_dir / f'idle_{direction}_00.png'
                im = Image.open(path).convert('RGBA')
                assert im.size == (448, 448)
                bbox = im.getchannel('A').getbbox()
                assert bbox and min(bbox[0], bbox[1], 448 - bbox[2], 448 - bbox[3]) > 0
                # Uniform extra 16px above the base viewport for the raised mage hat.
                # This changes presentation margins only, never scale or relative feet.
                assert bbox[0] >= 96 and bbox[1] >= 80 and bbox[2] <= 352 and bbox[3] <= 352, 'Standing preview would clip'
                logical = im.crop((96, 80, 352, 352))
                sheet.paste(logical, (75 + col * 256, 122 + row * 280), logical)
                # Fixed scale for all units, matching the shared reference height.
                half = logical.resize((128, 136), Image.Resampling.LANCZOS)
                sample = half.resize((95, 101), Image.Resampling.LANCZOS)
                sheet.paste(sample, (390 + col * 155, 710 + row * 105), sample)
                shutil.copy2(path, export / path.name)
                data['frames'][direction] = {'sha256': sha(path), 'alphaBounds': bbox,
                    'edgeMarginPx': min(bbox[0], bbox[1], 448 - bbox[2], 448 - bbox[3])}
                if direction in ('SE', 'NE'):
                    overview_y = 120 + row * 530 + (0 if direction == 'SE' else 250)
                    overview.paste(logical, (list(roles).index(role) * 280 + 12, overview_y), logical)
            results[f'{role}:{body.upper()}'] = data
        draw.text((30, 720), '0.5 倍來源縮圖觀察', font=font, fill='#22394d')
        draw.text((30, 755), '上：男 / 下：女；統一倍率', font=small, fill='#4a5965')
        draw.text((30, 783), '供辨識度檢視，非遊戲截圖', font=small, fill='#4a5965')
        sheet.save(out / f'{role.lower()}-four-directions.png')
    overview.save(out / 'overview.png')
    tracked = subprocess.check_output(['git', 'ls-files', 'public/assets/units'], cwd=ROOT, text=True).splitlines()
    formal = {}
    for path in tracked:
        before = hashlib.sha256(subprocess.check_output(['git', 'show', f'{args.base}:{path}'], cwd=ROOT)).hexdigest()
        after = sha(ROOT / path)
        assert before == after, f'Formal asset changed: {path}'
        formal[path] = after
    source = {name: sha(Path(args.characters) / name) for name in
              ('Knight.glb', 'Rogue_Hooded.glb', 'Mage.glb', 'Barbarian.glb')}
    evidence = {'status': 'PASS', 'baseMain': args.base, 'frameCount': total,
                'formalUnchanged': formal, 'sourceGLBSha256': source, 'units': results}
    (out / 'validation.json').write_text(json.dumps(evidence, indent=2), encoding='utf-8')
    page_title = '灰燼五職業男女站姿' if ashen else '獅心四職業男女站姿'
    html = f'<!doctype html><meta charset="utf-8"><title>{page_title}</title>'
    html += '<style>body{margin:32px;background:#e2e7eb;color:#22394d;font:18px sans-serif}img{max-width:100%}section{margin:40px 0}a{color:#244d91}</style>'
    html += (f'<h1>{page_title} V01</h1><p>深紅與暗甲，男女採獨立髮色。上男下女，四向 SE／SW／NE／NW。正式圖集未修改。</p>' if ashen else '<h1>獅心四職業男女站姿 V01</h1><p>沿用已核准戰士男 V01／女 V02 風格。上男下女，四向 SE／SW／NE／NW。正式圖集未修改。</p>')
    html += '<p>僅站姿審圖，完整動畫尚未烘焙；底部縮圖模擬 0.5 倍來源，並非遊戲實測。</p>'
    for role, label in roles.items():
        html += f'<section><h2>{label}</h2><img src="{role.lower()}-four-directions.png" alt="{label}男女四向"></section>'
    html += f'<p><a href="validation.json">{total} 幀與來源完整性驗證</a> · <a href="REPORT.md">試作報告</a></p>'
    (out / 'index.html').write_text(html, encoding='utf-8')
    print(f'PASS: {total} idle frames, rig audits, projection, formal assets; previews:', out)


if __name__ == '__main__':
    main()
