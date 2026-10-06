/**
 * ui_layout.js: trims the main toolbar (Samuel's 2026-10-06 markup).
 * Light and Atmosphere go into the Weather panel, the X-Ray, Exploded view and camera angle buttons only show inside the
 * garage, the session controls sit in the bottom right of the 3D view, and unused buttons are hidden.
 * Elements are moved, not deleted, so app.js keeps finding them by id.
 */
const css = document.createElement('style');
css.textContent = `
#btn-regulations,#btn-design-modal,.topbar-status,#btn-auto-rotate{display:none!important}
#garage-views{position:absolute;left:12px;top:140px;z-index:30;display:none;flex-direction:column;gap:6px;width:190px;background:rgba(10,14,20,.86);border:1px solid #2a3545;border-radius:8px;padding:8px}
body.garage-mode #garage-views{display:flex}
#garage-views .cam-presets{display:grid;grid-template-columns:1fr 1fr;gap:4px}
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
