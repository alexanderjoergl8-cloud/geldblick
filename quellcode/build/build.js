// Baut aus src/ die fertige App in dist/. Start: node build/build.js
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..'), rd = f => fs.readFileSync(path.join(root, f), 'utf8');
const ver = /APP_VERSION = '([^']+)'/.exec(rd('src/ui.js'))[1];
const font = (pkg, file) => fs.readFileSync(path.join(root, 'node_modules/@fontsource-variable', pkg, 'files', file)).toString('base64');
const fonts = `@font-face{font-family:"Bricolage Grotesque";font-weight:200 800;font-display:swap;src:url(data:font/woff2;base64,${font('bricolage-grotesque', 'bricolage-grotesque-latin-wght-normal.woff2')}) format("woff2")}
@font-face{font-family:"Hanken Grotesk";font-weight:100 900;font-display:swap;src:url(data:font/woff2;base64,${font('hanken-grotesk', 'hanken-grotesk-latin-wght-normal.woff2')}) format("woff2")}`;
const js = [rd('src/core.js'), rd('src/ui.js'), rd('src/views.js')].join('\n').replace(/<\/script/gi, '<\\/script');
const html = `<!DOCTYPE html>
<html lang="de-AT">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="theme-color" content="#173f3a">
<meta name="description" content="Persönliche Finanz- und Spar-App: Einnahmen, Fixkosten, Ausgaben, Budgets und Sparziele auf einen Blick.">
<title>Geldblick</title>
<script>if(window.self===window.top){var l=document.createElement('link');l.rel='manifest';l.href='manifest.webmanifest';document.head.appendChild(l);var i=document.createElement('link');i.rel='icon';i.href='icon-192.png';document.head.appendChild(i);}</script>
<style>
${fonts}
${rd('src/style.css')}
</style>
</head>
<body>
<div id="app" class="app"></div>
<noscript>Diese App braucht JavaScript.</noscript>
<script>
${js}
</script>
</body>
</html>
`;
fs.mkdirSync(path.join(root, 'dist'), { recursive: true });
fs.writeFileSync(path.join(root, 'dist/index.html'), html);
fs.writeFileSync(path.join(root, 'dist/sw.js'), `/* Geldblick: macht die App ohne Internet nutzbar. Bei jeder neuen Version ändert sich der Name des Zwischenspeichers. */
const CACHE = 'geldblick-${ver}';
const FILES = ['./', 'index.html', 'manifest.webmanifest', 'icon-192.png', 'icon-512.png', 'icon-maskable-512.png'];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE && k.indexOf('geldblick-') === 0).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  const r = e.request;
  if (r.method !== 'GET' || new URL(r.url).origin !== location.origin) return;
  e.respondWith(caches.match(r, { ignoreSearch: true }).then(hit => hit || fetch(r).catch(() => caches.match('index.html'))));
});
`);
fs.writeFileSync(path.join(root, 'dist/manifest.webmanifest'), JSON.stringify({ name: 'Geldblick – Finanzen und Sparen', short_name: 'Geldblick', description: 'Persönliche Finanz- und Spar-App. Alle Daten bleiben auf dem Gerät.', lang: 'de-AT', start_url: './', scope: './', display: 'standalone', orientation: 'portrait', background_color: '#f1f4f1', theme_color: '#173f3a',
  icons: [{ src: 'icon-192.png', sizes: '192x192', type: 'image/png' }, { src: 'icon-512.png', sizes: '512x512', type: 'image/png' }, { src: 'icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }] }, null, 2));
console.log('Version ' + ver + ', index.html ' + Math.round(html.length / 1024) + ' KB');
