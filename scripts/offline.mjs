import { readFile, writeFile, readdir, mkdir } from 'node:fs/promises';
// Produce a genuinely standalone file: scripts, styles and original art embedded.
const root = 'dist-offline';
let html = await readFile(`${root}/index.html`, 'utf8');
const art = {};
for (const name of await readdir('public/assets')) art[name] = `data:image/svg+xml;base64,${(await readFile(`public/assets/${name}`)).toString('base64')}`;
const embedArt = text => text.replace(/(?:\.\.\/|\.\/|\/)assets\/([\w-]+\.svg)/g, (match, name) => art[name] || match);
for (const tag of html.matchAll(/<script\b[^>]*src="([^"]+)"[^>]*><\/script>/g)) {
  let js = await readFile(`${root}/${tag[1]}`, 'utf8'); js = embedArt(js).replace(/<\/script/gi, '<\\/script');
  html = html.replace(tag[0], () => `<script type="module">${js}</script>`);
}
for (const tag of html.matchAll(/<link\b[^>]*href="([^"]+\.css)"[^>]*>/g)) {
  const css = embedArt(await readFile(`${root}/${tag[1]}`, 'utf8')); html = html.replace(tag[0], () => `<style>${css}</style>`);
}
html = embedArt(html);
const license = await readFile('THIRD_PARTY_NOTICES.txt', 'utf8');
html = html.replace('</head>', () => `<!-- Third-party notices\n${license.replace(/--/g, '—')}\n--></head>`);
await mkdir('release', { recursive: true });
await writeFile('release/星渊遗迹-离线版.html', html);
console.log(`Standalone offline game: ${(Buffer.byteLength(html) / 1024 / 1024).toFixed(2)} MiB`);
