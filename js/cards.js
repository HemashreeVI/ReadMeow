/* ReadMeow card engine.
 * Pure functions that turn profile data into self-contained, animated SVG cards.
 * No DOM, no network: the same file runs in the browser studio and in the
 * GitHub Action that refreshes the cards (Node).
 */
(function (root) {
  'use strict';

  const THEMES = {
    midnight: { name: 'Midnight', bg0: '#0b1020', bg1: '#141a33', line: '#283158', text: '#e8ecff', muted: '#8f9bc4', acc: '#8b9cff', acc2: '#7fe0e8', acc3: '#f0a8d0', dark: true },
    paper: { name: 'Paper', bg0: '#fbf8f1', bg1: '#ffffff', line: '#e5ddcc', text: '#1f2328', muted: '#6b6457', acc: '#e4572e', acc2: '#2f6fed', acc3: '#17a398', dark: false },
    neon: { name: 'Neon', bg0: '#07070d', bg1: '#11111c', line: '#2a2a40', text: '#f2f2ff', muted: '#8a8aa8', acc: '#39ff88', acc2: '#ff3ec8', acc3: '#00e5ff', dark: true },
    forest: { name: 'Forest', bg0: '#0d1a14', bg1: '#13261d', line: '#24453a', text: '#e6f4ec', muted: '#8fb3a1', acc: '#5ee6a0', acc2: '#f4d35e', acc3: '#9ad1ff', dark: true },
    sunset: { name: 'Sunset', bg0: '#1d0f1f', bg1: '#2a1530', line: '#4a2a4f', text: '#fff1ea', muted: '#c9a7b8', acc: '#ff8a5b', acc2: '#ffd166', acc3: '#ef476f', dark: true },
    ocean: { name: 'Ocean', bg0: '#f2f8fc', bg1: '#ffffff', line: '#d3e3ef', text: '#0f2233', muted: '#5b7387', acc: '#0077b6', acc2: '#00b4a6', acc3: '#ff7a59', dark: false },
  };

  // GitHub linguist colours for common languages (fallback: theme accent)
  const LANG = {
    JavaScript: '#f1e05a', TypeScript: '#3178c6', Python: '#3572A5', Java: '#b07219', 'C++': '#f34b7d', C: '#555555', 'C#': '#178600',
    Go: '#00ADD8', Rust: '#dea584', Ruby: '#701516', PHP: '#4F5D95', Swift: '#F05138', Kotlin: '#A97BFF', Dart: '#00B4AB',
    HTML: '#e34c26', CSS: '#563d7c', SCSS: '#c6538c', Shell: '#89e051', 'Jupyter Notebook': '#DA5B0B', Vue: '#41b883', Svelte: '#ff3e00',
    Lua: '#000080', R: '#198CE7', Scala: '#c22d40', Elixir: '#6e4a7e', Haskell: '#5e5086', MATLAB: '#e16737', Dockerfile: '#384d54',
    PowerShell: '#012456', Solidity: '#AA6746', Zig: '#ec915c', Arduino: '#bd79d1', 'Objective-C': '#438eff', Perl: '#0298c3',
  };

  const SANS = "-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif";
  const MONO = "ui-monospace,SFMono-Regular,Menlo,Consolas,'Liberation Mono',monospace";

  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const width = (s, size, mono) => String(s).length * size * (mono ? 0.6 : 0.54);
  function wrap(s, size, maxW, maxLines, mono) {
    const words = String(s || '').split(/\s+/).filter(Boolean), lines = [];
    let cur = '';
    for (const w of words) {
      const next = cur ? cur + ' ' + w : w;
      if (width(next, size, mono) > maxW && cur) { lines.push(cur); cur = w; } else cur = next;
    }
    if (cur) lines.push(cur);
    if (lines.length > maxLines) { lines.length = maxLines; lines[maxLines - 1] = lines[maxLines - 1].replace(/\s*\S*$/, '') + '…'; }
    return lines;
  }
  const fmt = (n) => n >= 1e6 ? (n / 1e6).toFixed(1).replace(/\.0$/, '') + 'M' : n >= 1e3 ? (n / 1e3).toFixed(1).replace(/\.0$/, '') + 'k' : String(n);

  /* shared frame: rounded panel, soft glows, reduced-motion support */
  function svg(w, h, t, title, desc, body, anim) {
    body = body.replace(/class="([^"]*)"([^<>]*?) class="([^"]*)"/g, 'class="$1 $3"$2');
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img" aria-labelledby="t d">
<title id="t">${esc(title)}</title><desc id="d">${esc(desc)}</desc>
<style>
  .s{font-family:${SANS}} .m{font-family:${MONO}}
  ${anim ? `.fade{opacity:0;animation:fade .7s ease forwards} @keyframes fade{to{opacity:1}}
  .rise{opacity:0;transform:translateY(14px);animation:rise .7s cubic-bezier(.2,.7,.2,1) forwards} @keyframes rise{to{opacity:1;transform:none}}
  .float{animation:float 7s ease-in-out infinite} @keyframes float{50%{transform:translateY(-10px)}}
  .blink{animation:blink 1s steps(1) infinite} @keyframes blink{50%{opacity:0}}
  .grow{transform-origin:left center;transform:scaleX(0);animation:grow 1.1s cubic-bezier(.2,.7,.2,1) forwards} @keyframes grow{to{transform:scaleX(1)}}
  @media (prefers-reduced-motion:reduce){*{animation:none!important;opacity:1!important;transform:none!important}}` : ''}
</style>
<defs>
  <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${t.bg1}"/><stop offset="1" stop-color="${t.bg0}"/></linearGradient>
  <radialGradient id="g1" cx=".85" cy=".1" r=".6"><stop offset="0" stop-color="${t.acc}" stop-opacity="${t.dark ? .28 : .14}"/><stop offset="1" stop-color="${t.acc}" stop-opacity="0"/></radialGradient>
  <radialGradient id="g2" cx=".1" cy=".95" r=".6"><stop offset="0" stop-color="${t.acc2}" stop-opacity="${t.dark ? .2 : .1}"/><stop offset="1" stop-color="${t.acc2}" stop-opacity="0"/></radialGradient>
  <linearGradient id="ink" x1="0" x2="1"><stop offset="0" stop-color="${t.acc}"/><stop offset=".55" stop-color="${t.acc2}"/><stop offset="1" stop-color="${t.acc3}"/></linearGradient>
</defs>
<rect x="1" y="1" width="${w - 2}" height="${h - 2}" rx="22" fill="url(#bg)" stroke="${t.line}" stroke-width="2"/>
<rect x="1" y="1" width="${w - 2}" height="${h - 2}" rx="22" fill="url(#g1)"/><rect x="1" y="1" width="${w - 2}" height="${h - 2}" rx="22" fill="url(#g2)"/>
${body}
</svg>`;
  }
  const d = (anim, i, step = 0.12) => anim ? ` style="animation-delay:${(i * step).toFixed(2)}s"` : '';
  const cls = (anim, c) => anim ? ` class="${c}"` : '';
  const chip = (x, y, label, t, color, size = 18) => {
    const w = width(label, size) + 30;
    return { w, s: `<rect x="${x}" y="${y}" width="${w.toFixed(0)}" height="${size + 18}" rx="${(size + 18) / 2}" fill="${color || t.acc}" fill-opacity=".12" stroke="${color || t.acc}" stroke-opacity=".55"/><text x="${(x + w / 2).toFixed(0)}" y="${y + size + 3}" text-anchor="middle" class="s" font-size="${size}" font-weight="600" fill="${color || t.acc}">${esc(label)}</text>` };
  };

  /* ---------------- cards ---------------- */

  function hero(m, t, o = {}) {
    const W = 1200, H = 400, a = o.anim !== false;
    const lines = wrap(m.tagline, 26, 760, 2);
    const tags = (m.focus || []).slice(0, 5);
    let x = 70, chips = '';
    tags.forEach((s, i) => { const c = chip(x, 320, s, t, [t.acc, t.acc2, t.acc3][i % 3], 18); chips += `<g${cls(a, 'rise')}${d(a, 6 + i)}>${c.s}</g>`; x += c.w + 12; });
    const typed = esc(m.role || 'Developer');
    const tw = width(m.role || 'Developer', 30, true);
    const orb = (cx, cy, r, c, delay) => `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${c}" opacity="${t.dark ? .16 : .1}"${a ? ` class="float" style="animation-delay:${delay}s"` : ''}/>`;
    const body = `${orb(1010, 130, 120, t.acc, 0)}${orb(1110, 280, 70, t.acc3, 1.5)}${orb(900, 300, 46, t.acc2, 3)}
<text x="70" y="78" class="m" font-size="18" letter-spacing="4" fill="${t.muted}"${cls(a, 'fade')}>${esc(('@' + (m.login || '')).toUpperCase())}${m.location ? '  ·  ' + esc(m.location.toUpperCase()) : ''}</text>
<text x="66" y="160" class="s" font-size="${m.name && m.name.length > 16 ? 64 : 76}" font-weight="800" letter-spacing="-1.5" fill="url(#ink)"${cls(a, 'rise')}${d(a, 1)}>${esc(m.name || m.login)}</text>
<g${cls(a, 'fade')}${d(a, 3)}><text x="70" y="208" class="m" font-size="30" fill="${t.text}">&gt; ${typed}</text>
${a ? `<rect x="${(110 + tw).toFixed(0)}" y="184" width="14" height="30" fill="${t.acc}" class="blink"/>` : ''}</g>
${lines.map((l, i) => `<text x="70" y="${250 + i * 32}" class="s" font-size="24" fill="${t.muted}"${cls(a, 'fade')}${d(a, 4 + i)}>${esc(l)}</text>`).join('')}
${chips}`;
    return svg(W, H, t, `${m.name || m.login}: ${m.role || ''}`, `${m.tagline || ''} ${tags.join(', ')}`, body, a);
  }

  function title(num, label, t, o = {}) {
    const W = 1200, H = 96, a = o.anim !== false;
    const body = `<text x="40" y="61" class="m" font-size="20" letter-spacing="4" fill="${t.acc}"${cls(a, 'fade')}>${esc(num)}</text>
<text x="96" y="64" class="s" font-size="36" font-weight="800" fill="${t.text}"${cls(a, 'rise')}${d(a, 1)}>${esc(label)}</text>
<rect x="${(124 + width(label, 36) * 1.12).toFixed(0)}" y="47" width="${Math.max(40, 1160 - (124 + width(label, 36) * 1.12)).toFixed(0)}" height="3" rx="1.5" fill="url(#ink)" opacity=".7"${cls(a, 'grow')}${d(a, 2)}/>`;
    return svg(W, H, t, `${num} ${label}`, label, body, a).replace('rx="22"', 'rx="18"').replace('rx="22"', 'rx="18"').replace('rx="22"', 'rx="18"');
  }

  function about(m, t, o = {}) {
    const W = 1200, a = o.anim !== false;
    const rows = [['whoami', m.name || m.login], ['cat role.txt', m.role], ['ls focus/', (m.focus || []).join('  ')], ['cat now.txt', m.now], ['cat learning.txt', m.learning], ['./ask-me --about', m.askMe], ['echo $FUN_FACT', m.funFact]].filter((r) => r[1]);
    let y = 110, body = `<rect x="30" y="28" width="${W - 60}" height="40" rx="10" fill="${t.text}" fill-opacity=".05"/>
<circle cx="58" cy="48" r="7" fill="#ff5f57"/><circle cx="82" cy="48" r="7" fill="#febc2e"/><circle cx="106" cy="48" r="7" fill="#28c840"/>
<text x="${W / 2}" y="54" text-anchor="middle" class="m" font-size="16" fill="${t.muted}">${esc(m.login || 'me')}@github: ~</text>`;
    rows.forEach(([cmd, out], i) => {
      const outLines = wrap(out, 22, W - 160, 2, true);
      body += `<g${cls(a, 'fade')}${d(a, i * 2, 0.35)}><text x="56" y="${y}" class="m" font-size="22"><tspan fill="${t.acc2}">$</tspan><tspan fill="${t.text}"> ${esc(cmd)}</tspan></text></g>`;
      y += 34;
      outLines.forEach((l) => { body += `<text x="80" y="${y}" class="m" font-size="22" fill="${t.muted}"${cls(a, 'fade')}${d(a, i * 2 + 1, 0.35)}>${esc(l)}</text>`; y += 32; });
      y += 14;
    });
    body += a ? `<rect x="56" y="${y - 22}" width="13" height="26" fill="${t.acc}" class="blink"/>` : '';
    const H = y + 30;
    return svg(W, H, t, `About ${m.name || m.login}`, rows.map((r) => r[0] + ': ' + r[1]).join('. '), body, a);
  }

  function stats(s, t, o = {}) {
    const W = 1200, H = 210, a = o.anim !== false;
    const tiles = [['Public repos', fmt(s.repos || 0), t.acc], ['Stars earned', fmt(s.stars || 0), t.acc2], ['Followers', fmt(s.followers || 0), t.acc3], ['On GitHub', (s.years || 1) + (s.years === 1 ? ' year' : ' years'), t.acc]];
    const tw = (W - 60 - 3 * 20) / 4;
    const body = tiles.map(([k, v, c], i) => {
      const x = 30 + i * (tw + 20);
      return `<g${cls(a, 'rise')}${d(a, i)}><rect x="${x}" y="30" width="${tw}" height="150" rx="18" fill="${t.text}" fill-opacity=".04" stroke="${t.line}"/>
<rect x="${x + 24}" y="54" width="34" height="5" rx="2.5" fill="${c}"/>
<text x="${x + 24}" y="122" class="s" font-size="48" font-weight="800" fill="${t.text}">${esc(v)}</text>
<text x="${x + 24}" y="156" class="s" font-size="19" fill="${t.muted}">${esc(k)}</text></g>`;
    }).join('');
    const upd = s.updated ? `<text x="${W - 36}" y="200" text-anchor="end" class="m" font-size="13" fill="${t.muted}" opacity=".7">updated ${esc(s.updated)}</text>` : '';
    return svg(W, H, t, 'GitHub stats', tiles.map((x) => x[0] + ': ' + x[1]).join(', '), body + upd, a);
  }

  function languages(langs, t, o = {}) {
    const W = 1200, a = o.anim !== false;
    const top = (langs || []).slice(0, 8);
    const H = 150 + Math.ceil(top.length / 4) * 44;
    let x = 40, bar = '';
    top.forEach((l, i) => {
      const w = Math.max(4, (W - 80) * l.pct / 100);
      bar += `<rect x="${x.toFixed(1)}" y="40" width="${w.toFixed(1)}" height="26" fill="${LANG[l.name] || [t.acc, t.acc2, t.acc3][i % 3]}"${cls(a, 'grow')}${d(a, i, 0.08)}/>`;
      x += w;
    });
    const legend = top.map((l, i) => {
      const cx = 40 + (i % 4) * 285, cy = 120 + Math.floor(i / 4) * 44;
      return `<g${cls(a, 'fade')}${d(a, 4 + i, 0.08)}><circle cx="${cx + 8}" cy="${cy - 7}" r="8" fill="${LANG[l.name] || [t.acc, t.acc2, t.acc3][i % 3]}"/>
<text x="${cx + 26}" y="${cy}" class="s" font-size="20" fill="${t.text}" font-weight="600">${esc(l.name)}</text>
<text x="${cx + 34 + width(l.name, 20, false) + 6}" y="${cy}" class="m" font-size="18" fill="${t.muted}">${l.pct.toFixed(1)}%</text></g>`;
    }).join('');
    const clip = `<clipPath id="bar"><rect x="40" y="40" width="${W - 80}" height="26" rx="13"/></clipPath>`;
    return svg(W, H, t, 'Most used languages', top.map((l) => `${l.name} ${l.pct.toFixed(1)}%`).join(', '), `<defs>${clip}</defs><g clip-path="url(#bar)">${bar}</g>${legend}`, a);
  }

  function project(r, t, o = {}) {
    const W = 590, H = 230, a = o.anim !== false;
    const desc = wrap(r.description || 'No description yet.', 19, W - 70, 3);
    let x = 34, chips = '';
    (r.topics || []).slice(0, 4).forEach((tp) => { const c = chip(x, 168, tp, t, t.acc2, 14); if (x + c.w < W - 30) { chips += c.s; x += c.w + 8; } });
    const lc = LANG[r.language] || t.acc;
    const body = `<g${cls(a, 'rise')}>
<text x="34" y="62" class="s" font-size="${r.name.length > 26 ? 24 : 28}" font-weight="800" fill="${t.text}">${esc(r.name)}</text>
${desc.map((l, i) => `<text x="34" y="${100 + i * 26}" class="s" font-size="19" fill="${t.muted}">${esc(l)}</text>`).join('')}
${chips}
${r.language ? `<circle cx="${W - 200}" cy="48" r="7" fill="${lc}"/><text x="${W - 186}" y="55" class="s" font-size="17" fill="${t.muted}">${esc(r.language)}</text>` : ''}
<text x="${W - 34}" y="55" text-anchor="end" class="s" font-size="17" fill="${t.muted}">★ ${fmt(r.stars || 0)}</text></g>`;
    return svg(W, H, t, r.name, `${r.description || ''} ${r.language || ''}, ${r.stars || 0} stars`, body, a);
  }

  function toolkit(skills, t, o = {}) {
    const W = 1200, a = o.anim !== false;
    let x = 36, y = 40, i = 0, body = '';
    (skills || []).forEach((s) => {
      const c = chip(0, 0, s, t, [t.acc, t.acc2, t.acc3][i % 3], 20);
      if (x + c.w > W - 36) { x = 36; y += 54; }
      body += `<g transform="translate(${x.toFixed(0)} ${y})"><g${cls(a, 'rise')}${d(a, i, 0.05)}>${c.s}</g></g>`;
      x += c.w + 12; i++;
    });
    const H = y + 80;
    return svg(W, H, t, 'Toolkit', (skills || []).join(', '), body, a);
  }

  function badge(label, kind, t) {
    const icons = {
      linkedin: '<path d="M4 9h3v10H4zM5.5 4a1.8 1.8 0 1 1 0 3.6A1.8 1.8 0 0 1 5.5 4zM9 9h3v1.4c.5-.9 1.6-1.6 3.2-1.6 3 0 3.8 1.9 3.8 4.6V19h-3v-5c0-1.3-.3-2.4-1.7-2.4S12 12.7 12 14v5H9z"/>',
      web: '<circle cx="11" cy="11" r="7.5" fill="none" stroke-width="2"/><path d="M3.5 11h15M11 3.5c2.5 2.6 2.5 12.4 0 15M11 3.5c-2.5 2.6-2.5 12.4 0 15" fill="none" stroke-width="1.6"/>',
      mail: '<rect x="3" y="5.5" width="16" height="11" rx="2" fill="none" stroke-width="2"/><path d="M3.5 6.5l7.5 6 7.5-6" fill="none" stroke-width="2"/>',
      x: '<path d="M4 4h4.2l3.6 5 4.2-5h2.5l-5.5 6.5L19 18h-4.2l-3.9-5.4L6.3 18H3.8l6-7z"/>',
      github: '<path d="M11 2.5a8.5 8.5 0 0 0-2.7 16.6c.4.1.6-.2.6-.4v-1.5c-2.4.5-2.9-1-2.9-1-.4-1-1-1.3-1-1.3-.8-.5.1-.5.1-.5.9.1 1.3.9 1.3.9.8 1.3 2 1 2.5.7.1-.6.3-1 .6-1.2-1.9-.2-3.9-1-3.9-4.2 0-.9.3-1.7.9-2.3-.1-.2-.4-1.1.1-2.3 0 0 .7-.2 2.3.9a8 8 0 0 1 4.2 0c1.6-1.1 2.3-.9 2.3-.9.5 1.2.2 2.1.1 2.3.5.6.9 1.4.9 2.3 0 3.3-2 4-3.9 4.2.3.3.6.8.6 1.6v2.3c0 .2.2.5.6.4A8.5 8.5 0 0 0 11 2.5z"/>',
      resume: '<path d="M6 3h7l4 4v12H6z" fill="none" stroke-width="2"/><path d="M8.5 11h6M8.5 14h6" stroke-width="1.8"/>',
    };
    const w = Math.round(width(label, 17) + 70), h = 44;
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img" aria-label="${esc(label)}"><title>${esc(label)}</title>
<rect x="1" y="1" width="${w - 2}" height="${h - 2}" rx="${h / 2 - 1}" fill="${t.bg1}" stroke="${t.acc}" stroke-opacity=".7" stroke-width="2"/>
<g transform="translate(16 11)" fill="${t.acc}" stroke="${t.acc}">${icons[kind] || icons.web}</g>
<text x="46" y="28" font-family="${SANS}" font-size="17" font-weight="700" fill="${t.text}">${esc(label)}</text></svg>`;
  }

  function footer(m, t, o = {}) {
    const W = 1200, H = 150, a = o.anim !== false;
    const wave = (yy, amp, ph, c, op) => { let p = `M0 ${yy}`; for (let x = 0; x <= W; x += 40) p += ` L${x} ${(yy + Math.sin(x / 90 + ph) * amp).toFixed(1)}`; return `<path d="${p} L${W} ${H} L0 ${H} Z" fill="${c}" opacity="${op}"/>`; };
    const body = `${wave(92, 10, 0, t.acc, .18)}${wave(104, 8, 2, t.acc2, .14)}
<text x="${W / 2}" y="62" text-anchor="middle" class="s" font-size="28" font-weight="700" fill="${t.text}"${cls(a, 'fade')}>${esc(m.footer || 'Thanks for stopping by ✨')}</text>`;
    return svg(W, H, t, 'Footer', m.footer || 'Thanks for stopping by', body, a);
  }

  /* ---------------- data shaping (shared by the studio and the Action) ---------------- */
  function analyse(user, repos, langBytes) {
    const own = repos.filter((r) => !r.fork && !r.archived && r.name.toLowerCase() !== String(user.login).toLowerCase());
    const stars = own.reduce((s, r) => s + (r.stargazers_count || 0), 0);
    let entries = Object.entries(langBytes || {});
    if (!entries.length) { const c = {}; own.forEach((r) => { if (r.language) c[r.language] = (c[r.language] || 0) + 1; }); entries = Object.entries(c); }
    const total = entries.reduce((s, [, n]) => s + n, 0) || 1;
    const langs = entries.sort((a, b) => b[1] - a[1]).map(([name, n]) => ({ name, pct: n / total * 100 }));
    const years = Math.max(1, new Date().getUTCFullYear() - new Date(user.created_at || Date.now()).getUTCFullYear());
    const projects = own.sort((a, b) => (b.stargazers_count - a.stargazers_count) || (new Date(b.pushed_at) - new Date(a.pushed_at)))
      .map((r) => ({ name: r.name, description: r.description, language: r.language, stars: r.stargazers_count || 0, topics: r.topics || [], url: r.html_url, homepage: r.homepage }));
    return { stats: { repos: user.public_repos || own.length, stars, followers: user.followers || 0, years }, langs, projects };
  }

  const API = { THEMES, LANG, hero, title, about, stats, languages, project, toolkit, badge, footer, analyse, esc, wrap };
  if (typeof module !== 'undefined' && module.exports) module.exports = API; else root.RMCards = API;
})(typeof self !== 'undefined' ? self : this);
