import { readFile, writeFile, mkdir, copyFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';
const require = createRequire(import.meta.url);
await mkdir('licenses', { recursive: true });
const phaserRequire = createRequire(require.resolve('phaser'));
const eventDir = path.dirname(phaserRequire.resolve('eventemitter3'));
const items = [
  ['Phaser-3.90.0', 'node_modules/phaser/LICENSE.md', true],
  ['Vite-7.1.12', 'node_modules/vite/LICENSE.md', true],
  ['EventEmitter3', path.join(eventDir, 'LICENSE'), true],
  ['Matter-js', 'node_modules/phaser/src/physics/matter-js/lib/license.js', true],
  ['TypeScript-5.9.3', 'node_modules/typescript/LICENSE.txt', false],
  ['Playwright-1.56.1', 'node_modules/@playwright/test/LICENSE', false],
  ['tsx-4.20.6', 'node_modules/tsx/LICENSE', false],
];
let notices = 'Starfall Ruins — Third-party runtime notices\n\n';
for (const [name, file, runtime] of items) {
  const license = await readFile(file, 'utf8'); await writeFile(`licenses/${name}.txt`, license);
  if (runtime) notices += `${name}\n${'='.repeat(60)}\n${license}\n\n`;
}
const earcutSource = await readFile('node_modules/phaser/src/geom/polygon/Earcut.js', 'utf8');
const earcut = earcutSource.match(/\/\*\s*\n \* ISC License[\s\S]*?\*\//)?.[0];
if (!earcut) throw new Error('Earcut license not found');
await writeFile('licenses/Earcut.txt', earcut); notices += `Earcut\n${earcut}\n`;
await writeFile('THIRD_PARTY_NOTICES.txt', notices);
for (const dir of ['dist', 'dist-offline']) {
  await mkdir(dir, { recursive: true });
  await copyFile('THIRD_PARTY_NOTICES.txt', `${dir}/THIRD_PARTY_NOTICES.txt`);
  await copyFile('LICENSE', `${dir}/LICENSE.txt`);
}
console.log('License notices collected from installed packages.');
