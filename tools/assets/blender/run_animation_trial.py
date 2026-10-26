"""Bake approved faction skins sequentially into an isolated animation trial."""
import argparse
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
TRIAL = ROOT / 'tools/ui-e2e/out/faction-animation-v01'
ROLES = ['TANK', 'WARRIOR', 'RANGER', 'MAGE', 'SUPPORT']


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--blender', required=True)
    parser.add_argument('--characters', required=True)
    parser.add_argument('--team', required=True, choices=['BLUE', 'RED'])
    parser.add_argument('--roles', nargs='+', choices=ROLES, default=ROLES)
    args = parser.parse_args()
    logs = TRIAL / 'logs'
    logs.mkdir(parents=True, exist_ok=True)
    for role in args.roles:
        for body in ['MALE', 'FEMALE']:
            key = f'{args.team.lower()}-{role.lower()}-{body.lower()}'
            raw = TRIAL / 'raw' / args.team.lower() / role.lower() / body.lower()
            packed = TRIAL / 'packed' / args.team.lower() / role.lower() / body.lower()
            skin = 'ashen-roles' if args.team == 'RED' else 'lionheart-warrior' if role == 'WARRIOR' else 'lionheart-roles'
            command = [args.blender, '-b', '-t', '4', '--python-exit-code', '1', '--python',
                       str(ROOT / 'tools/assets/blender/render_unit.py'), '--', args.characters,
                       str(raw), args.team, role, '256', '--skin', skin, '--body', body,
                       '--save-blend', '--padding', '96']
            print('START', key, flush=True)
            with (logs / f'{key}.log').open('w', encoding='utf-8') as handle:
                subprocess.run(command, cwd=ROOT, stdout=handle, stderr=subprocess.STDOUT,
                               check=True, timeout=300)
            subprocess.run([sys.executable, '-B', str(ROOT / 'tools/assets/blender/pack_sprites.py'),
                            str(raw), str(packed), body, '--render-meta', str(raw / 'render-meta.json')],
                           cwd=ROOT, check=True, timeout=120)
            print('DONE', key, flush=True)


if __name__ == '__main__':
    main()
