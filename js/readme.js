/* ReadMeow: builds README.md and every card file from a profile + settings. */
(function (root) {
  'use strict';
  const C = typeof module !== 'undefined' && module.exports ? require('./cards.js') : root.RMCards;
  const A = './assets/readmeow/';

  const SECTIONS = {
    hero: 'Header', links: 'Links', about: 'About me', stats: 'GitHub stats',
    languages: 'Top languages', projects: 'Projects', toolkit: 'Toolkit', footer: 'Footer',
  };
  const DEFAULT_ORDER = ['hero', 'links', 'about', 'stats', 'languages', 'projects', 'toolkit', 'footer'];
  const slug = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

  /** cfg: { theme, anim, order[], off{}, picked[] (repo names), links{}, model fields } ; data: analyse() output */
  function build(m, data, cfg) {
    const t = C.THEMES[cfg.theme] || C.THEMES.midnight;
    const o = { anim: cfg.anim !== false };
    const files = {}, md = [];
    const order = (cfg.order || DEFAULT_ORDER).filter((s) => !(cfg.off || {})[s]);
    const picked = (cfg.picked && cfg.picked.length ? cfg.picked.map((n) => data.projects.find((p) => p.name === n)).filter(Boolean) : data.projects.slice(0, 6));
    let n = 0;
    const heading = (key, label) => { n++; const f = `title-${key}.svg`; files[f] = C.title(String(n).padStart(2, '0'), label, t, o); md.push(`<img src="${A}${f}" width="100%" alt="${C.esc(label)}">`, ''); };

    for (const s of order) {
      if (s === 'hero') {
        files['hero.svg'] = C.hero(m, t, o);
        md.push(`<p align="center">`, `  <img src="${A}hero.svg" width="100%" alt="${C.esc(`${m.name || m.login}: ${m.role || ''}. ${m.tagline || ''}`)}">`, `</p>`, '');
      }
      if (s === 'links') {
        const L = m.links || {}, items = [];
        const add = (key, label, kind, href) => { if (!href) return; const f = `badge-${key}.svg`; files[f] = C.badge(label, kind, t); items.push(`  <a href="${C.esc(href)}"><img src="${A}${f}" height="44" alt="${C.esc(label)}"></a>`); };
        add('github', 'GitHub', 'github', m.login ? `https://github.com/${m.login}` : '');
        add('linkedin', 'LinkedIn', 'linkedin', L.linkedin ? (/^https?:/.test(L.linkedin) ? L.linkedin : `https://www.linkedin.com/in/${L.linkedin}`) : '');
        add('web', 'Portfolio', 'web', L.website ? (/^https?:/.test(L.website) ? L.website : `https://${L.website}`) : '');
        add('x', 'X', 'x', L.x ? `https://x.com/${String(L.x).replace(/^@/, '')}` : '');
        add('mail', 'Email', 'mail', L.email ? `mailto:${L.email}` : '');
        add('resume', 'Résumé', 'resume', L.resume || '');
        if (items.length) md.push(`<p align="center">`, ...items, `</p>`, '');
      }
      if (s === 'about') { heading('about', 'About me'); files['about.svg'] = C.about(m, t, o); md.push(`<img src="${A}about.svg" width="100%" alt="${C.esc(`About ${m.name || m.login}. ${m.now || ''} ${m.learning || ''}`)}">`, ''); }
      if (s === 'stats') { heading('stats', 'GitHub stats'); files['stats.svg'] = C.stats(Object.assign({ updated: cfg.updated }, data.stats), t, o); md.push(`<img src="${A}stats.svg" width="100%" alt="GitHub stats: ${data.stats.repos} public repositories, ${data.stats.stars} stars, ${data.stats.followers} followers">`, ''); }
      if (s === 'languages' && data.langs.length) { heading('languages', 'Top languages'); files['languages.svg'] = C.languages(data.langs, t, o); md.push(`<img src="${A}languages.svg" width="100%" alt="Most used languages: ${data.langs.slice(0, 6).map((l) => `${l.name} ${l.pct.toFixed(0)}%`).join(', ')}">`, ''); }
      if (s === 'projects' && picked.length) {
        heading('projects', 'Projects');
        md.push(`<p align="center">`);
        picked.forEach((p) => { const f = `project-${slug(p.name)}.svg`; files[f] = C.project(p, t, o); md.push(`  <a href="${C.esc(p.url || `https://github.com/${m.login}/${p.name}`)}"><img src="${A}${f}" width="49%" alt="${C.esc(`${p.name}: ${p.description || ''}`)}"></a>`); });
        md.push(`</p>`, '');
      }
      if (s === 'toolkit' && (m.skills || []).length) { heading('toolkit', 'Toolkit'); files['toolkit.svg'] = C.toolkit(m.skills, t, o); md.push(`<img src="${A}toolkit.svg" width="100%" alt="Toolkit: ${C.esc(m.skills.join(', '))}">`, ''); }
      if (s === 'footer') { files['footer.svg'] = C.footer(m, t, o); md.push(`<img src="${A}footer.svg" width="100%" alt="${C.esc(m.footer || 'Thanks for stopping by')}">`, ''); }
    }
    md.push(`<!-- Made with ReadMeow 🐱 · cards live in ${A} and refresh daily via .github/workflows/readmeow.yml -->`, '');
    return { readme: md.join('\n'), files, picked: picked.map((p) => p.name) };
  }

  const API = { build, SECTIONS, DEFAULT_ORDER, slug, ASSET_DIR: A };
  if (typeof module !== 'undefined' && module.exports) module.exports = API; else root.RMReadme = API;
})(typeof self !== 'undefined' ? self : this);
