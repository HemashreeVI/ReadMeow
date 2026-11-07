#!/usr/bin/env node
/* ReadMeow refresh: runs daily in the user's profile repo (see readmeow.yml).
 * Re-fetches public GitHub data and redraws every card in assets/readmeow/,
 * using the settings saved in .readmeow/config.json. README.md is never touched,
 * so any edits you made to it stay. */
const fs = require('fs'), path = require('path');
const C = require('./cards.js'), RB = require('./readme.js');
const ROOT = process.cwd(), CFG = JSON.parse(fs.readFileSync(path.join(__dirname, 'config.json'), 'utf8'));
const TOKEN = process.env.GITHUB_TOKEN || '';
async function gh(p, optional) {
  const r = await fetch('https://api.github.com' + p, { headers: { Accept: 'application/vnd.github+json', 'User-Agent': 'readmeow', ...(TOKEN ? { Authorization: 'Bearer ' + TOKEN } : {}) } });
  if (!r.ok) { if (optional) return null; throw new Error(`${p}: HTTP ${r.status}`); }
  return r.json();
}
(async () => {
  const login = CFG.model.login;
  const user = await gh(`/users/${login}`);
  let repos = [];
  for (let page = 1; page <= 3; page++) { const b = await gh(`/users/${login}/repos?per_page=100&sort=pushed&page=${page}`); repos = repos.concat(b); if (b.length < 100) break; }
  const own = repos.filter((r) => !r.fork && !r.archived).sort((a, b) => b.stargazers_count - a.stargazers_count).slice(0, 10);
  const langBytes = {};
  for (const r of own) { const l = await gh(`/repos/${login}/${r.name}/languages`, true); if (l) for (const [k, v] of Object.entries(l)) langBytes[k] = (langBytes[k] || 0) + v; }
  const data = C.analyse(user, repos, langBytes);
  const updated = new Date().toISOString().slice(0, 10);
  const out = RB.build(CFG.model, data, Object.assign({}, CFG.settings, { updated }));
  const dir = path.join(ROOT, 'assets', 'readmeow'); fs.mkdirSync(dir, { recursive: true });
  let changed = 0;
  for (const [f, svg] of Object.entries(out.files)) { const p = path.join(dir, f); if (!fs.existsSync(p) || fs.readFileSync(p, 'utf8') !== svg) { fs.writeFileSync(p, svg); changed++; } }
  console.log(`ReadMeow: ${Object.keys(out.files).length} cards, ${changed} updated (${data.stats.stars} stars, ${data.stats.followers} followers).`);
})().catch((e) => { console.error('ReadMeow refresh failed:', e.message); process.exit(1); });
