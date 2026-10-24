// frontend/ is what Vercel and Docker build; the repo root is the working copy. Run `npm run sync:frontend`
// after editing src/, index.html or public/ so production ships exactly what you see in dev.
// It is an exact mirror: files deleted at the root are deleted in frontend/ too.
import { cpSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
for (const dir of ['src', 'public']) {
  rmSync(join(root, 'frontend', dir), { recursive: true, force: true });
  cpSync(join(root, dir), join(root, 'frontend', dir), { recursive: true });
}
cpSync(join(root, 'index.html'), join(root, 'frontend/index.html'));
console.log('mirrored src/, public/ and index.html -> frontend/');
