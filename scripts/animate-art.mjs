import { readFile, writeFile } from 'node:fs/promises';
// Original SVG pose drawings derived from our own stage-one artwork.
const knight = await readFile('public/assets/knight.svg', 'utf8');
for (let i = 0; i < 4; i++) {
  const stride = [0, 5, 0, -5][i];
  let frame = knight.replace('M32 71L30 93 26 99 39 99 44 72M48 71L51 95 49 100 64 100 60 91 58 69', `M32 71L${30-stride} 93 ${26-stride} 99 ${39-stride} 99 44 72M48 71L${51+stride} 95 ${49+stride} 100 ${64+stride} 100 ${60+stride} 91 58 69`);
  frame = frame.replace('M30 34Q15 56 15 89L28 83 34 100 47 86 65 96 72 84Q68 53 61 37Z', `M30 34Q${15-stride} 56 ${15-stride} 89L${28-stride} 83 ${34-stride} 100 47 86 ${65-stride} 96 ${72-stride} 84Q68 53 61 37Z`);
  await writeFile(`public/assets/knight-run-${i}.svg`, frame);
}
for (let i = 0; i < 2; i++) {
  const frame = knight.replace('<path d="M73 71', `<g transform="rotate(${i === 0 ? -34 : 32} 71 68)"><path d="M73 71`).replace('</svg>', '</g></svg>');
  await writeFile(`public/assets/knight-attack-${i}.svg`, frame);
}
const crawler = await readFile('public/assets/crawler.svg', 'utf8');
for (let i = 0; i < 4; i++) {
  const d = [0, 6, 0, -6][i];
  const frame = crawler.replace('M29 39L15 30 6 43 19 40 25 54 13 67 8 81 24 72 37 60M67 37L83 28 94 42 81 38 75 53 89 68 94 80 78 73 63 60', `M29 39L${15+d} 30 ${6+d} 43 ${19+d} 40 25 54 ${13-d} 67 ${8-d} 81 ${24-d} 72 37 60M67 37L${83+d} 28 ${94+d} 42 ${81+d} 38 75 53 ${89-d} 68 ${94-d} 80 ${78-d} 73 63 60`);
  await writeFile(`public/assets/crawler-run-${i}.svg`, frame);
}
console.log('10 original animation poses generated.');
