/* ReadMeow studio */
(() => {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const C = window.RMCards, RB = window.RMReadme;
  const store = { get: (k) => { try { return JSON.parse(localStorage.getItem('rm:' + k)); } catch (e) { return null; } }, set: (k, v) => { try { localStorage.setItem('rm:' + k, JSON.stringify(v)); } catch (e) {} } };

  let data = null;                                   // analyse() output
  let model = {};                                    // what the cards say
  const cfg = Object.assign({ theme: 'midnight', anim: true, order: RB.DEFAULT_ORDER.slice(), off: {}, picked: [], gh: 'dark' }, store.get('cfg') || {});
  let blobs = [];

  function toast(msg) { const t = $('#toast'); t.textContent = msg; t.classList.add('on'); clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove('on'), 2200); }
  const status = (html) => { $('#status').innerHTML = html; };

  /* ---------- GitHub (cached 30 min) ---------- */
  async function gh(path, optional) {
    const key = 'c:' + path, hit = store.get(key);
    if (hit && Date.now() - hit.t < 30 * 60e3) return hit.v;
    const r = await fetch('https://api.github.com' + path, { headers: { Accept: 'application/vnd.github+json' } });
    if (r.status === 404) { if (optional) return null; throw new Error('not_found'); }
    if (r.status === 403 || r.status === 429) { if (optional) return null; throw new Error('rate'); }
    if (!r.ok) { if (optional) return null; throw new Error('http'); }
    const v = await r.json(); store.set(key, { t: Date.now(), v }); return v;
  }
  async function load(login) {
    status('Loading <b>@' + C.esc(login) + '</b>…');
    try {
      const user = await gh('/users/' + encodeURIComponent(login));
      let repos = [];
      for (let p = 1; p <= 3; p++) { const b = await gh(`/users/${encodeURIComponent(login)}/repos?per_page=100&sort=pushed&page=${p}`); repos = repos.concat(b); if (b.length < 100) break; }
      const top = repos.filter((r) => !r.fork && !r.archived).sort((a, b) => b.stargazers_count - a.stargazers_count).slice(0, 10);
      const langBytes = {};
      (await Promise.all(top.map((r) => gh(`/repos/${user.login}/${encodeURIComponent(r.name)}/languages`, true)))).forEach((l) => { if (l) for (const [k, v] of Object.entries(l)) langBytes[k] = (langBytes[k] || 0) + v; });
      start(user, repos, langBytes);
      status(`Loaded <b>@${C.esc(user.login)}</b> ✓ · ${repos.length} repos`);
    } catch (e) {
      status(e.message === 'not_found' ? `No GitHub user called <b>${C.esc(login)}</b>. Check the spelling.` : e.message === 'rate' ? 'GitHub\'s free limit (60 requests an hour) is used up. Try again later, or <button type="button" class="link" id="demo2">use the demo</button>.' : 'Could not reach GitHub. Check your connection.');
      const d2 = $('#demo2'); if (d2) d2.onclick = () => start(RMDemo.user, RMDemo.repos, RMDemo.langBytes, true);
    }
  }

  /* ---------- model from GitHub data (fields stay editable) ---------- */
  function start(user, repos, langBytes, demo) {
    data = C.analyse(user, repos, langBytes);
    const saved = (store.get('model') || {})[user.login] || {};
    const topics = {}; repos.forEach((r) => (r.topics || []).forEach((t) => (topics[t] = (topics[t] || 0) + 1)));
    const nice = (s) => s.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
    model = Object.assign({
      login: user.login, name: user.name || user.login, role: demo ? 'Robotics + Backend Engineer' : 'Software Developer',
      tagline: user.bio || 'I build things on GitHub and share them in the open.', location: user.location || '',
      focus: Object.entries(topics).sort((a, b) => b[1] - a[1]).slice(0, 4).map(([t]) => nice(t)),
      now: demo ? 'Building a lidar SLAM rover on an ESP32' : '', learning: demo ? 'Rust and distributed systems' : '', askMe: '', funFact: demo ? 'I named my rover after my cat' : '',
      skills: data.langs.slice(0, 8).map((l) => l.name), links: { website: user.blog || '', x: user.twitter_username || '' }, footer: 'Thanks for stopping by ✨',
    }, saved);
    if (!cfg.pickedFor || cfg.pickedFor !== user.login) { cfg.picked = []; cfg.pickedFor = user.login; }
    $('#user').value = demo ? '' : user.login; $('#url').textContent = 'github.com/' + user.login; $('#repoName').textContent = user.login;
    fillForm(); drawRepos(); render();
  }

  /* ---------- form ---------- */
  function fillForm() {
    $$('[data-m]').forEach((i) => (i.value = model[i.dataset.m] || ''));
    $$('[data-list]').forEach((i) => (i.value = (model[i.dataset.list] || []).join(', ')));
    $$('[data-link]').forEach((i) => (i.value = (model.links || {})[i.dataset.link] || ''));
  }
  function readForm() {
    $$('[data-m]').forEach((i) => (model[i.dataset.m] = i.value.trim()));
    $$('[data-list]').forEach((i) => (model[i.dataset.list] = i.value.split(',').map((s) => s.trim()).filter(Boolean).slice(0, i.dataset.list === 'focus' ? 5 : 30)));
    model.links = model.links || {}; $$('[data-link]').forEach((i) => (model.links[i.dataset.link] = i.value.trim()));
    const all = store.get('model') || {}; all[model.login] = model; store.set('model', all);
  }
  let deb; $$('.pane [data-m], .pane [data-list], .pane [data-link]').forEach((i) => i.addEventListener('input', () => { clearTimeout(deb); deb = setTimeout(() => { readForm(); render(); }, 250); }));

  /* ---------- preview ---------- */
  function build() { return RB.build(model, data, Object.assign({}, cfg, { updated: new Date().toISOString().slice(0, 10) })); }
  function render() {
    store.set('cfg', cfg);
    if (!data) return;
    const out = build();
    blobs.forEach((u) => URL.revokeObjectURL(u)); blobs = [];
    const url = {}; for (const [f, s] of Object.entries(out.files)) { const u = URL.createObjectURL(new Blob([s], { type: 'image/svg+xml' })); blobs.push(u); url[f] = u; }
    const html = out.readme.replace(/<!--[\s\S]*?-->/g, '').replace(/src="\.\/assets\/readmeow\/([^"]+)"/g, (m, f) => `src="${url[f] || ''}"`).replace(/<a /g, '<a target="_blank" rel="noopener" ');
    $('#preview').innerHTML = html;
  }

  /* ---------- look ---------- */
  $('#themes').innerHTML = Object.entries(C.THEMES).map(([id, t]) => `<button type="button" class="theme" data-theme="${id}"><div class="sw" style="background:linear-gradient(135deg,${t.bg1},${t.bg0});border:1px solid ${t.line}"><i style="background:${t.acc}"></i><i style="background:${t.acc2}"></i><i style="background:${t.acc3}"></i></div><b>${t.name}</b></button>`).join('');
  const syncLook = () => { $$('.theme').forEach((b) => b.classList.toggle('on', b.dataset.theme === cfg.theme)); $('#anim').checked = cfg.anim; $$('[data-gh]').forEach((b) => b.classList.toggle('on', b.dataset.gh === cfg.gh)); $('#frame').classList.toggle('light', cfg.gh === 'light'); };
  $$('.theme').forEach((b) => b.onclick = () => { cfg.theme = b.dataset.theme; syncLook(); render(); });
  $('#anim').onchange = (e) => { cfg.anim = e.target.checked; render(); };
  $$('[data-gh]').forEach((b) => b.onclick = () => { cfg.gh = b.dataset.gh; syncLook(); store.set('cfg', cfg); });

  /* ---------- sections (drag to reorder) ---------- */
  function drawSections() {
    $('#sections').innerHTML = cfg.order.map((s) => `<li draggable="true" data-s="${s}" class="${cfg.off[s] ? 'off' : ''}"><span class="g">⋮⋮</span><input type="checkbox" ${cfg.off[s] ? '' : 'checked'}><span>${RB.SECTIONS[s]}</span></li>`).join('');
    $$('#sections input').forEach((c) => c.onchange = () => { const s = c.closest('li').dataset.s; cfg.off[s] = !c.checked; drawSections(); render(); });
  }
  let drag = null;
  $('#sections').addEventListener('dragstart', (e) => { drag = e.target.closest('li'); drag.classList.add('drag'); });
  $('#sections').addEventListener('dragend', () => { if (!drag) return; drag.classList.remove('drag'); cfg.order = $$('#sections li').map((l) => l.dataset.s); drag = null; render(); });
  $('#sections').addEventListener('dragover', (e) => { e.preventDefault(); const over = e.target.closest('li'); if (!drag || !over || over === drag) return; const r = over.getBoundingClientRect(); over.parentNode.insertBefore(drag, e.clientY > r.top + r.height / 2 ? over.nextSibling : over); });

  /* ---------- projects ---------- */
  function drawRepos() {
    if (!data) return;
    const q = $('#repoQ').value.toLowerCase();
    $('#repos').innerHTML = data.projects.filter((p) => !q || p.name.toLowerCase().includes(q)).map((p) => {
      const i = cfg.picked.indexOf(p.name);
      return `<li data-n="${C.esc(p.name)}" class="${i > -1 ? 'on' : ''}"><span class="n">${i > -1 ? i + 1 : ''}</span><div><b>${C.esc(p.name)}</b><small>${C.esc(p.description || '')} ${p.language ? '· ' + C.esc(p.language) : ''} · ★ ${p.stars}</small></div></li>`;
    }).join('');
    $('#pickHint').textContent = cfg.picked.length ? `${cfg.picked.length} of 6 picked, in this order.` : 'Tick up to 6 repos. Until you do, your top 6 by stars are shown.';
  }
  $('#repoQ').oninput = drawRepos;
  $('#repos').onclick = (e) => { const li = e.target.closest('li'); if (!li) return; const n = li.dataset.n, i = cfg.picked.indexOf(n); if (i > -1) cfg.picked.splice(i, 1); else if (cfg.picked.length < 6) cfg.picked.push(n); else return toast('Up to 6 projects'); drawRepos(); render(); };

  /* ---------- export ---------- */
  async function src(p) { const r = await fetch(p); if (!r.ok) throw new Error(p); return r.text(); }
  $('#zip').onclick = async () => {
    if (!data) return toast('Load a username first');
    readForm(); const out = build(), files = { 'README.md': out.readme };
    for (const [f, s] of Object.entries(out.files)) files['assets/readmeow/' + f] = s;
    try {
      const [cards, readme, refresh, yml] = await Promise.all([src('js/cards.js'), src('js/readme.js'), src('action/refresh.js'), src('action/readmeow.yml')]);
      Object.assign(files, { '.readmeow/cards.js': cards, '.readmeow/readme.js': readme, '.readmeow/refresh.js': refresh, '.github/workflows/readmeow.yml': yml,
        '.readmeow/config.json': JSON.stringify({ model, settings: { theme: cfg.theme, anim: cfg.anim, order: cfg.order, off: cfg.off, picked: out.picked } }, null, 2) });
    } catch (e) { toast('Auto-refresh files missing; ZIP has README and cards only'); }
    const a = document.createElement('a'); a.href = URL.createObjectURL(RMZip.zip(files)); a.download = `${model.login}-readme.zip`; a.click();
    toast('Downloaded ' + a.download);
  };
  $('#copy').onclick = async () => { if (!data) return toast('Load a username first'); try { await navigator.clipboard.writeText(build().readme); toast('README.md copied'); } catch (e) { toast('Copy blocked by the browser'); } };

  /* ---------- tabs + boot ---------- */
  $$('.tab').forEach((b) => b.onclick = () => { $$('.tab').forEach((x) => x.classList.toggle('on', x === b)); $$('.pane').forEach((p) => p.classList.toggle('on', p.dataset.pane === b.dataset.tab)); });
  $('#load').onsubmit = (e) => { e.preventDefault(); const u = $('#user').value.trim().replace(/^@/, '').replace(/^https?:\/\/github\.com\//, '').replace(/\/.*$/, ''); if (u) load(u); };
  $('#demo').onclick = () => { start(RMDemo.user, RMDemo.repos, RMDemo.langBytes, true); status('Showing the demo profile. Type your username above for yours.'); };
  syncLook(); drawSections();
  const qp = new URLSearchParams(location.search).get('user');
  if (qp === 'demo') $('#demo').click(); else if (qp) { $('#user').value = qp; load(qp); }
})();
