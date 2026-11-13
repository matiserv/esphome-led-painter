/*!
 * LED Painter card for Home Assistant - paint an addressable LED strip.
 * Works with the ESPHome "led_painter" component from the same repository.
 * MIT License.
 */
const VERSION = '1.0.0';
const PAINT_NAMES = ['Paint', 'Malowanie'];
const PAL = ['#ff3b30', '#ff6a00', '#ff9500', '#ffcc00', '#34c759', '#00c7be', '#32ade6', '#007aff', '#5e5ce6', '#af52de', '#ff2d92', '#ffd9a0', '#ffffff'];
// [English name, Polish name, colour stops]
const PRESETS = [
  ['Violet', 'Fiolet', ['#b388ff', '#8c52ff', '#5e35e8', '#4a25b8']],
  ['Sunset', 'Zachód słońca', ['#2b1055', '#b0306a', '#ff5e3a', '#ffc400']],
  ['Ocean', 'Ocean', ['#001f5c', '#0057ff', '#00c2ff', '#9ff5ff']],
  ['Forest', 'Las', ['#0b3d1a', '#1f8a3b', '#7ac143', '#d6e83a']],
  ['Fire', 'Ogień', ['#7a0000', '#ff1a00', '#ff7a00', '#ffd000']],
  ['Aurora', 'Zorza', ['#00ff9d', '#00c2ff', '#5e35e8', '#ff2d92']],
  ['Rainbow', 'Tęcza', ['#ff0000', '#ff9500', '#ffee00', '#00d026', '#00b7ff', '#3d2bff', '#c400ff']],
  ['Candy', 'Cukierek', ['#ff5fa2', '#ffb3d1', '#9be7ff', '#b388ff']],
  ['Ice', 'Lód', ['#ffffff', '#bfeaff', '#4fd4ff', '#0077ff']],
  ['Lava', 'Lawa', ['#200000', '#b00000', '#ff3d00', '#ff9500', '#b00000']],
  ['Neon', 'Neon', ['#ff00d4', '#00f0ff', '#b6ff00', '#ff00d4']],
  ['Cyberpunk', 'Cyberpunk', ['#00f0ff', '#5e35e8', '#ff2d92', '#ffcc00']],
  ['Mint', 'Mięta', ['#00c7be', '#7dffd4', '#e8fff7', '#34c759']],
  ['Autumn', 'Jesień', ['#5c1a00', '#b8440a', '#ff8a00', '#ffd166']],
  ['Warm white', 'Ciepła biel', ['#ffb46b', '#ffd9a0', '#fff1d6', '#ffd9a0']],
  ['Cinema', 'Kino', ['#0a0a3c', '#3d2bff', '#0a0a3c', '#ff6a00']],
  ['Deep', 'Głębia', ['#000428', '#004e92', '#000428']],
];

const I18N = {
  en: {
    off: 'Off', on: 'On', unavailable: 'Unavailable', notFound: 'Entity not found', painting: 'Painting',
    zones: 'zones', lights: 'lights', power: 'Turn on or off', brush: 'Brush', smudge: 'Smudge', eraser: 'Eraser',
    fill: 'Fill the whole strip', undo: 'Undo', clear: 'Clear', tune: 'Brightness and brush settings',
    brightness: 'Brightness', opacity: 'Opacity', size: 'Size', softness: 'Softness', blend: 'Blending',
    cover: 'Cover', add: 'Add light', effect: 'Effect', presets: 'Presets', choose: 'Choose', close: 'Close',
    presetName: 'Preset name', saveCurrent: 'Save current', mine: 'Saved', builtin: 'Built-in',
    deletePreset: 'Delete preset', custom: 'Custom colour', none: 'None', details: 'Details', error: 'Error',
    noPaint: 'This light does not support painting - preview only.',
    cfgEntity: 'Light or light group (with the paint effect)', cfgName: 'Name', cfgLed: 'Zones (fallback when the device does not report them)',
    cfgRows: 'Rows in the preview', cfgEffect: 'Paint effect name (optional)', cfgAction: 'ESPHome action name',
    cardName: 'LED Painter', cardDesc: 'Paint an addressable LED strip driven by the ESPHome led_painter component',
  },
  pl: {
    off: 'Wyłączone', on: 'Włączone', unavailable: 'Niedostępne', notFound: 'Nie znaleziono encji', painting: 'Malowanie',
    zones: 'stref', lights: 'światła', power: 'Włącz lub wyłącz', brush: 'Pędzel', smudge: 'Rozmaż', eraser: 'Gumka',
    fill: 'Wypełnij cały pasek', undo: 'Cofnij', clear: 'Wyczyść', tune: 'Jasność i ustawienia pędzla',
    brightness: 'Jasność', opacity: 'Krycie', size: 'Rozmiar', softness: 'Miękkość', blend: 'Nakładanie',
    cover: 'Przykryj', add: 'Dodaj światło', effect: 'Efekt', presets: 'Presety', choose: 'Wybierz', close: 'Zamknij',
    presetName: 'Nazwa presetu', saveCurrent: 'Zapisz obecne', mine: 'Własne', builtin: 'Gotowe',
    deletePreset: 'Usuń preset', custom: 'Własny kolor', none: 'Brak', details: 'Szczegóły', error: 'Błąd',
    noPaint: 'To światło nie obsługuje malowania - działa tylko podgląd.',
    cfgEntity: 'Światło lub grupa świateł (z efektem malowania)', cfgName: 'Nazwa', cfgLed: 'Strefy (gdy urządzenie ich nie podaje)',
    cfgRows: 'Rzędy na podglądzie', cfgEffect: 'Nazwa efektu malowania (opcjonalnie)', cfgAction: 'Nazwa akcji ESPHome',
    cardName: 'LED Painter', cardDesc: 'Malowanie adresowalnego paska LED sterowanego komponentem ESPHome led_painter',
  },
};

const W = 680, STEP = 3, ROW = 83, RAD = 41.5, XL = 110, XR = 570;
const hex2rgb = (c) => [1, 3, 5].map((k) => parseInt(c.substr(k, 2), 16));
const mix = (b, t, A, add) => b.map((v, c) => { const g = add ? 255 - (255 - v) * (255 - t[c]) / 255 : t[c]; return v + (g - v) * A; });
const h2 = (v) => ('0' + Math.max(0, Math.min(255, Math.round(v))).toString(16)).slice(-2);
const slug = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
const lpHass = () => { const ha = document.querySelector('home-assistant'); return ha && ha.hass; };
const lpText = (hass) => I18N[((hass && hass.language) || 'en').slice(0, 2)] || I18N.en;
const lpNames = () => PAINT_NAMES.concat(window.__lpNames || []);

// Per-user storage shared by all cards: saved presets and the last painting of each light.
const LP_STORE = { data: null, p: null, t: 0 };
const lpLoad = (hass) => LP_STORE.p || (LP_STORE.p = hass.callWS({ type: 'frontend/get_user_data', key: 'led_painter' })
  .then((r) => { LP_STORE.data = Object.assign({ presets: [], last: {} }, (r && r.value) || {}); return LP_STORE.data; })
  .catch(() => { LP_STORE.data = { presets: [], last: {} }; return LP_STORE.data; }));
const lpSave = (hass) => {
  clearTimeout(LP_STORE.t);
  LP_STORE.t = setTimeout(() => { hass.callWS({ type: 'frontend/set_user_data', key: 'led_painter', value: LP_STORE.data }).catch(() => {}); }, 1500);
};

const STYLE = `
:host{display:block}
[hidden]{display:none!important}
ha-card{position:relative;overflow:hidden}
.wrap{position:relative;padding:16px;display:flex;flex-direction:column;align-items:center;gap:16px;--acc:var(--state-light-active-color,var(--state-active-color,#ffc107));--trk:color-mix(in srgb,var(--disabled-color,#808080) 20%,transparent)}
:host([dialog]) ha-card{border:none;box-shadow:none;background:transparent}
:host([dialog]) .wrap{padding:8px 24px 24px;gap:20px}
:host([dialog]) .hd{display:none}
:host(:not([dialog])) .state{display:none}
button{font:inherit;color:inherit;cursor:pointer;-webkit-tap-highlight-color:transparent}
.hd{display:flex;align-items:center;gap:12px;align-self:stretch}
.ic{width:36px;height:36px;border-radius:50%;display:flex;align-items:center;justify-content:center;background:var(--trk);color:var(--secondary-text-color);flex:none}
.ic.on{background:color-mix(in srgb,var(--acc) 20%,transparent);color:var(--acc)}
.nm{flex:1;min-width:0}
.nm div{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#name{font-size:14px;line-height:20px;font-weight:500;color:var(--primary-text-color)}
.sub{font-size:12px;line-height:16px;color:var(--secondary-text-color)}
.state{text-align:center}
.big{font-size:28px;line-height:36px;color:var(--primary-text-color)}
.state .sub{font-size:14px;line-height:20px;font-weight:500;color:var(--primary-text-color);min-height:20px}
.warn{align-self:stretch;font-size:13px;border-radius:12px;padding:8px 12px;background:color-mix(in srgb,var(--warning-color,#ffa600) 18%,transparent);color:var(--primary-text-color)}
.cvw{align-self:stretch}
canvas{display:block;width:100%}
#cv{touch-action:none;cursor:crosshair}
#lc{height:6px;border-radius:3px;margin-top:4px}
.grp{display:flex;align-items:center;justify-content:center;flex-wrap:wrap;gap:4px;background:var(--trk);border-radius:24px;padding:4px;max-width:100%}
.grp button{width:40px;height:40px;border-radius:50%;border:none;background:transparent;color:var(--primary-text-color);display:flex;align-items:center;justify-content:center;padding:0}
.grp button ha-icon{--mdc-icon-size:20px}
.grp button:hover{background:rgba(127,127,127,.15)}
.grp button.on{background:var(--primary-text-color);color:var(--card-background-color,#fff)}
.seg{display:contents}
.dv{width:1px;height:24px;background:var(--divider-color);margin:0 4px}
.sws{display:grid;grid-template-columns:repeat(7,minmax(0,40px));gap:12px;justify-content:center;align-self:stretch}
.sws button,.sws label{display:block;position:relative;width:100%;aspect-ratio:1;border-radius:50%;border:none;padding:0;cursor:pointer;box-sizing:border-box}
.sws .on{box-shadow:0 0 0 2px var(--card-background-color,#fff),0 0 0 4px var(--primary-text-color)}
.sws label{background:conic-gradient(#f00,#ff0,#0f0,#0ff,#00f,#f0f,#f00)}
.sws input{position:absolute;inset:0;width:100%;height:100%;opacity:0;cursor:pointer}
.adv{align-self:stretch;display:flex;flex-direction:column;gap:10px}
.rw{display:flex;align-items:center;gap:12px;font-size:13px;color:var(--secondary-text-color)}
.rw span{min-width:72px}
.rw b{font-weight:400;min-width:40px;text-align:right;color:var(--primary-text-color)}
.rw input[type=range]{flex:1;min-width:0;-webkit-appearance:none;appearance:none;height:32px;border-radius:10px;margin:0;cursor:pointer;background:linear-gradient(to right,color-mix(in srgb,var(--acc) 60%,transparent) var(--p,50%),var(--trk) var(--p,50%))}
.rw input[type=range]::-webkit-slider-thumb{-webkit-appearance:none;width:4px;height:16px;border-radius:2px;background:#fff;box-shadow:0 0 0 1px rgba(0,0,0,.2)}
.rw input[type=range]::-moz-range-thumb{width:4px;height:16px;border:none;border-radius:2px;background:#fff}
.sg{display:inline-flex;background:var(--trk);border-radius:12px;padding:4px;gap:4px}
.sg button{border:none;background:transparent;border-radius:8px;padding:6px 12px;font-size:13px;font-weight:500;color:var(--primary-text-color)}
.sg button.on{background:var(--primary-text-color);color:var(--card-background-color,#fff)}
.chips{display:flex;gap:8px;flex-wrap:wrap;justify-content:center}
.chip{display:flex;flex-direction:column;justify-content:center;min-width:112px;height:48px;padding:0 16px;border:none;border-radius:12px;background:var(--trk);color:var(--primary-text-color);text-align:left;box-sizing:border-box}
.chip:hover{background:color-mix(in srgb,var(--disabled-color,#808080) 30%,transparent)}
.cl{font-size:12px;line-height:14px;font-weight:500}
.cvl{font-size:14px;line-height:18px;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:180px}
.menu{position:absolute;left:50%;transform:translateX(-50%);bottom:80px;min-width:220px;max-width:calc(100% - 32px);max-height:min(380px,75%);overflow:auto;z-index:3;box-sizing:border-box;padding:4px;border-radius:12px;border:1px solid var(--divider-color);background:var(--ha-color-surface-default,var(--card-background-color,#fff));box-shadow:0 4px 16px rgba(0,0,0,.3)}
.menu button{display:flex;align-items:center;width:100%;height:40px;padding:0 16px 0 8px;border:2px solid transparent;border-radius:8px;background:transparent;color:var(--primary-text-color);font-size:14px;font-weight:500;text-align:left;white-space:nowrap}
.menu button::before{content:"";width:6px;height:6px;border-radius:50%;background:currentColor;flex:none;margin:0 14px 0 8px}
.menu button:hover{background:var(--trk)}
.menu button.on{border-color:var(--primary-text-color)}
.mo{position:absolute;inset:0;background:rgba(0,0,0,.55);padding:16px;box-sizing:border-box;overflow:auto;z-index:2}
.mob{background:var(--card-background-color,#fff);border-radius:16px;padding:14px}
.moh{display:flex;align-items:center;margin-bottom:10px;font-size:16px;font-weight:500;color:var(--primary-text-color)}
.moh span{flex:1}
.moh button{border:none;background:transparent;border-radius:50%;width:40px;height:40px;color:var(--primary-text-color);display:flex;align-items:center;justify-content:center}
.save{display:flex;gap:8px;margin-bottom:4px}
.save input{flex:1;min-width:0;height:40px;border:none;border-radius:12px;padding:0 12px;background:var(--trk);color:var(--primary-text-color);font:inherit;font-size:14px;outline:none}
.save button{border:none;border-radius:12px;padding:0 14px;height:40px;background:var(--primary-text-color);color:var(--card-background-color,#fff);font-size:13px;font-weight:500;white-space:nowrap}
.gl{font-size:12px;font-weight:500;color:var(--secondary-text-color);margin:12px 0 6px}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(110px,1fr));gap:8px}
.grid button{position:relative;height:60px;border:none;border-radius:12px;padding:0;overflow:hidden}
.grid span{position:absolute;left:6px;bottom:6px;font-size:12px;color:#fff;background:rgba(0,0,0,.55);padding:2px 8px;border-radius:6px}
.grid i{position:absolute;right:4px;top:4px;width:22px;height:22px;border-radius:50%;background:rgba(0,0,0,.55);color:#fff;font-style:normal;font-size:14px;line-height:22px;text-align:center}
`;

const HTML = (t) => `
<ha-card><div class="wrap">
<div class="hd">
  <div class="ic" id="ic"><ha-icon icon="mdi:led-strip-variant"></ha-icon></div>
  <div class="nm"><div id="name"></div><div id="st" class="sub"></div></div>
</div>
<div class="state"><div class="big" id="big"></div><div class="sub" id="st2"></div></div>
<div class="warn" id="warn" hidden></div>
<div class="cvw"><canvas id="cv"></canvas><canvas id="lc"></canvas></div>
<div class="grp">
  <button id="pw" title="${t.power}"><ha-icon icon="mdi:power"></ha-icon></button>
  <span class="dv"></span>
  <span class="seg" id="tools">
    <button data-m="paint" title="${t.brush}"><ha-icon icon="mdi:brush"></ha-icon></button>
    <button data-m="smudge" title="${t.smudge}"><ha-icon icon="mdi:gesture-swipe-horizontal"></ha-icon></button>
    <button data-m="erase" title="${t.eraser}"><ha-icon icon="mdi:eraser"></ha-icon></button>
  </span>
  <span class="dv ptool"></span>
  <button class="ptool" id="fill" title="${t.fill}"><ha-icon icon="mdi:format-color-fill"></ha-icon></button>
  <button class="ptool" id="undo" title="${t.undo}"><ha-icon icon="mdi:undo"></ha-icon></button>
  <button class="ptool" id="clr" title="${t.clear}"><ha-icon icon="mdi:delete-outline"></ha-icon></button>
  <span class="dv"></span>
  <button id="tune" title="${t.tune}"><ha-icon icon="mdi:tune-variant"></ha-icon></button>
</div>
<div class="sws" id="sws"></div>
<div class="adv" id="adv" hidden>
  <div class="rw"><span>${t.brightness}</span><input type="range" id="br" min="1" max="100" step="1" aria-label="${t.brightness}"><b id="brv"></b></div>
  <div class="rw ptool"><span>${t.opacity}</span><input type="range" id="op" min="5" max="100" step="1" value="45" aria-label="${t.opacity}"><b id="opv">45%</b></div>
  <div class="rw ptool"><span>${t.size}</span><input type="range" id="sz" min="10" max="300" step="1" value="110" aria-label="${t.size}"><b id="szv">110</b></div>
  <div class="rw ptool"><span>${t.softness}</span><input type="range" id="sf" min="0" max="100" step="1" value="70" aria-label="${t.softness}"><b id="sfv">70%</b></div>
  <div class="rw ptool"><span>${t.blend}</span><div class="sg" id="blends"><button data-b="0">${t.cover}</button><button data-b="1">${t.add}</button></div></div>
</div>
<div class="chips">
  <button class="chip" id="fxchip"><span class="cl">${t.effect}</span><span class="cvl" id="fxv"></span></button>
  <button class="chip" id="open"><span class="cl">${t.presets}</span><span class="cvl">${t.choose}</span></button>
</div>
<div class="menu" id="menu" hidden></div>
<div class="mo" id="mo" hidden><div class="mob">
  <div class="moh"><span>${t.presets}</span><button id="close" title="${t.close}"><ha-icon icon="mdi:close"></ha-icon></button></div>
  <div class="save"><input id="pname" placeholder="${t.presetName}" maxlength="24" aria-label="${t.presetName}"><button id="psave">${t.saveCurrent}</button></div>
  <div class="gl" id="gl1" hidden>${t.mine}</div>
  <div class="grid" id="mygrid"></div>
  <div class="gl">${t.builtin}</div>
  <div class="grid" id="grid"></div>
</div></div>
</div></ha-card>`;

class LedPainterCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._tool = 'paint'; this._add = false; this._tab = 'paint'; this._mode = null;
    this._cur = hex2rgb(PAL[0]); this._hist = []; this._hover = -1; this._last = -1;
    this._on = false; this._rgb = [255, 255, 255]; this._zones = 0; this._zid = {}; this._armT = {};
  }

  static getConfigForm() {
    const t = lpText(lpHass());
    const labels = { entity: t.cfgEntity, name: t.cfgName, led_count: t.cfgLed, rows: t.cfgRows, paint_effect: t.cfgEffect, paint_action: t.cfgAction };
    return {
      schema: [
        { name: 'entity', required: true, selector: { entity: { domain: 'light' } } },
        { name: 'name', selector: { text: {} } },
        { type: 'grid', name: '', schema: [
          { name: 'led_count', selector: { number: { min: 1, max: 1024, mode: 'box' } } },
          { name: 'rows', selector: { number: { min: 1, max: 8, mode: 'box' } } },
        ] },
        { name: 'paint_effect', selector: { text: {} } },
        { name: 'paint_action', selector: { text: {} } },
      ],
      computeLabel: (s) => labels[s.name] || s.name,
    };
  }

  static getStubConfig(hass) {
    const names = lpNames();
    const id = Object.keys(hass.states).find((e) => e.startsWith('light.') && (hass.states[e].attributes.effect_list || []).some((n) => names.includes(n)));
    return { entity: id || '' };
  }

  setConfig(c) {
    if (!c || !c.entity) throw new Error('led-painter-card: "entity" is required');
    const cfg = Object.assign({ led_count: 60, rows: 4, paint_action: 'paint' }, c);
    cfg.led_count = Math.max(1, Math.round(+cfg.led_count) || 60);
    cfg.rows = Math.min(8, Math.max(1, Math.round(+cfg.rows) || 4));
    if (cfg.paint_effect) { window.__lpNames = window.__lpNames || []; if (!window.__lpNames.includes(cfg.paint_effect)) window.__lpNames.push(cfg.paint_effect); }
    const entityChanged = this._cfg && this._cfg.entity !== cfg.entity;
    this._cfg = cfg;
    if (!cfg._dialog) (window.__lpCfg = window.__lpCfg || {})[cfg.entity] = cfg;
    this._path();
    if (entityChanged) { this._loaded = false; this._mode = null; }
    if (this._built) { this._resize(); if (this._hass) this._sync(); }
  }

  set hass(h) {
    this._hass = h;
    if (!this._built) this._build();
    if (!this._loaded) this._load();
    this._sync();
  }

  getCardSize() { return 8; }
  getGridOptions() { return { columns: 12, min_columns: 9 }; }
  connectedCallback() { if (this._built) this._resize(); }

  // ---------- geometry ----------

  _path() {
    const R = this._cfg.rows, p = [], y = (r) => 40 + r * ROW;
    for (let r = 0; r < R; r++) {
      const d = r % 2 === 0 ? 1 : -1, x0 = d > 0 ? XL : XR, x1 = d > 0 ? XR : XL, n = (XR - XL) / STEP;
      for (let i = 0; i < n; i++) p.push([x0 + d * i * STEP, y(r)]);
      if (r < R - 1) {
        const cy = (y(r) + y(r + 1)) / 2, m = Math.PI * RAD / STEP;
        for (let i = 0; i < m; i++) { const a = -Math.PI / 2 + Math.PI * i / m; p.push([x1 + d * Math.cos(a) * RAD, cy + Math.sin(a) * RAD]); }
      } else p.push([x1, y(r)]);
    }
    const old = this._col;
    this._H = 80 + (R - 1) * ROW; this._pts = p; this._M = p.length;
    this._col = p.map((_, i) => (old && old.length ? old[Math.min(old.length - 1, Math.floor(i * old.length / p.length))].slice() : [0, 0, 0]));
    this._mask = new Float32Array(p.length);
    this._hist = [];
  }

  _resize() {
    const $ = this._$, d = window.devicePixelRatio || 1, w = $.cv.clientWidth;
    if (!w) return;
    const h = Math.round(w * this._H / W);
    if ($.cv.width !== Math.round(w * d) || $.cv.height !== Math.round(h * d)) {
      $.cv.width = Math.round(w * d); $.cv.height = Math.round(h * d); $.cv.style.height = h + 'px';
    }
    $.lc.width = Math.round(($.lc.clientWidth || w) * d); $.lc.height = Math.round(6 * d);
    this._req();
  }

  // ---------- setup ----------

  _build() {
    const root = this.shadowRoot, t = this._t = lpText(this._hass);
    root.innerHTML = '<style>' + STYLE + '</style>' + HTML(t);
    const $ = this._$ = {};
    root.querySelectorAll('[id]').forEach((e) => { $[e.id] = e; });
    this._built = true;

    PAL.forEach((c, n) => {
      const b = document.createElement('button');
      b.style.background = c; b.title = c; if (n === 0) b.classList.add('on');
      b.onclick = () => this._pick(hex2rgb(c), b, true);
      $.sws.appendChild(b);
    });
    const lab = document.createElement('label'), ci = document.createElement('input');
    lab.title = t.custom; ci.type = 'color'; ci.value = '#8c52ff'; lab.appendChild(ci); $.sws.appendChild(lab);
    ci.oninput = () => this._pick(hex2rgb(ci.value), lab, false);
    ci.onchange = () => this._pick(hex2rgb(ci.value), lab, true);

    const pl = t === I18N.pl;
    PRESETS.forEach((p) => {
      const b = document.createElement('button'), s = document.createElement('span');
      b.style.background = 'linear-gradient(to right,' + p[2].join(',') + ')'; s.textContent = pl ? p[1] : p[0]; b.appendChild(s);
      b.onclick = () => { $.mo.hidden = true; this._push(); this._gradient(p[2]); this._tab = 'paint'; this._changed(true); this._sync(); };
      $.grid.appendChild(b);
    });

    $.tools.querySelectorAll('button').forEach((b) => { b.onclick = () => { this._tool = b.dataset.m; if (this._tab !== 'paint') this._paint(); else this._ui(); }; });
    $.blends.querySelectorAll('button').forEach((b) => { b.onclick = () => { this._add = b.dataset.b === '1'; this._ui(); }; });
    $.pw.onclick = () => this._call('light', this._on ? 'turn_off' : 'turn_on', {});
    $.tune.onclick = () => { $.adv.hidden = !$.adv.hidden; $.tune.classList.toggle('on', !$.adv.hidden); };
    $.fxchip.onclick = () => {
      $.menu.hidden = !$.menu.hidden;
      const sel = !$.menu.hidden && $.menu.querySelector('.on');
      if (sel) sel.scrollIntoView({ block: 'nearest' });
    };
    root.addEventListener('pointerdown', (ev) => {
      const path = ev.composedPath();
      if (!$.menu.hidden && !path.includes($.menu) && !path.includes($.fxchip)) $.menu.hidden = true;
    });
    $.br.oninput = () => { this._brDrag = true; $.brv.textContent = $.br.value + '%'; this._req(); };
    $.br.onchange = () => { this._call('light', 'turn_on', { brightness_pct: +$.br.value }); setTimeout(() => { this._brDrag = false; }, 1500); };
    [['op', '%'], ['sz', ''], ['sf', '%']].forEach(([id, u]) => { $[id].oninput = () => { $[id + 'v'].textContent = $[id].value + u; this._req(); }; });
    $.open.onclick = () => { $.mo.hidden = false; };
    $.close.onclick = () => { $.mo.hidden = true; };
    $.mo.onpointerdown = (ev) => { if (ev.target === $.mo) $.mo.hidden = true; };
    $.psave.onclick = () => this._savePreset();
    $.fill.onclick = () => { this._push(); const op = $.op.value / 100; this._col = this._col.map((c) => mix(c, this._cur, op, this._add)); this._changed(true); };
    $.clr.onclick = () => { this._push(); this._col = this._col.map(() => [0, 0, 0]); this._changed(true); };
    $.undo.onclick = () => { if (this._hist.length) { this._col = this._hist.pop(); this._changed(true); } };

    const cv = $.cv;
    cv.onpointerdown = (ev) => {
      const k = this._near(ev); if (k < 0) return;
      if (this._tab !== 'paint') { this._tab = 'paint'; this._ui(); }
      this._push(); this._down = true; this._last = -1; this._carry = null;
      this._base = this._col.map((c) => c.slice()); this._mask.fill(0);
      cv.setPointerCapture(ev.pointerId); this._stroke(k); this._hover = k; this._changed(false);
    };
    cv.onpointermove = (ev) => { const k = this._near(ev); this._hover = k; if (this._down) { this._stroke(k); this._changed(false); } else this._req(); };
    cv.onpointerup = cv.onpointercancel = () => { if (this._down) { this._down = false; this._last = -1; this._changed(true); } };
    cv.onpointerleave = () => { if (!this._down) { this._hover = -1; this._req(); } };

    root.querySelectorAll('input[type=range]').forEach((r) => {
      r._u = () => r.style.setProperty('--p', ((r.value - r.min) / (r.max - r.min) * 100) + '%');
      r.addEventListener('input', r._u); r._u();
    });
    this._ro = new ResizeObserver(() => this._resize());
    this._ro.observe($.cv);
    this._ui();
  }

  async _load() {
    this._loaded = true;
    const store = await lpLoad(this._hass);
    if (this._built) this._renderPresets();
    let hex = store.last[this._cfg.entity] || null;
    if (!hex) { try { hex = localStorage.getItem('led-painter:' + this._cfg.entity); } catch (e) { /* storage blocked */ } }
    if (this._hist.length) return;
    if (hex && hex.length >= 6) this._fromHex(hex); else this._gradient(PRESETS[5][2]);
    this._hist = [];
    this._req();
  }

  // ---------- Home Assistant side ----------

  /** Lights that can be painted: the entity itself, or the members of a light group. */
  _targets() {
    const h = this._hass, c = this._cfg, s = h.states[c.entity], m = s && s.attributes.entity_id;
    const ids = Array.isArray(m) && m.length ? m.filter((e) => e.startsWith('light.')) : [c.entity], out = [];
    const esp = (h.services && h.services.esphome) || {}, suffix = '_' + c.paint_action;
    ids.forEach((id) => {
      const st = h.states[id], list = (st && st.attributes.effect_list) || [];
      const fx = c.paint_effect && list.includes(c.paint_effect) ? c.paint_effect : PAINT_NAMES.find((n) => list.includes(n));
      if (!fx) return;
      const ent = h.entities && h.entities[id], dev = ent && ent.device_id && h.devices && h.devices[ent.device_id];
      const obj = id.split('.')[1], names = dev ? [slug(dev.name || ''), slug(dev.name_by_user || '')] : [];
      const svc = (c.services || {})[id] || Object.keys(esp).find((k) => {
        if (!k.endsWith(suffix)) return false;
        const node = k.slice(0, -suffix.length);
        return names.includes(node) || obj.startsWith(node + '_') || obj.includes('_' + node + '_');
      });
      if (!svc || !esp[svc]) return;
      const z = this._zonesOf(id, ent);
      out.push({ id, svc, fx, z, w: Math.max(1, +((c.members || {})[id]) || z || 1) });
    });
    return out;
  }

  /** LED count reported by the led_painter component of the light's device (0 if unknown). */
  _zonesOf(id, ent) {
    const h = this._hass;
    if (!ent || !ent.device_id || !h.entities) return 0;
    if (this._zreg !== h.entities) { this._zreg = h.entities; this._zid = {}; }
    if (!(id in this._zid)) {
      this._zid[id] = Object.keys(h.entities).find((e) => e.startsWith('sensor.') && e.endsWith('_painter_zones') && h.entities[e].device_id === ent.device_id) || null;
    }
    const s = this._zid[id] && h.states[this._zid[id]], n = s ? parseInt(s.state, 10) : 0;
    return n > 0 ? n : 0;
  }

  _n() { return this._zones || this._cfg.led_count; }

  _call(domain, service, data) {
    return this._hass.callService(domain, service, Object.assign({ entity_id: this._cfg.entity }, data)).catch((e) => { this._err = (e && e.message) || String(e); this._sync(); });
  }

  _isPaint(effect) { return !!effect && (effect === this._cfg.paint_effect || PAINT_NAMES.includes(effect)); }

  _paint() { this._tab = 'paint'; this._sync(); this._send(); }

  _fx(v) {
    if (this._isPaint(v) && this._targets().length) this._paint();
    else this._call('light', 'turn_on', { effect: v });
  }

  _send() {
    if (this._tab !== 'paint' || !this._hass) return;
    const h = this._hass, tg = this._targets();
    if (!tg.length) return;
    const hex = this._hex(), N = this._n(), total = tg.reduce((s, t) => s + t.w, 0), now = Date.now();
    const fail = (e) => { this._err = (e && e.message) || String(e); this._sync(); };
    this._err = null;
    let acc = 0;
    tg.forEach((t) => {
      const a = Math.round(acc / total * N); acc += t.w;
      const colors = hex.slice(a * 6, Math.max(a + 1, Math.round(acc / total * N)) * 6);
      if (!colors) return;
      const st = h.states[t.id];
      if ((!st || st.state !== 'on' || st.attributes.effect !== t.fx) && now - (this._armT[t.id] || 0) > 2000) {
        this._armT[t.id] = now; window.__lpSelf = now;
        h.callService('light', 'turn_on', { entity_id: t.id, effect: t.fx }).catch(fail);
      }
      h.callService('esphome', t.svc, { colors }).catch(fail);
    });
  }

  // ---------- UI state ----------

  _pick(rgb, el, apply) {
    this._cur = rgb.map(Math.round);
    this._$.sws.querySelectorAll('.on').forEach((x) => x.classList.remove('on'));
    if (el) el.classList.add('on');
    if (apply && this._tab === 'fx') this._call('light', 'turn_on', { rgb_color: this._cur });
    if (this._tool === 'erase') { this._tool = 'paint'; this._ui(); }
  }

  _ui() {
    const $ = this._$, p = this._tab === 'paint';
    $.tools.querySelectorAll('button').forEach((b) => b.classList.toggle('on', p && b.dataset.m === this._tool));
    $.blends.querySelectorAll('button').forEach((b) => b.classList.toggle('on', b.dataset.b === (this._add ? '1' : '0')));
    this.shadowRoot.querySelectorAll('.ptool').forEach((e) => { e.hidden = !p; });
  }

  _sync() {
    if (!this._built || !this._hass) return;
    const $ = this._$, t = this._t, c = this._cfg, s = this._hass.states[c.entity], a = s ? s.attributes : {};
    const ok = !!s && s.state !== 'unavailable', on = ok && s.state === 'on';
    const tg = this._targets();
    this._zones = tg.length && tg.every((x) => x.z) ? tg.reduce((n, x) => n + x.z, 0) : 0;
    const mode = !on ? 'off' : this._isPaint(a.effect) ? 'paint' : 'fx';
    if (mode !== this._mode) { if (mode !== 'off') this._tab = mode; this._mode = mode; }
    this._on = on; this._rgb = a.rgb_color || [255, 255, 255];

    const pct = on && a.brightness ? Math.max(1, Math.round(a.brightness / 2.55)) : 100;
    const label = (e) => (e === 'None' ? t.none : this._isPaint(e) ? t.painting : e);
    const big = !s ? t.notFound : !ok ? t.unavailable : !on ? t.off : mode === 'paint' ? t.painting : a.effect && a.effect !== 'None' ? a.effect : t.on;
    const sub = on ? pct + '%' + (mode === 'paint' && (this._zones || !c._auto) ? ' · ' + this._n() + ' ' + t.zones : '') + (tg.length > 1 ? ' · ' + tg.length + ' ' + t.lights : '') : '';
    $.big.textContent = big; $.st2.textContent = sub;
    $.name.textContent = c.name || a.friendly_name || c.entity;
    $.st.textContent = sub ? big + ' · ' + sub : big;
    $.ic.classList.toggle('on', on);
    if (!this._brDrag) { $.br.value = pct; $.brv.textContent = pct + '%'; $.br._u(); }

    const list = a.effect_list || [], cur = a.effect || 'None', key = list.join('|');
    if (key !== this._fxKey) {
      this._fxKey = key; $.menu.innerHTML = '';
      list.forEach((e) => {
        const b = document.createElement('button'); b.dataset.f = e; b.textContent = label(e);
        b.onclick = () => { $.menu.hidden = true; this._fx(e); };
        $.menu.appendChild(b);
      });
    }
    $.menu.querySelectorAll('button').forEach((b) => b.classList.toggle('on', on && b.dataset.f === cur));
    $.fxv.textContent = on ? label(cur) : '—';
    $.fxchip.hidden = !list.length;

    const noPaint = this._tab === 'paint' && !tg.length;
    $.warn.hidden = !(noPaint || this._err);
    $.warn.textContent = this._err ? t.error + ': ' + this._err : t.noPaint;
    this._ui(); this._req();
  }

  // ---------- presets ----------

  _renderPresets() {
    const $ = this._$, mine = (LP_STORE.data && LP_STORE.data.presets) || [];
    $.mygrid.innerHTML = ''; $.gl1.hidden = !mine.length;
    mine.forEach((p, n) => {
      const b = document.createElement('button'), s = document.createElement('span'), x = document.createElement('i');
      b.style.background = 'linear-gradient(to right,' + (p.c.match(/.{6}/g) || ['000000', '000000']).map((h) => '#' + h).join(',') + ')';
      s.textContent = p.n; x.textContent = '×'; x.title = this._t.deletePreset; b.appendChild(s); b.appendChild(x);
      x.onclick = (ev) => { ev.stopPropagation(); mine.splice(n, 1); lpSave(this._hass); this._renderPresets(); };
      b.onclick = () => { $.mo.hidden = true; this._push(); this._fromHex(p.c); this._tab = 'paint'; this._changed(true); this._sync(); };
      $.mygrid.appendChild(b);
    });
  }

  _savePreset() {
    const $ = this._$, d = LP_STORE.data || (LP_STORE.data = { presets: [], last: {} }), M = this._M, S = 32;
    let c = '';
    for (let k = 0; k < S; k++) { const px = this._col[Math.min(M - 1, Math.round(k / (S - 1) * (M - 1)))]; c += h2(px[0]) + h2(px[1]) + h2(px[2]); }
    d.presets.unshift({ n: $.pname.value.trim() || 'Preset ' + (d.presets.length + 1), c });
    $.pname.value = ''; lpSave(this._hass); this._renderPresets();
  }

  // ---------- drawing ----------

  _req() { if (!this._raf) this._raf = requestAnimationFrame(() => this._draw()); }

  _css(c) { const b = 0.35 + 0.65 * (this._$.br.value / 100); return 'rgb(' + c.map((v) => Math.round(44 + v * b * 211 / 255)).join(',') + ')'; }

  _shown(i) {
    if (this._tab === 'paint') return this._col[i];
    return this._on ? this._rgb : [0, 0, 0];
  }

  _draw() {
    this._raf = 0;
    const $ = this._$, cv = $.cv; if (!cv.width) return;
    const cx = cv.getContext('2d'), s = cv.width / W, M = this._M, pts = this._pts;
    cx.setTransform(s, 0, 0, s, 0, 0); cx.clearRect(0, 0, W, this._H);
    for (let i = 0; i < M; i++) { cx.fillStyle = this._css(this._shown(i)); cx.beginPath(); cx.arc(pts[i][0], pts[i][1], 14, 0, 6.2832); cx.fill(); }
    if (this._hover >= 0 && this._tab === 'paint') {
      const h = Math.round($.sz.value / STEP / 2);
      cx.strokeStyle = 'rgba(255,255,255,.9)'; cx.lineWidth = 2;
      [pts[Math.max(0, this._hover - h)], pts[Math.min(M - 1, this._hover + h)]].forEach((p) => { cx.beginPath(); cx.arc(p[0], p[1], 5, 0, 6.2832); cx.stroke(); });
    }
    const lc = $.lc, lx = lc.getContext('2d'), N = this._n(), cw = lc.width / N, gap = cw > 6 ? 2 : 0;
    lx.clearRect(0, 0, lc.width, lc.height);
    const leds = this._leds((i) => this._shown(i));
    for (let k = 0; k < N; k++) { lx.fillStyle = this._css(leds[k]); lx.fillRect(k * cw, 0, Math.max(1, cw - gap), lc.height); }
  }

  /** Average the smooth painting down to one colour per zone. */
  _leds(get) {
    const N = this._n(), M = this._M, out = [];
    for (let k = 0; k < N; k++) {
      const a = Math.min(M - 1, Math.floor(k * M / N)), b = Math.min(M, Math.max(a + 1, Math.floor((k + 1) * M / N))), q = [0, 0, 0];
      for (let i = a; i < b; i++) { const c = get(i); q[0] += c[0]; q[1] += c[1]; q[2] += c[2]; }
      out.push(q.map((v) => v / (b - a)));
    }
    return out;
  }

  _hex() { return this._leds((i) => this._col[i]).map((c) => h2(c[0]) + h2(c[1]) + h2(c[2])).join(''); }

  _fromHex(hex) {
    const n = Math.floor(hex.length / 6), px = [];
    for (let k = 0; k < n; k++) px.push([0, 2, 4].map((o) => parseInt(hex.substr(k * 6 + o, 2), 16) || 0));
    const M = this._M;
    this._col = this._pts.map((_, i) => {
      const p = Math.max(0, Math.min(n - 1, (i + 0.5) * n / M - 0.5)), a = Math.min(n - 1, Math.floor(p)), b = Math.min(n - 1, a + 1), t = p - a;
      return px[a].map((v, j) => v + (px[b][j] - v) * t);
    });
  }

  _gradient(stops) {
    const h = stops.map(hex2rgb), S = h.length - 1, M = this._M;
    this._col = this._pts.map((_, k) => { const p = k / (M - 1) * S, a = Math.min(S - 1, Math.floor(p)), t = p - a; return h[a].map((v, j) => v + (h[a + 1][j] - v) * t); });
  }

  _push() { this._hist.push(this._col.map((c) => c.slice())); if (this._hist.length > 30) this._hist.shift(); }

  _near(ev) {
    const r = this._$.cv.getBoundingClientRect(), x = (ev.clientX - r.left) * W / r.width, y = (ev.clientY - r.top) * W / r.width, pts = this._pts;
    let best = -1, bd = 2025;
    for (let i = 0; i < this._M; i++) { const dx = pts[i][0] - x, dy = pts[i][1] - y, d = dx * dx + dy * dy; if (d < bd) { bd = d; best = i; } }
    return best;
  }

  _fall(i, k, h) { const soft = this._$.sf.value / 100, d = Math.abs(i - k) / h, a = soft <= 0 ? (d <= 1 ? 1 : 0) : Math.min(1, Math.max(0, (1 - d) / soft)); return a * a * (3 - 2 * a); }

  _dab(k) {
    const $ = this._$, M = this._M, col = this._col, h = $.sz.value / STEP / 2, op = $.op.value / 100;
    const lo = Math.max(0, Math.floor(k - h)), hi = Math.min(M - 1, Math.ceil(k + h));
    if (this._tool === 'smudge') {
      const kk = Math.max(0, Math.min(M - 1, Math.round(k)));
      if (!this._carry) this._carry = col[kk].slice();
      for (let i = lo; i <= hi; i++) col[i] = mix(col[i], this._carry, this._fall(i, k, h) * op * 0.6, false);
      this._carry = mix(this._carry, col[kk], 0.12, false);
      return;
    }
    const erase = this._tool === 'erase', t = erase ? [0, 0, 0] : this._cur;
    for (let i = lo; i <= hi; i++) {
      const a = this._fall(i, k, h);
      if (a > this._mask[i]) this._mask[i] = a;
      if (this._mask[i] > 0) col[i] = mix(this._base[i], t, this._mask[i] * op, !erase && this._add);
    }
  }

  _stroke(k) {
    if (k < 0) return;
    if (this._last >= 0 && Math.abs(k - this._last) < 120) { const d = k > this._last ? 1 : -1; for (let i = this._last + d * 3; d * (k - i) > 0; i += d * 3) this._dab(i); }
    this._dab(k); this._last = k;
  }

  _changed(final) {
    this._req();
    if (final) {
      const hex = this._hex();
      try { localStorage.setItem('led-painter:' + this._cfg.entity, hex); } catch (e) { /* storage blocked */ }
      if (LP_STORE.data && this._hass) { LP_STORE.data.last[this._cfg.entity] = hex; lpSave(this._hass); }
    }
    if (this._sendT) { this._sendAgain = true; return; }
    this._send();
    this._sendT = setTimeout(() => { this._sendT = 0; if (this._sendAgain) { this._sendAgain = false; this._changed(false); } }, 70);
  }
}

if (!customElements.get('led-painter-card')) customElements.define('led-painter-card', LedPainterCard);

/* ---------- paint dialog ----------
 * Opens when the paint effect is chosen anywhere in Home Assistant, and replaces the
 * more-info dialog while a light is in that effect. */
const lpOpen = (entityId) => {
  const h = lpHass();
  if (!h || !h.states[entityId]) return;
  const old = document.querySelector('led-painter-dialog');
  if (old) old.remove();
  const ha = document.querySelector('home-assistant'), mi = ha && ha.shadowRoot && ha.shadowRoot.querySelector('ha-more-info-dialog');
  if (mi && typeof mi.closeDialog === 'function') { try { mi.closeDialog(); } catch (e) { /* dialog not open */ } }
  const dlg = document.createElement('led-painter-dialog');
  dlg.entity = entityId;
  document.body.appendChild(dlg);
};

const DIALOG_STYLE = `
.bg{position:fixed;inset:0;z-index:9999;background:var(--mdc-dialog-scrim-color,rgba(0,0,0,.5));display:flex;align-items:flex-start;justify-content:center;overflow:auto;padding:48px 12px;box-sizing:border-box}
.box{width:100%;max-width:560px;background:var(--ha-dialog-surface-background,var(--card-background-color,#fff));border-radius:var(--ha-dialog-border-radius,28px);overflow:hidden;box-shadow:0 8px 32px rgba(0,0,0,.35)}
.bar{display:flex;align-items:center;gap:8px;padding:12px 12px 8px;color:var(--primary-text-color)}
.bar button{cursor:pointer;border:none;background:transparent;color:inherit;width:48px;height:48px;border-radius:50%;display:flex;align-items:center;justify-content:center;flex:none}
.bar button:hover{background:rgba(127,127,127,.15)}
.tt{flex:1;min-width:0}
.bc{font-size:12px;line-height:16px;color:var(--secondary-text-color)}
.ti{font-size:22px;line-height:28px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
@media(max-width:600px){.bg{padding:0}.box{max-width:none;min-height:100%;border-radius:0}}
`;

class LedPainterDialog extends HTMLElement {
  connectedCallback() {
    if (this._card) return;
    const h = lpHass(), t = lpText(h), root = this.attachShadow({ mode: 'open' });
    root.innerHTML = '<style>' + DIALOG_STYLE + '</style><div class="bg"><div class="box"><div class="bar">'
      + '<button id="x" title="' + t.close + '"><ha-icon icon="mdi:close"></ha-icon></button>'
      + '<div class="tt"><div class="bc" id="bc"></div><div class="ti" id="ti"></div></div>'
      + '<button id="more" title="' + t.details + '"><ha-icon icon="mdi:information-outline"></ha-icon></button></div></div></div>';
    const known = (window.__lpCfg || {})[this.entity];
    const card = this._card = document.createElement('led-painter-card');
    card.setConfig(Object.assign({}, known || {}, { entity: this.entity, _dialog: true, _auto: !known }));
    card.setAttribute('dialog', '');
    root.querySelector('.box').appendChild(card);

    const st = h.states[this.entity], en = h.entities && h.entities[this.entity];
    const dv = en && en.device_id && h.devices && h.devices[en.device_id], ar = h.areas && h.areas[(en && en.area_id) || (dv && dv.area_id)];
    root.getElementById('ti').textContent = (st && st.attributes.friendly_name) || this.entity;
    root.getElementById('bc').textContent = [ar && ar.name, dv && (dv.name_by_user || dv.name)].filter(Boolean).join(' › ');

    const bg = root.querySelector('.bg');
    bg.addEventListener('pointerdown', (ev) => { if (ev.target === bg) this.remove(); });
    root.getElementById('x').onclick = () => this.remove();
    root.getElementById('more').onclick = () => {
      this.remove(); window.__lpBypass = true;
      document.querySelector('home-assistant').dispatchEvent(new CustomEvent('hass-more-info', { detail: { entityId: this.entity }, bubbles: true, composed: true }));
    };
    this._key = (ev) => { if (ev.key === 'Escape') this.remove(); };
    window.addEventListener('keydown', this._key);
    const tick = () => { const now = lpHass(); if (now && now !== this._h) { this._h = now; card.hass = now; } };
    tick(); this._timer = setInterval(tick, 250);
  }

  disconnectedCallback() { clearInterval(this._timer); window.removeEventListener('keydown', this._key); }
}
if (!customElements.get('led-painter-dialog')) customElements.define('led-painter-dialog', LedPainterDialog);

if (!window.__lpHooks) {
  window.__lpHooks = true;
  // While a light is in the paint effect, open the paint dialog instead of more-info.
  window.addEventListener('hass-more-info', (ev) => {
    if (window.__lpBypass) { window.__lpBypass = false; return; }
    const id = ev.detail && ev.detail.entityId, h = lpHass(), s = id && h && h.states[id];
    if (!s || !id.startsWith('light.') || s.state !== 'on' || !lpNames().includes(s.attributes.effect)) return;
    ev.stopImmediatePropagation(); ev.stopPropagation();
    lpOpen(id);
  }, true);
  // When this browser selects the paint effect on a light, open the paint dialog.
  const hook = () => {
    const h = lpHass();
    if (!h || !h.connection) { setTimeout(hook, 500); return; }
    const c = h.connection, orig = c.sendMessagePromise.bind(c);
    c.sendMessagePromise = (msg) => {
      try {
        const d = msg && msg.service_data;
        if (msg.type === 'call_service' && msg.domain === 'light' && msg.service === 'turn_on' && d && lpNames().includes(d.effect) && !(Date.now() - (window.__lpSelf || 0) < 1000)) {
          const t = (msg.target && msg.target.entity_id) || d.entity_id, id = Array.isArray(t) ? t[0] : t;
          if (id && !document.querySelector('led-painter-dialog')) setTimeout(() => lpOpen(id), 50);
        }
      } catch (e) { /* never block the call */ }
      return orig(msg);
    };
  };
  hook();
}

window.customCards = window.customCards || [];
if (!window.customCards.some((c) => c.type === 'led-painter-card')) {
  const t = lpText(lpHass());
  window.customCards.push({ type: 'led-painter-card', name: t.cardName, description: t.cardDesc, preview: false });
}
console.info('%c LED-PAINTER-CARD %c ' + VERSION + ' ', 'background:#ffc107;color:#000;font-weight:700', 'background:#333;color:#fff');
