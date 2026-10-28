/**
 * ui_layout.js: trims the main toolbar (Samuel's 2026-10-06 markup).
 * Light and Atmosphere go into the Weather panel, the X-Ray, Exploded view and camera angle buttons only show inside the
 * garage, the session controls sit in the bottom right of the 3D view, and unused buttons are hidden.
 * Elements are moved, not deleted, so app.js keeps finding them by id.
 */
const css = document.createElement('style');
css.textContent = `
#btn-regulations,#btn-design-modal,.topbar-status,#btn-auto-rotate{display:none!important}
#garage-views{position:absolute;left:14px;top:120px;z-index:30;display:none;flex-direction:column;gap:6px;width:200px;background:rgba(8,14,26,.92);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);border:1px solid rgba(0,212,232,.35);border-radius:10px;padding:10px;box-shadow:0 12px 36px rgba(0,0,0,.7)}
body.garage-mode #garage-views{display:flex}
#garage-views .garage-views-title{font:700 11px monospace,system-ui;color:#00d4e8;letter-spacing:.08em;padding-bottom:4px;border-bottom:1px solid rgba(255,255,255,.08);display:flex;justify-content:space-between;align-items:center}
#garage-views .cam-presets{display:grid;grid-template-columns:1fr 1fr;gap:4px}
#garage-views .view-btn{background:#131c2e;border:1px solid #2a3a52;color:#e2e8f0;padding:6px 6px;border-radius:6px;font-size:11px;font-weight:600;cursor:pointer;text-align:center;transition:all .15s}
#garage-views .view-btn:hover{background:#0284c7;border-color:#38bdf8;color:#fff}
#garage-bar{white-space:nowrap}
body.garage-mode .stage-hint{display:none}
#wx-panel .wx-moved{display:grid;grid-template-columns:78px 1fr 46px;align-items:center;gap:6px;margin:4px 0}
#wx-panel .wx-moved select{grid-column:2 / 4}
#sess-panel.ui-docked{position:absolute!important;top:auto!important;right:12px!important;bottom:12px!important;max-height:45%!important;width:360px!important}
`;
document.head.appendChild(css);

const $ = (id) => document.getElementById(id);
function when(test, fn) {
  const r = test(); if (r) return fn(r);
  const mo = new MutationObserver(() => { const v = test(); if (v) { mo.disconnect(); fn(v); } });
  mo.observe(document.body, { childList: true, subtree: true });
}

// garage-only view tools
when(() => document.querySelector('.stage'), (stage) => {
  const box = document.createElement('div'); box.id = 'garage-views';
  const title = document.createElement('div');
  title.className = 'garage-views-title';
  title.innerHTML = '<span>🎥 CAMERAS</span><span style="font-size:10px;color:#94a3b8">PERSPECTIVE</span>';
  box.appendChild(title);
  [$('btn-cutaway'), $('btn-explode'), document.querySelector('.cam-presets'), $('btn-view-reset')].forEach(n => n && box.appendChild(n));
  stage.appendChild(box);
});

// Light and Atmosphere into the Weather panel
when(() => $('wx-panel'), (panel) => {
  document.querySelectorAll('.view-toolbar .light-ctrl').forEach(l => { l.classList.add('wx-moved'); panel.appendChild(l); });
});

// session controls to the bottom right of the 3D view
when(() => $('sess-panel') && document.querySelector('.stage'), () => {
  const p = $('sess-panel'); p.classList.add('ui-docked'); document.querySelector('.stage').appendChild(p);
});
