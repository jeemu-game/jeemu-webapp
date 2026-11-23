"""Version stamp for the site's pictures: a hash of everything in public/tonight, written to
src/components/tonight/assetVersion.js and the preloads in index.html, so browsers fetch new files after a re-render
or a new phone capture (never a stale cache).   python3 scripts/web/stamp_assets.py"""
import hashlib, os, re
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..')
DST = os.path.join(ROOT, 'public', 'tonight')

def stamp():
    h = hashlib.sha1()
    for root, dirs, files in os.walk(DST):
        dirs.sort()
        for f in sorted(files):
            h.update(f.encode()); h.update(open(os.path.join(root, f), 'rb').read())
    v = h.hexdigest()[:10]
    open(os.path.join(ROOT, 'src', 'components', 'tonight', 'assetVersion.js'), 'w').write(
        "// Written by scripts/web/stamp_assets.py: changes whenever the published pictures do.\n"
        f"export const ASSET_V = '{v}';\n")
    idx = os.path.join(ROOT, 'index.html'); html = open(idx).read()
    html = re.sub(r'(href="/tonight/(?:seq/desk/wide-close/first\.avif|seq/phone/wide-close/first\.avif))(\?v=\w+)?"', rf'\1?v={v}"', html)
    open(idx, 'w').write(html)
    return v

if __name__ == '__main__':
    print('asset version', stamp())
