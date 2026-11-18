"""
Everything the site's scroll story needs, rendered on a GPU PC, packed for the web, ready to push.

  python scripts/blender/room/render_all.py --blender "C:\\Program Files\\Blender Foundation\\Blender 5.3\\blender.exe"
  python scripts/blender/room/render_all.py --blender ... --pack          (after rendering: make the web frames)

Resumable: stop it any time (Ctrl+C) and run the same command again; finished frames are skipped.
Options: --samples N (default 96; the phone frames use 2/3 of it), --only NAME [NAME ...] (just those jobs), --list,
         --quick (tiny test frames into renders_quick/, to check everything runs before the long night)
Renders go to scripts/blender/room/renders/ (several GB; not committed). --pack writes public/tonight/seq/ and the
overhead stills, which are what you commit and push.
"""
import argparse, os, subprocess, sys, time

HERE = os.path.dirname(os.path.abspath(__file__))
BLOCKS = 'Block11,Block51,Block39,Block43,Block52,Block42,Block09'   # the FAQ questions are burnt into these
EVE = ['--bake-ui', '--no-flames', '--fire', '0.8']                  # the evening: people playing, how-it-plays prints
LATE = ['--bake-ui', '--no-flames', '--late', '--chapters', '--faq-blocks', BLOCKS]   # the end of the night: our story prints
FALLEN = LATE + ['--fallen', os.path.join(HERE, 'fallen.json')]
DESK = ['--width', '1920', '--height', '1080']
PHONE = ['--width', '810', '--height', '1440', '--portrait']

# name (folder in renders/), move or 'fall', scene flags, Jeemu's screen, device
JOBS = []
def job(name, move, scene, screen, device): JOBS.append((name, move, scene, screen, device))
for dev in ('desk', 'phone'):
    job(f'{dev}/wide-close', 'wide-close', EVE, 'wide>intro', dev)
    job(f'{dev}/close-play', 'close-play', EVE, 'intro>question', dev)
    job(f'{dev}/fall', 'fall', LATE, 'late', dev)
    job(f'{dev}/fallen-end', 'fallen-end', FALLEN, 'late>waitlist', dev)
    for k in range(6): job(f'{dev}/faq{k}-faq{k + 1}', f'faq{k}-faq{k + 1}', FALLEN, 'waitlist', dev)
# desktop: the camera rises to the overhead table, the site pans over the big still, then the camera comes down again
job('desk/play-top', 'play-top', EVE, 'question', 'desk')
job('desk/top-late', 'top-late', LATE, 'late', 'desk')
job('desk/end-top2', 'end-top2', FALLEN, 'waitlist', 'desk')
job('desk/top2-faq0', 'top2-faq0', FALLEN, 'waitlist', 'desk')
# phones: the camera glides from print to print instead
job('phone/play-print0', 'p-play-print0', EVE, 'question', 'phone')
for i in range(5): job(f'phone/hprint{i}-{i + 1}', f'p-print{i}-print{i + 1}', EVE, 'question', 'phone')
job('phone/hprints-out', 'p-prints-out', EVE, 'question', 'phone')
job('phone/top-late', 'p-top-late', LATE, 'late', 'phone')
job('phone/end-print0', 'p-end-print0', FALLEN, 'waitlist', 'phone')
for i in range(5): job(f'phone/cprint{i}-{i + 1}', f'p-print{i}-print{i + 1}', FALLEN, 'waitlist', 'phone')
job('phone/team-faq0', 'p-team-faq0', FALLEN, 'waitlist', 'phone')

# the overhead stills the desktop site pans across (with sharp close-ups of the prints)
STILLS = [
    ('top', EVE + ['--view', 'top', '--width', '4800', '--height', '1524', '--insets', 'Polaroid0,Polaroid1,Polaroid2,Polaroid3,Polaroid4,Polaroid5']),
    ('top2', FALLEN + ['--view', 'top2', '--fire', '0.25', '--width', '4800', '--height', '2520', '--insets', 'Polaroid0,Polaroid1,Polaroid2,Polaroid3,Polaroid4,Polaroid5']),
]


def run(cmd):
    print('>', ' '.join(cmd[:6]), '...', flush=True)
    r = subprocess.run(cmd)
    if r.returncode not in (0,): print('  (exit', r.returncode, ')')


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--blender', default='blender'); ap.add_argument('--samples', type=int, default=96)
    ap.add_argument('--only', nargs='*'); ap.add_argument('--list', action='store_true'); ap.add_argument('--pack', action='store_true')
    ap.add_argument('--quick', action='store_true')
    ap.add_argument('--base', default='black', choices=['black', 'wood'], help="Jeemu's base: black (default) or wood")
    ap.add_argument('--bpy', action='store_true', help='use the pip bpy module (python build_room.py) instead of a Blender app')
    a = ap.parse_args()
    root = os.path.join(HERE, 'renders_quick' if a.quick else 'renders')
    if a.list:
        for j in JOBS: print(j[0])
        for s in STILLS: print('still/' + s[0])
        return
    if a.pack:
        run([sys.executable, os.path.join(HERE, 'pack_moves.py'), root] + (['--only'] + a.only if a.only else []))
        if not a.quick:
            run([sys.executable, os.path.join(HERE, 'prepare_site_assets.py'), os.path.join(root, 'stills')])
        return
    B = [sys.executable, os.path.join(HERE, 'build_room.py')] if a.bpy else [a.blender, '-b', '-P', os.path.join(HERE, 'build_room.py'), '--']
    if not a.bpy: B.append('--gpu')
    B += ['--base', a.base]   # the graphics card renders (OptiX/CUDA on NVIDIA)
    t0 = time.time()
    for name, move, scene, screen, dev in JOBS:
        if a.only and name not in a.only and name.split('/')[-1] not in a.only: continue
        out = os.path.join(root, name)
        size = (['--width', '320', '--height', '180'] if dev == 'desk' else ['--width', '180', '--height', '320', '--portrait']) if a.quick else (DESK if dev == 'desk' else PHONE)
        s = 8 if a.quick else (a.samples if dev == 'desk' else max(16, a.samples * 2 // 3))
        common = scene + ['--screen', screen] + size
        if move == 'fall':   # the tower falls in slow motion: 4 pictures per simulation frame
            fall = ['--view', 'play', '--fall', out, '--fall-frames', '48', '--fall-range', '6', '42', '--fall-sub', '4']
            run(B + common + fall + ['--samples', str(s)])
            run(B + common + fall + ['--fire-mask'])
        else:
            run(B + common + ['--move', move, '--out', out, '--samples', str(s)])
            run(B + common + ['--move', move, '--out', out, '--fire-mask'])
        print(f'  done {name}  ({(time.time() - t0) / 60:.0f} min so far)', flush=True)
    if not a.quick:
        os.makedirs(os.path.join(root, 'stills'), exist_ok=True)
        for name, flags in STILLS:
            if a.only and name not in a.only: continue
            png = os.path.join(root, 'stills', name + '.png')
            if not os.path.exists(png):
                run(B + flags + ['--samples', str(a.samples + 32), '--out', png, '--meta', os.path.join(root, 'stills', name + '.json')])
    print(f'all rendered in {(time.time() - t0) / 60:.0f} min. Next: the same command with --pack')


if __name__ == '__main__':
    main()
