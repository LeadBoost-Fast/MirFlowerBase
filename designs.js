/*!
 * Mirflowers — designs.js
 * Самодостаточный модуль оформления. Подключается одной строкой:
 *   <script src="designs.js"></script>   (перед </body>)
 *
 * Плавающий переключатель (правый край экрана) — 4 режима:
 *   1  Оригинал       — все стили и скрипты модуля полностью выключены
 *   2  Космос         — монохромная «тёмная материя»: stipple-canvas, стеклянные панели, дуга-навигация
 *   3  Матрица        — модульная асимметричная сетка, командный центр с фокусом панелей, боковая шкала
 *   4  Лента          — горизонтальная координатная лента с глубиной по оси Z и линейкой-навигацией
 *
 * Принципы: исходные кнопки, формы, фильтры и обработчики сайта не заменяются и не клонируются —
 * меняется только оформление (CSS поверх разметки) и добавляется своя навигация, которая
 * «нажимает» оригинальные кнопки. MutationObserver следит за динамической подгрузкой
 * разделов (#v, #nav, #m, #tb) и перестраивает навигацию/режимные признаки для любого экрана.
 */
(function () {
  'use strict';
  if (window.__mfDesigns) return;
  window.__mfDesigns = true;

  var KEY = 'mf_design_mode';
  var NAMES = ['Оригинал', 'Космос', 'Матрица', 'Лента'];
  var MONO = 'ui-monospace,"SF Mono",SFMono-Regular,Menlo,Consolas,"Liberation Mono",monospace';
  var SANS = '-apple-system,"SF Pro Text","Inter","Helvetica Neue",system-ui,sans-serif';
  var root = document.documentElement;
  var mode = 1;
  try { mode = parseInt(localStorage.getItem(KEY), 10) || 1; } catch (e) {}
  if (mode < 1 || mode > 4) mode = 1;

  var $ = function (id) { return document.getElementById(id); };
  var esc = function (s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  };
  var reduced = false;
  try { reduced = matchMedia('(prefers-reduced-motion:reduce)').matches; } catch (e) {}

  /* ───────────────────────── CSS ───────────────────────── */

  var NF = ':not([data-dz-view="map"]):not([data-dz-view="chats"]):not([data-dz-view="tc"])';
  var P = function (n) { return 'html[data-dz="' + n + '"][data-dz][data-dz][data-dz]'; };
  var vars = function (o) {
    return Object.keys(o).map(function (k) { return '--' + k + ':' + o[k] + '!important'; }).join(';');
  };

  /* Переключатель — единственный стиль, который живёт и в режиме «Оригинал» */
  var SW_CSS = [
    '#dz-sw{position:fixed;z-index:9500;right:max(8px,env(safe-area-inset-right));top:calc(env(safe-area-inset-top,0px) + 66px);font:500 11px/1 ' + MONO + ';color:#fff;letter-spacing:.06em;-webkit-tap-highlight-color:transparent}',
    '#dz-sw *{box-sizing:border-box;margin:0}',
    '#dz-sw .dz-cur{display:flex;align-items:center;justify-content:center;width:34px;height:34px;min-height:0;padding:0;border:1px solid rgba(255,255,255,.24);border-radius:6px;background:rgba(18,18,18,.8);color:#fff;-webkit-backdrop-filter:blur(10px);backdrop-filter:blur(10px);cursor:pointer;opacity:.7;transition:opacity .2s;font:inherit}',
    '#dz-sw:hover .dz-cur,#dz-sw[data-open="1"] .dz-cur{opacity:1}',
    '#dz-sw .dz-opts{display:none;position:absolute;right:0;top:40px;min-width:158px;border:1px solid rgba(255,255,255,.24);border-radius:6px;background:rgba(14,14,14,.94);-webkit-backdrop-filter:blur(14px);backdrop-filter:blur(14px);overflow:hidden}',
    '#dz-sw[data-open="1"] .dz-opts{display:block}',
    '#dz-sw .dz-opts button{display:flex;gap:10px;align-items:center;width:100%;min-height:42px;padding:11px 12px;border:0;border-bottom:1px solid rgba(255,255,255,.1);border-radius:0;background:transparent;color:rgba(255,255,255,.64);text-align:left;font:inherit;cursor:pointer}',
    '#dz-sw .dz-opts button:last-child{border-bottom:0}',
    '#dz-sw .dz-opts button b{font-weight:600;opacity:.7}',
    '#dz-sw .dz-opts button.on{background:#fff;color:#050505}'
  ].join('\n');

  /* Общая «взрослая» оболочка компонентов для режимов 2–4 */
  function pro(p, t) {
    var inp = p + ' input:not([type=checkbox]):not([type=radio]):not([type=range]):not([type=file]):not([type=color]):not([type=button]):not([type=submit])';
    return [
      p + '{' + vars(t.v) + ';color-scheme:' + t.scheme + '}',
      p + ' body{color:' + t.ink + '!important;font-family:' + SANS + '!important;-webkit-font-smoothing:antialiased}',
      p + ' #nav{position:fixed!important;left:-9999px!important;top:0!important;width:1px!important;height:1px!important;overflow:hidden!important;opacity:0!important;pointer-events:none!important}',
      p + ' .deco{display:none!important}',
      p + ' ::selection{background:' + t.ink + ';color:' + t.bg + '}',
      /* типографика */
      p + ' h1{' + t.h1 + '}',
      p + ' h2{' + t.h2 + '}',
      p + ' .mut{color:' + t.mut + '!important}',
      p + ' a{color:' + t.ink + ';text-underline-offset:3px;text-decoration-color:' + t.line + '}',
      p + ' hr{border:0;border-top:1px solid ' + t.line + '}',
      /* панели */
      p + ' .card,' + p + ' .tile{background:' + t.panel + '!important;border:' + t.panelBd + '!important;border-radius:' + t.r + '!important;box-shadow:none!important;-webkit-backdrop-filter:' + t.blur + '!important;backdrop-filter:' + t.blur + '!important}',
      p + ' .tile[data-k]{background:' + t.panel + '!important}',
      p + ' .tile b,' + p + ' .tile[data-k] b{color:' + t.ink + '!important;font:' + t.num + '!important;white-space:nowrap}',
      p + ' .tile span{font:' + t.micro + '!important;letter-spacing:.14em;text-transform:uppercase;color:' + t.mut + '!important}',
      p + ' .dl.up{color:' + t.ink + '!important}',
      p + ' .dl.dn{color:' + t.mut + '!important}',
      /* статусы */
      p + ' .pill{background:transparent!important;color:' + t.ink + '!important;border:1px solid ' + t.pillBd + '!important;border-radius:' + t.pr + '!important;font:' + t.micro + '!important;letter-spacing:.12em;text-transform:uppercase;padding:3px 8px}',
      p + ' .pill.ok{background:' + t.okBg + '!important;color:' + t.okFg + '!important;border-color:' + t.okFg + '!important}',
      p + ' .pill.warn{border-style:dashed!important;color:' + t.warnFg + '!important;border-color:' + t.warnFg + '!important}',
      p + ' .pill.bad{background:' + t.badBg + '!important;color:' + t.badFg + '!important;border-color:' + t.badBg + '!important}',
      p + ' .nb,' + p + ' #tb .tbn{background:' + t.nb + '!important;color:' + t.nbFg + '!important;box-shadow:none!important;border-radius:' + t.pr + '!important}',
      /* кнопки */
      p + ' .btn{background:' + t.btn + '!important;color:' + t.btnFg + '!important;border:1px solid ' + t.btn + '!important;border-radius:' + t.r + '!important;font:' + t.btnFont + '!important;letter-spacing:' + t.btnLs + ';text-transform:' + t.btnTt + ';min-height:44px;box-shadow:none!important;transition:opacity .15s,background .15s,color .15s,border-color .15s}',
      p + ' .btn:active{opacity:.72}',
      p + ' .btn.g{background:' + t.gBg + '!important;color:' + t.ink + '!important;border:1px solid ' + t.line2 + '!important}',
      p + ' .btn.r{background:transparent!important;color:' + t.rFg + '!important;border:1px ' + t.rBs + ' ' + t.rFg + '!important}',
      p + ' .btn.s{min-height:36px;padding:8px 12px}',
      p + ' .btn[disabled],' + p + ' .btn:disabled{opacity:.35}',
      '@media (hover:hover){' + p + ' .btn:not(.g):not(.r):hover{background:transparent!important;color:' + t.ink + '!important;border-color:' + t.ink + '!important}' + p + ' .btn.g:hover{border-color:' + t.ink + '!important}}',
      /* поля */
      p + ' label{font:' + t.micro + '!important;letter-spacing:.14em;text-transform:uppercase;color:' + t.mut + '!important}',
      inp + ',' + p + ' select,' + p + ' textarea{background:' + t.inBg + '!important;border:1px solid ' + t.inBd + '!important;border-radius:' + t.r + '!important;color:' + t.ink + '!important;box-shadow:none!important}',
      inp + ':focus,' + p + ' select:focus,' + p + ' textarea:focus{border-color:' + t.ink + '!important;outline:none!important}',
      p + ' ::placeholder{color:' + t.mut + '!important;opacity:.7}',
      p + ' select option{background:' + t.bg + ';color:' + t.ink + '}',
      p + ' input[type=checkbox],' + p + ' input[type=radio],' + p + ' input[type=range]{accent-color:' + t.ink + '}',
      /* фильтры-чипы */
      p + ' .chip{background:transparent!important;border:1px solid ' + t.line2 + '!important;color:' + t.mut + '!important;border-radius:' + t.r + '!important;font:' + t.micro + '!important;letter-spacing:.12em;text-transform:uppercase;padding:9px 13px;min-height:36px;box-shadow:none!important}',
      p + ' .chip.on{background:' + t.ink + '!important;color:' + t.bg + '!important;border-color:' + t.ink + '!important}',
      p + ' .chips{scrollbar-width:none}',
      p + ' .chips::-webkit-scrollbar{display:none}',
      /* строки, графики, таблицы */
      p + ' .ln{border-bottom:1px dotted ' + t.line + '!important}',
      p + ' .hb .t{height:3px!important;border-radius:0!important;background:' + t.line + '!important}',
      p + ' .hb .t b{border-radius:0!important;background:' + t.ink + '!important}',
      p + ' .ch text{fill:' + t.mut + '!important}',
      p + ' .ch text.v,' + p + ' .ch text.tdy{fill:' + t.ink + '!important}',
      p + ' table{width:100%;border-collapse:collapse;font-size:13px;display:block;overflow-x:auto;max-width:100%}',
      p + ' th{font:' + t.micro + ';letter-spacing:.14em;text-transform:uppercase;color:' + t.mut + ';text-align:left;padding:8px 6px;border-bottom:1px solid ' + t.line2 + '}',
      p + ' td{padding:9px 6px;border-bottom:1px solid ' + t.line + '}',
      p + ' .th,' + p + ' .fl{border-radius:' + t.r + '!important}',
      /* меню «Ещё» */
      p + ' .mg button{background:' + t.panel + '!important;border:' + t.panelBd + '!important;border-radius:' + t.r + '!important;color:' + t.ink + '!important;box-shadow:none!important;font:' + t.micro + '!important;letter-spacing:.1em;text-transform:uppercase;min-height:78px;-webkit-backdrop-filter:' + t.blur + ';backdrop-filter:' + t.blur + '}',
      /* верхняя панель */
      p + ' #tb{background:' + t.tb + '!important;border-bottom:1px solid ' + t.line + '!important;color:' + t.ink + '!important;box-shadow:none!important;-webkit-backdrop-filter:blur(12px);backdrop-filter:blur(12px)}',
      p + ' #tb .tbb{color:' + t.ink + '!important;background:transparent!important;border-radius:' + t.r + '!important;box-shadow:none!important}',
      p + ' #tb .tba{background:transparent!important;color:' + t.ink + '!important;border:1px solid ' + t.line2 + '!important;border-radius:50%!important;box-shadow:none!important;font:500 12px ' + MONO + '!important}',
      p + ' #tb .tbn2 b{font:500 12px ' + MONO + '!important;letter-spacing:.26em;text-transform:uppercase}',
      /* всплывающие элементы */
      p + ' #toast{background:' + t.toast + '!important;color:' + t.toastFg + '!important;border:1px solid ' + t.line2 + ';border-radius:' + t.r + '!important;font:12px/1.4 ' + MONO + '!important;letter-spacing:.04em;box-shadow:none!important;-webkit-backdrop-filter:blur(12px);backdrop-filter:blur(12px)}',
      p + ' .ov{background:' + t.ov + '!important}',
      p + ' .sh{background:' + t.sheet + '!important;color:' + t.ink + '!important;border:1px solid ' + t.line2 + '!important;border-radius:' + t.rs + '!important;box-shadow:none!important;-webkit-backdrop-filter:blur(14px)!important;backdrop-filter:blur(14px)!important}',
      p + ' #askov{background:' + t.ov + '!important}',
      p + ' #askov .askb{background:' + t.sheet + '!important;color:' + t.ink + '!important;border:1px solid ' + t.line2 + '!important;border-radius:' + t.r + '!important;box-shadow:none!important;-webkit-backdrop-filter:blur(14px);backdrop-filter:blur(14px)}',
      p + ' .fab{box-shadow:none!important;border-radius:' + t.r + '!important}',
      p + ' *{scrollbar-width:thin;scrollbar-color:' + t.line2 + ' transparent}'
    ].join('\n');
  }

  /* ── Режим 2: Монохромный космос ── */
  function css2() {
    var p = P(2);
    var t = {
      scheme: 'dark', bg: '#050505', ink: '#fff', mut: 'rgba(255,255,255,.6)', line: 'rgba(255,255,255,.12)', line2: 'rgba(255,255,255,.28)',
      v: { bg: '#050505', card: '#0b0b0b', c2: 'rgba(255,255,255,.08)', ink: '#fff', mut: 'rgba(255,255,255,.6)', line: 'rgba(255,255,255,.16)', ac: '#fff', on: '#050505', ok: '#fff', warn: 'rgba(255,255,255,.75)', bad: '#fff', glass: 'rgba(8,8,8,.6)', sh: 'none', k: '#fff', gb: 'rgba(255,255,255,.16)', gr: '2px', s0: '#fff', s1: 'rgba(255,255,255,.78)', s2: 'rgba(255,255,255,.58)', s3: 'rgba(255,255,255,.42)', s4: 'rgba(255,255,255,.3)', s5: 'rgba(255,255,255,.2)' },
      h1: 'font:300 13px/1.3 ' + MONO + '!important;letter-spacing:.28em;text-transform:uppercase;color:#fff;margin:20px 2px 14px',
      h2: 'font:500 10px/1.3 ' + MONO + '!important;letter-spacing:.22em;text-transform:uppercase;color:rgba(255,255,255,.5)!important;margin:26px 2px 10px',
      panel: 'rgba(10,10,10,.52)', panelBd: '1px solid rgba(255,255,255,.16)', blur: 'blur(12px)', r: '2px', rs: '2px', pr: '2px',
      num: '300 24px/1.1 ' + MONO, micro: '500 10px/1.3 ' + MONO,
      pillBd: 'rgba(255,255,255,.3)', okBg: 'rgba(255,255,255,.14)', okFg: '#fff', warnFg: 'rgba(255,255,255,.8)', badBg: '#fff', badFg: '#050505',
      nb: '#fff', nbFg: '#050505',
      btn: '#fff', btnFg: '#050505', btnFont: '600 11px/1 ' + MONO, btnLs: '.14em', btnTt: 'uppercase', gBg: 'transparent', rFg: 'rgba(255,255,255,.85)', rBs: 'dashed',
      inBg: 'rgba(255,255,255,.05)', inBd: 'rgba(255,255,255,.16)',
      tb: 'rgba(5,5,5,.55)', toast: 'rgba(10,10,10,.85)', toastFg: '#fff', ov: 'rgba(0,0,0,.62)', sheet: 'rgba(9,9,9,.8)'
    };
    var L = function (pos, w, h) { return 'linear-gradient(#fff,#fff) ' + pos + '/' + w + 'px ' + h + 'px no-repeat'; };
    var marks = [L('left top', 10, 1), L('left top', 1, 10), L('right top', 10, 1), L('right top', 1, 10), L('left bottom', 10, 1), L('left bottom', 1, 10), L('right bottom', 10, 1), L('right bottom', 1, 10)].join(',');
    var lbl = function (sel, s) { return p + ' #v>.card' + sel + '::after{content:"N° " counter(dzc,decimal-leading-zero) "  ·  ' + s + '"}'; };
    return pro(p, t) + '\n' + [
      'html[data-dz="2"]{background:#050505!important}',
      p + ' body{background:transparent!important;padding-bottom:calc(124px + env(safe-area-inset-bottom))!important}',
      '#dz-cv{position:fixed;left:0;top:0;width:100%;height:100%;z-index:-1;pointer-events:none;display:block}',
      p + ' #v{counter-reset:dzc}',
      p + ' #v>h1::after{content:"";display:inline-block;width:48px;height:1px;margin-left:14px;vertical-align:middle;background:rgba(255,255,255,.4)}',
      /* стеклянные панели с угловыми метками */
      p + ' .card,' + p + ' .tile{position:relative!important}',
      p + ' .card::before,' + p + ' .tile::before{content:"";position:absolute;left:-1px;top:-1px;right:-1px;bottom:-1px;pointer-events:none;z-index:1;opacity:.85;background:' + marks + '}',
      p + ' #v>.card{counter-increment:dzc;margin-top:18px!important;margin-bottom:12px!important;transition:border-color .25s}',
      p + ' #v>.card::after{position:absolute;top:-5px;left:14px;padding:0 6px;background:#050505;font:500 7.5px/1 ' + MONO + ';letter-spacing:.16em;text-transform:uppercase;color:rgba(255,255,255,.46);z-index:2;pointer-events:none;white-space:nowrap}',
      lbl(':nth-child(4n+1)', 'α 04h 12m  ·  δ +12.4°'),
      lbl(':nth-child(4n+2)', 'α 11h 48m  ·  δ −08.1°'),
      lbl(':nth-child(4n+3)', 'α 17h 45m  ·  δ −29.0°'),
      lbl(':nth-child(4n+4)', 'α 23h 07m  ·  δ +41.2°'),
      '@media (hover:hover){' + p + ' .card:hover{border-color:rgba(255,255,255,.4)!important}}',
      /* убираем любые цвета: всё строго серое */
      p + ' img,' + p + ' svg,' + p + ' .ch,' + p + ' [style*="#"],' + p + ' [style*="rgb"],' + p + ' [style*="hsl"],' + p + ' [style*="color-mix"]{filter:grayscale(1)}',
      p + ' img.th,' + p + ' .th,' + p + ' .fl{filter:grayscale(1) contrast(1.08)}',
      p + ' .fab{bottom:calc(120px + env(safe-area-inset-bottom))!important}',
      p + ' #toast{bottom:calc(124px + env(safe-area-inset-bottom))!important}',
      p + ' .sh{border-top:1px solid #fff!important}',
      /* навигация — гравитационная дуга */
      p + ' #dz-nav{display:block;position:fixed;left:0;right:0;bottom:0;z-index:30;height:calc(98px + env(safe-area-inset-bottom));pointer-events:none}',
      p + ' #dz-nav[hidden]{display:none}',
      p + ' #dz-nav::before{content:"";position:absolute;left:0;right:0;bottom:0;top:0;pointer-events:none;background:linear-gradient(to top,#050505 0%,rgba(5,5,5,.78) 55%,rgba(5,5,5,0) 100%)}',
      p + ' #dz-nav .dz-tr{position:absolute;left:0;right:0;top:0;bottom:0;overflow-x:auto;overflow-y:hidden;pointer-events:auto;scrollbar-width:none;padding-bottom:env(safe-area-inset-bottom)}',
      p + ' #dz-nav .dz-tr::-webkit-scrollbar{display:none}',
      p + ' #dz-nav .dz-in{position:relative;height:98px}',
      p + ' #dz-nav svg{position:absolute;left:0;top:0;overflow:visible;pointer-events:none}',
      p + ' #dz-nav svg path{fill:none;stroke:rgba(255,255,255,.4);stroke-width:.5}',
      p + ' #dz-nav svg path.t{stroke:rgba(255,255,255,.5);stroke-dasharray:1 7;stroke-width:6;opacity:.35}',
      p + ' #dz-nav .dz-n{position:absolute;transform:translate(-50%,-10px);display:flex;flex-direction:column;align-items:center;gap:7px;min-width:62px;min-height:44px;padding:6px 4px;border:0;border-radius:0;background:transparent;color:rgba(255,255,255,.55);font:500 9px/1 ' + MONO + ';letter-spacing:.14em;text-transform:uppercase;cursor:pointer;transition:color .25s,transform .4s cubic-bezier(.2,.7,.2,1)}',
      p + ' #dz-nav .dz-i{order:3;font-size:7.5px;opacity:.45;letter-spacing:.2em}',
      p + ' #dz-nav .dz-d{order:1;width:7px;height:7px;border:1px solid rgba(255,255,255,.75);border-radius:50%;background:#050505;transition:background .3s,box-shadow .3s}',
      p + ' #dz-nav .dz-l{order:2}',
      p + ' #dz-nav .dz-n.on{color:#fff}',
      p + ' #dz-nav .dz-n.on .dz-d{background:#fff;box-shadow:0 0 0 4px rgba(255,255,255,.12)}',
      p + ' #dz-nav .dz-b{position:absolute;top:0;right:6px;padding:2px 4px;border-radius:2px;background:#fff;color:#050505;font:700 8px/1 ' + MONO + ';letter-spacing:0}',
      '@media (hover:hover){' + p + ' #dz-nav .dz-n:hover{color:#fff;transform:translate(-50%,-14px)}}'
    ].join('\n');
  }

  /* ── Режим 3: Матрица / командный центр ── */
  function css3() {
    var p = P(3), ink = '#121212', paper = '#f3f1ec';
    var t = {
      scheme: 'light', bg: '#e7e4de', ink: ink, mut: '#6b675f', line: 'rgba(18,18,18,.14)', line2: 'rgba(18,18,18,.32)',
      v: { bg: '#e7e4de', card: paper, c2: '#dedad2', ink: ink, mut: '#6b675f', line: '#c9c4ba', ac: ink, on: paper, ok: '#4c5f3a', warn: '#8a6420', bad: '#8c3a31', glass: 'rgba(243,241,236,.92)', sh: 'none', gb: '#c9c4ba', gr: '0px', s0: ink, s1: '#4c5f3a', s2: '#8a6420', s3: '#5f6b78', s4: '#9a958a', s5: '#8c3a31' },
      h1: 'font:600 clamp(30px,4.6vw,46px)/1 ' + SANS + '!important;letter-spacing:-.045em;color:' + ink + ';margin:10px 0 6px',
      h2: 'font:600 10px/1.3 ' + MONO + '!important;letter-spacing:.2em;text-transform:uppercase;color:#6b675f!important;margin:16px 0 0;padding-top:8px;border-top:1px solid ' + ink,
      panel: paper, panelBd: '1px solid rgba(18,18,18,.22)', blur: 'none', r: '0px', rs: '0px', pr: '0px',
      num: '500 26px/1.1 ' + MONO, micro: '600 10px/1.3 ' + MONO,
      pillBd: 'rgba(18,18,18,.4)', okBg: 'transparent', okFg: '#4c5f3a', warnFg: '#8a6420', badBg: '#8c3a31', badFg: '#f3f1ec',
      nb: '#8c3a31', nbFg: '#f3f1ec',
      btn: ink, btnFg: paper, btnFont: '600 13px/1 ' + SANS, btnLs: '.02em', btnTt: 'none', gBg: 'transparent', rFg: '#8c3a31', rBs: 'solid',
      inBg: '#faf9f6', inBd: 'rgba(18,18,18,.28)',
      tb: 'rgba(231,228,222,.92)', toast: ink, toastFg: paper, ov: 'rgba(20,20,20,.38)', sheet: paper
    };
    return pro(p, t) + '\n' + [
      'html[data-dz="3"]{background-color:#e7e4de!important;background-image:radial-gradient(rgba(18,18,18,.13) 1px,transparent 1px)!important;background-size:22px 22px!important;background-attachment:fixed!important}',
      p + ' body{background:transparent!important;padding-bottom:calc(76px + env(safe-area-inset-bottom))!important}',
      p + ' .fab{bottom:calc(70px + env(safe-area-inset-bottom))!important}',
      p + ' #toast{bottom:calc(74px + env(safe-area-inset-bottom))!important}',
      /* матрица */
      p + NF + ' #v{display:grid!important;grid-template-columns:repeat(12,minmax(0,1fr));grid-auto-flow:dense;gap:12px;max-width:1240px!important;margin:0 auto!important;padding:18px 16px 40px!important;counter-reset:dzc}',
      p + NF + ' #v>*{grid-column:1/-1;margin:0!important;min-width:0}',
      p + NF + ' #v>.fab{grid-column:auto}',
      p + ' #v>.card{position:relative;counter-increment:dzc;padding:18px 16px 14px!important;transition:opacity .2s,outline-color .2s}',
      p + ' #v>.card::before{content:counter(dzc,decimal-leading-zero);position:absolute;top:0;right:0;padding:3px 7px;background:' + ink + ';color:' + paper + ';font:600 9px/1.2 ' + MONO + ';letter-spacing:.12em}',
      p + ' .tiles{gap:0!important;border:1px solid rgba(18,18,18,.22)}',
      p + ' .tiles .tile{border:0!important;border-right:1px solid rgba(18,18,18,.16)!important;margin:0!important}',
      p + ' .tiles .tile:last-child{border-right:0!important}',
      /* асимметричные модули */
      '@media (min-width:760px){',
      p + NF + ' #v>.card:nth-child(3n+1){grid-column:span 5}',
      p + NF + ' #v>.card:nth-child(3n+2){grid-column:span 7}',
      p + NF + ' #v>.card:nth-child(3n+3){grid-column:span 12}',
      '}',
      '@media (max-width:759px){',
      p + NF + ' #v>.card:nth-child(odd){margin-right:20px!important}',
      p + NF + ' #v>.card:nth-child(even){margin-left:20px!important}',
      '}',
      /* командный центр: смена фокуса панелей */
      '@media (hover:hover){' + p + NF + ' #v:has(>.card:hover)>.card:not(:hover){opacity:.5}}',
      p + NF + ' #v:has(>.card:focus-within)>.card:not(:focus-within){opacity:.55}',
      p + ' #v>.card:hover,' + p + ' #v>.card:focus-within{outline:1px solid ' + ink + ';outline-offset:3px}',
      /* окна */
      p + ' .sh{border-top:1px solid ' + ink + '!important}',
      '@media (min-width:820px){' + p + ' .ov{align-items:stretch!important;justify-content:flex-end!important;padding:0!important}' + p + ' .sh{height:100%!important;max-height:100vh!important;width:min(520px,100vw)!important;max-width:none!important;border-top:0!important;border-left:1px solid ' + ink + '!important}}',
      /* навигация: нижняя индексная лента → боковая шкала */
      p + ' #dz-nav{display:block;position:fixed;left:0;right:0;bottom:0;z-index:30;height:calc(54px + env(safe-area-inset-bottom));padding-bottom:env(safe-area-inset-bottom);background:rgba(231,228,222,.94);-webkit-backdrop-filter:blur(10px);backdrop-filter:blur(10px);border-top:1px solid ' + ink + '}',
      p + ' #dz-nav[hidden]{display:none}',
      p + ' #dz-nav .dz-tr{height:54px;overflow-x:auto;overflow-y:hidden;scrollbar-width:none}',
      p + ' #dz-nav .dz-tr::-webkit-scrollbar{display:none}',
      p + ' #dz-nav .dz-in{display:flex;width:max-content;min-width:100%;height:100%}',
      p + ' #dz-nav .dz-n{position:relative;flex:1 0 auto;display:flex;align-items:center;gap:8px;min-height:44px;padding:0 16px;border:0;border-right:1px solid rgba(18,18,18,.16);border-radius:0;background:transparent;color:' + ink + ';font:600 12px/1 ' + SANS + ';letter-spacing:.02em;white-space:nowrap;cursor:pointer}',
      p + ' #dz-nav .dz-i{font:500 9px/1 ' + MONO + ';opacity:.5;letter-spacing:.1em}',
      p + ' #dz-nav .dz-d{display:none}',
      p + ' #dz-nav .dz-n.on{background:' + ink + ';color:' + paper + '}',
      p + ' #dz-nav .dz-b{padding:2px 5px;background:#8c3a31;color:#fff;font:700 9px/1 ' + MONO + '}',
      '@media (min-width:820px){',
      p + ' body{padding-left:64px!important;padding-bottom:40px!important}',
      p + ' .fab{bottom:24px!important}',
      p + ' #toast{bottom:28px!important}',
      p + ' #dz-nav{left:0;right:auto;top:0;bottom:0;width:64px;height:auto;padding:0;border-top:0;border-right:1px solid ' + ink + '}',
      p + ' #dz-nav .dz-tr{height:100%;overflow-y:auto;overflow-x:hidden}',
      p + ' #dz-nav .dz-in{display:flex;flex-direction:column;width:100%;min-width:0;height:auto;padding-top:56px}',
      p + ' #dz-nav .dz-n{flex:0 0 auto;flex-direction:column;justify-content:flex-start;gap:10px;width:100%;padding:14px 0;border-right:0;border-bottom:1px solid rgba(18,18,18,.16)}',
      p + ' #dz-nav .dz-l{writing-mode:vertical-rl;transform:rotate(180deg);font-size:12px}',
      p + ' #dz-nav .dz-b{position:absolute;top:4px;right:4px}',
      '}'
    ].join('\n');
  }

  /* ── Режим 4: Горизонтальная лента, глубина по оси Z ── */
  function css4() {
    var p = P(4), bone = '#e9e4d8', ink = '#0d1013';
    var t = {
      scheme: 'dark', bg: ink, ink: bone, mut: '#8d939a', line: 'rgba(233,228,216,.12)', line2: 'rgba(233,228,216,.3)',
      v: { bg: ink, card: '#151a1f', c2: '#1d242b', ink: bone, mut: '#8d939a', line: 'rgba(233,228,216,.14)', ac: bone, on: ink, ok: '#9fb59b', warn: '#c8ad79', bad: '#c98a80', glass: 'rgba(21,26,31,.88)', sh: 'none', gb: 'rgba(233,228,216,.14)', gr: '4px', s0: bone, s1: '#9fb59b', s2: '#c8ad79', s3: '#8aa0b5', s4: '#6f7b86', s5: '#c98a80' },
      h1: 'font:500 15px/1.2 ' + SANS + '!important;letter-spacing:.32em;text-transform:uppercase;color:' + bone + ';margin:0',
      h2: 'font:500 10px/1.2 ' + MONO + '!important;letter-spacing:.24em;text-transform:uppercase;color:#8d939a!important;margin:0',
      panel: '#151a1f', panelBd: '1px solid rgba(233,228,216,.14)', blur: 'none', r: '4px', rs: '4px', pr: '3px',
      num: '300 26px/1.1 ' + SANS, micro: '500 10px/1.3 ' + MONO,
      pillBd: 'rgba(233,228,216,.3)', okBg: 'transparent', okFg: '#9fb59b', warnFg: '#c8ad79', badBg: '#c98a80', badFg: ink,
      nb: bone, nbFg: ink,
      btn: bone, btnFg: ink, btnFont: '600 13px/1 ' + SANS, btnLs: '.04em', btnTt: 'none', gBg: 'rgba(233,228,216,.06)', rFg: '#c98a80', rBs: 'solid',
      inBg: 'rgba(233,228,216,.05)', inBd: 'rgba(233,228,216,.18)',
      tb: 'rgba(13,16,19,.9)', toast: '#151a1f', toastFg: bone, ov: 'rgba(6,8,10,.74)', sheet: 'rgba(21,26,31,.96)'
    };
    return pro(p, t) + '\n' + [
      'html[data-dz="4"]{background-color:' + ink + '!important;background-image:repeating-linear-gradient(90deg,rgba(233,228,216,.035) 0,rgba(233,228,216,.035) 1px,transparent 1px,transparent 84px)!important;background-attachment:fixed!important}',
      p + ' body{background:transparent!important;padding-bottom:calc(76px + env(safe-area-inset-bottom))!important}',
      p + ' .fab{bottom:calc(78px + env(safe-area-inset-bottom))!important}',
      p + ' #toast{bottom:calc(82px + env(safe-area-inset-bottom))!important}',
      /* лента */
      p + NF + ' #v{position:fixed!important;left:0;right:0;top:var(--dz-top,56px);bottom:calc(60px + env(safe-area-inset-bottom));display:flex!important;flex-direction:row;align-items:flex-start;gap:14px;max-width:none!important;width:auto!important;margin:0!important;padding:16px 18px!important;overflow-x:auto;overflow-y:hidden;scroll-snap-type:x proximity;scrollbar-width:thin;overscroll-behavior-x:contain;counter-reset:dzc}',
      p + NF + ' #v::before,' + p + NF + ' #v::after{content:"";flex:1 0 0;min-width:0}',
      p + NF + ' #v>*{flex:0 0 min(86vw,360px);min-width:0;max-width:none;max-height:100%;margin:0!important;overflow-y:auto;overflow-x:hidden;scroll-snap-align:center;scrollbar-width:thin}',
      p + NF + ' #v>.fab{flex:none!important;overflow:visible}',
      p + NF + ' #v>h1,' + p + NF + ' #v>h2{flex:0 0 auto;align-self:stretch;writing-mode:vertical-rl;transform:rotate(180deg);padding:4px 12px;border-left:1px solid rgba(233,228,216,.22);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
      p + ' #v>.card{counter-increment:dzc;position:relative}',
      p + ' #v>.card::before{content:"Z." counter(dzc,decimal-leading-zero);position:absolute;top:8px;right:10px;font:500 8px/1 ' + MONO + ';letter-spacing:.2em;color:rgba(233,228,216,.38);pointer-events:none}',
      p + ' #v>.card{border-top:1px solid rgba(233,228,216,.4)!important}',
      /* глубина по оси Z */
      '@keyframes dzz{0%{transform:perspective(900px) translateZ(-110px) rotateY(16deg) scale(.97);opacity:.45}50%{transform:perspective(900px) translateZ(0) rotateY(0) scale(1);opacity:1}100%{transform:perspective(900px) translateZ(-110px) rotateY(-16deg) scale(.97);opacity:.45}}',
      '@supports (animation-timeline:view()){@media (prefers-reduced-motion:no-preference){' + p + NF + ' #v>*:not(h1):not(h2):not(.fab){animation:dzz linear both;animation-timeline:view(inline)}}}',
      /* окна */
      p + ' .ov{align-items:center!important;justify-content:center!important;padding:16px!important;-webkit-backdrop-filter:blur(6px);backdrop-filter:blur(6px)}',
      p + ' .sh{height:auto!important;max-height:88vh!important;width:100%!important;max-width:540px!important;border-top:1px solid ' + bone + '!important}',
      '@keyframes dzin{from{opacity:0;transform:perspective(900px) translateZ(-80px) rotateX(6deg)}}',
      '@media (prefers-reduced-motion:no-preference){' + p + ' .sh{animation:dzin .3s cubic-bezier(.2,.7,.2,1)!important}}',
      /* навигация — координатная линейка */
      p + ' #dz-nav{display:block;position:fixed;left:0;right:0;bottom:0;z-index:30;height:calc(60px + env(safe-area-inset-bottom));padding-bottom:env(safe-area-inset-bottom);background:rgba(13,16,19,.9);-webkit-backdrop-filter:blur(10px);backdrop-filter:blur(10px);border-top:1px solid rgba(233,228,216,.22)}',
      p + ' #dz-nav[hidden]{display:none}',
      p + ' #dz-nav::after{content:"";position:absolute;left:50%;top:0;width:1px;height:12px;background:' + bone + ';pointer-events:none}',
      p + ' #dz-nav .dz-tr{height:60px;overflow-x:auto;overflow-y:hidden;scrollbar-width:none;scroll-snap-type:x proximity}',
      p + ' #dz-nav .dz-tr::-webkit-scrollbar{display:none}',
      p + ' #dz-nav .dz-in{display:flex;width:max-content;min-width:100%;height:100%;padding:0 50vw}',
      p + ' #dz-nav .dz-n{position:relative;flex:0 0 auto;display:flex;flex-direction:column;align-items:center;justify-content:flex-start;gap:5px;min-height:44px;padding:11px 18px 20px;border:0;border-radius:0;background:transparent;color:#8d939a;font:500 10px/1 ' + MONO + ';letter-spacing:.18em;text-transform:uppercase;white-space:nowrap;scroll-snap-align:center;cursor:pointer;transition:color .25s}',
      p + ' #dz-nav .dz-n::after{content:"";position:absolute;left:0;right:0;bottom:0;height:9px;background:repeating-linear-gradient(90deg,rgba(233,228,216,.3) 0,rgba(233,228,216,.3) 1px,transparent 1px,transparent 9px)}',
      p + ' #dz-nav .dz-n::before{content:"";position:absolute;left:0;bottom:0;width:1px;height:16px;background:rgba(233,228,216,.7)}',
      p + ' #dz-nav .dz-i{order:1;font-size:8px;opacity:.55;letter-spacing:.2em}',
      p + ' #dz-nav .dz-l{order:2}',
      p + ' #dz-nav .dz-d{display:none}',
      p + ' #dz-nav .dz-n.on{color:' + bone + '}',
      p + ' #dz-nav .dz-n.on::after{background:repeating-linear-gradient(90deg,' + bone + ' 0,' + bone + ' 1px,transparent 1px,transparent 9px)}',
      p + ' #dz-nav .dz-b{position:absolute;top:6px;right:6px;padding:2px 4px;border-radius:3px;background:' + bone + ';color:' + ink + ';font:700 8px/1 ' + MONO + '}'
    ].join('\n');
  }

  var cssText = { 2: null, 3: null, 4: null };
  function cssFor(n) {
    if (cssText[n] == null) cssText[n] = n === 2 ? css2() : n === 3 ? css3() : css4();
    return cssText[n];
  }

  /* ───────────────────── Космос (canvas) ───────────────────── */

  var Cosmos = (function () {
    var cv = null, ctx = null, w = 0, h = 0, dpr = 1, raf = 0, on = false, t = 0, last = 0;
    var cx = 0, cy = 0, R = 60, s1 = 200, s2 = 120;
    var mx = 0, my = 0, tx = 0, ty = 0, ptrT = 0, wx = 0, wy = 0;
    var Q = 1, D = null, G = null, RG = null, S = null, B = [];
    var LV = [0, 0.2, 0.34, 0.52, 0.74, 0.95];
    var bound = false;

    function mulberry(a) {
      return function () {
        a |= 0; a = (a + 0x6D2B79F5) | 0;
        var x = Math.imul(a ^ (a >>> 15), 1 | a);
        x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x;
        return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
      };
    }

    function gen() {
      var rnd = mulberry(20260314), i;
      var gauss = function () { return ((rnd() + rnd() + rnd() + rnd()) - 2) / 0.577; };
      Q = Math.max(0.55, Math.min(1, (innerWidth * innerHeight) / (1100 * 750)));
      var nD = Math.round(1900 * Q), nG = Math.round(2700 * Q), nR = Math.round(520 * Q), nS = Math.round(650 * Q);
      D = { n: nD, arm: new Uint8Array(nD), s0: new Float32Array(nD), sp: new Float32Array(nD), j: new Float32Array(nD), lv: new Uint8Array(nD) };
      for (i = 0; i < nD; i++) { D.arm[i] = Math.floor(rnd() * 3); D.s0[i] = rnd(); D.sp[i] = 0.6 + rnd() * 0.8; D.j[i] = gauss() * 0.16; D.lv[i] = 2 + Math.floor(rnd() * 3); }
      G = { n: nG, arm: new Uint8Array(nG), rn: new Float32Array(nG), j: new Float32Array(nG), lv: new Uint8Array(nG) };
      for (i = 0; i < nG; i++) {
        G.arm[i] = rnd() < 0.5 ? 0 : 1;
        G.rn[i] = Math.pow(rnd(), 1.35);
        G.j[i] = rnd() < 0.14 ? (rnd() - 0.5) * 6.28 : gauss() * 0.34;
        G.lv[i] = Math.min(5, Math.floor(Math.pow(rnd(), 2.2) * 4) + 1 + (rnd() < 0.04 ? 2 : 0));
      }
      RG = { n: nR, a: new Float32Array(nR), q: new Float32Array(nR) };
      for (i = 0; i < nR; i++) { RG.a[i] = rnd() * 6.2832; RG.q[i] = Math.pow(rnd(), 2.6); }
      S = { n: nS, x: new Float32Array(nS), y: new Float32Array(nS), lv: new Uint8Array(nS), f: new Float32Array(nS), p: new Float32Array(nS) };
      for (i = 0; i < nS; i++) { S.x[i] = rnd(); S.y[i] = rnd(); S.lv[i] = 1 + Math.floor(rnd() * 3); S.f[i] = 0.4 + rnd() * 1.6; S.p[i] = rnd() * 6.28; }
      var cap = nD + nG + nR + nS + 8;
      B = [];
      for (i = 0; i < 6; i++) B.push({ x: new Float32Array(cap), y: new Float32Array(cap), n: 0 });
    }

    function push(l, x, y) { var b = B[l]; b.x[b.n] = x; b.y[b.n] = y; b.n++; }

    function warp(x, y) {
      var dx = x - cx, dy = y - cy, d2 = dx * dx + dy * dy, k = 0.4 * Math.exp(-d2 / (2 * s1 * s1));
      x -= dx * k; y -= dy * k;
      dx = x - mx; dy = y - my; d2 = dx * dx + dy * dy; k = 0.34 * Math.exp(-d2 / (2 * s2 * s2));
      wx = x - dx * k; wy = y - dy * k;
    }

    function grid() {
      var g = 46, step = 14, pass, gx, gy, i, first;
      ctx.lineWidth = 0.5;
      for (pass = 0; pass < 2; pass++) {
        ctx.beginPath();
        for (gx = 0, i = 0; gx <= w + g; gx += g, i++) {
          if ((i % 4 === 0) !== (pass === 1)) continue;
          first = true;
          for (gy = -step; gy <= h + step; gy += step) { warp(gx, gy); if (first) { ctx.moveTo(wx, wy); first = false; } else ctx.lineTo(wx, wy); }
        }
        for (gy = 0, i = 0; gy <= h + g; gy += g, i++) {
          if ((i % 4 === 0) !== (pass === 1)) continue;
          first = true;
          for (gx = -step; gx <= w + step; gx += step) { warp(gx, gy); if (first) { ctx.moveTo(wx, wy); first = false; } else ctx.lineTo(wx, wy); }
        }
        ctx.strokeStyle = pass ? 'rgba(255,255,255,.13)' : 'rgba(255,255,255,.055)';
        ctx.stroke();
      }
    }

    function particles(tt) {
      var i, r, th, x, y, l, s, u, X, Y;
      for (i = 0; i < B.length; i++) B[i].n = 0;
      /* звёзды */
      for (i = 0; i < S.n; i++) {
        l = Math.round(S.lv[i] + Math.sin(tt * S.f[i] + S.p[i]) * 1.1);
        if (l < 1) l = 1; else if (l > 3) l = 3;
        push(l, S.x[i] * w, S.y[i] * h);
      }
      /* рукава галактики из звёздной пыли */
      var rmax = Math.max(w, h) * 0.72 / R, ang = tt * 0.032, cr = Math.cos(-0.4), sr = Math.sin(-0.4);
      for (i = 0; i < G.n; i++) {
        r = 3.1 + G.rn[i] * (rmax - 3.1);
        th = G.arm[i] * Math.PI + 2.15 * Math.log(r / 3.1) + G.j[i] * (0.22 + 0.05 * r) + ang;
        x = Math.cos(th) * r * R; y = Math.sin(th) * r * R * 0.66;
        X = cx + x * cr - y * sr; Y = cy + x * sr + y * cr;
        if (X < -4 || X > w + 4 || Y < -4 || Y > h + 4) continue;
        push(G.lv[i], X, Y);
      }
      /* аккреционный диск: частицы скользят по рукавам внутрь */
      for (i = 0; i < D.n; i++) {
        s = (D.s0[i] + tt * 0.011 * D.sp[i]) % 1; u = 1 - s;
        r = 1.1 + Math.pow(u, 1.55) * 2.35;
        th = D.arm[i] * 2.0944 + 3.1 * Math.log(r / 1.1) + D.j[i] * (0.35 + 0.3 * r) + tt * 0.16;
        x = cx + Math.cos(th) * r * R; y = cy + Math.sin(th) * r * R * 0.84;
        l = D.lv[i];
        if (r < 1.55) l++;
        if (s < 0.07 || s > 0.93) l -= 2; else if (s < 0.14 || s > 0.86) l -= 1;
        if (l > 5) l = 5;
        if (l > 0) push(l, x, y);
      }
      /* фотонное кольцо / горизонт событий */
      for (i = 0; i < RG.n; i++) {
        r = 1.02 + RG.q[i] * 0.5;
        th = RG.a[i] + tt * 0.85 / Math.pow(r, 1.5);
        l = r < 1.08 ? 5 : r < 1.2 ? 4 : 3;
        if (((i * 7 + Math.floor(tt * 6)) % 11) === 0) l--;
        push(l, cx + Math.cos(th) * r * R, cy + Math.sin(th) * r * R * 0.84);
      }
      /* вывод: 6 уровней прозрачности — 6 заливок */
      for (i = 1; i < 6; i++) {
        var b = B[i], sz = i >= 4 ? 1.35 : 1.0, k;
        if (!b.n) continue;
        ctx.fillStyle = 'rgba(255,255,255,' + LV[i] + ')';
        ctx.beginPath();
        for (k = 0; k < b.n; k++) ctx.rect(b.x[k], b.y[k], sz, sz);
        ctx.fill();
      }
    }

    function hud(tt) {
      var top = Math.max(8, (window.__dzTop || 0)) + 16, bot = h - 104;
      var f = 'rgba(255,255,255,.4)';
      ctx.strokeStyle = 'rgba(255,255,255,.45)'; ctx.lineWidth = 1;
      var br = function (x, y, dx, dy) { ctx.beginPath(); ctx.moveTo(x + dx * 12, y); ctx.lineTo(x, y); ctx.lineTo(x, y + dy * 12); ctx.stroke(); };
      br(8, 8, 1, 1); br(w - 8, 8, -1, 1); br(8, h - 8, 1, -1); br(w - 8, h - 8, -1, -1);
      ctx.font = '500 8px ' + MONO; ctx.fillStyle = f; ctx.textBaseline = 'alphabetic';
      try { ctx.letterSpacing = '1.4px'; } catch (e) {}
      ctx.textAlign = 'left';
      ctx.fillText('MIRFLOWERS  ·  OBS-01', 16, top);
      ctx.fillText('GRID 0.5PX  ·  LENS Σ', 16, bot);
      ctx.textAlign = 'right';
      ctx.fillText('SGR A*  ·  26 000 LY', w - 16, top);
      var pad = function (v) { return ('0000' + Math.max(0, Math.round(v))).slice(-4); };
      ctx.fillText('X ' + pad(mx) + '  ·  Y ' + pad(my) + '  ·  T ' + (tt % 1000).toFixed(1), w - 16, bot);
      try { ctx.letterSpacing = '0px'; } catch (e) {}
    }

    function render(tt) {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.fillStyle = '#050505'; ctx.fillRect(0, 0, w, h);
      if (performance.now() - ptrT > 3500) { tx = cx + Math.cos(tt * 0.23) * w * 0.28; ty = cy + Math.sin(tt * 0.31) * h * 0.22; }
      mx += (tx - mx) * 0.1; my += (ty - my) * 0.1;
      grid();
      particles(tt);
      ctx.beginPath(); ctx.arc(cx, cy, R * 0.99, 0, 6.2832); ctx.fillStyle = '#000'; ctx.fill();
      ctx.lineWidth = 0.6; ctx.strokeStyle = 'rgba(255,255,255,.28)'; ctx.beginPath(); ctx.arc(cx, cy, R, 0, 6.2832); ctx.stroke();
      hud(tt);
    }

    function frame(ts) {
      raf = requestAnimationFrame(frame);
      var dt = Math.min(0.05, (ts - last) / 1000 || 0); last = ts; t += dt;
      render(t);
    }

    function resize() {
      if (!cv) return;
      w = innerWidth; h = innerHeight; dpr = Math.min(window.devicePixelRatio || 1, 1.75);
      cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
      cx = w / 2; cy = h * 0.4; R = Math.min(w, h) * 0.15;
      s1 = R * 3.6; s2 = Math.max(90, Math.min(w, h) * 0.16);
      var q = Math.max(0.55, Math.min(1, (w * h) / (1100 * 750)));
      if (!D || Math.abs(q - Q) > 0.2) gen();
      if (!ptrT) { mx = tx = cx; my = ty = cy; }
      if (on && (reduced || document.hidden)) render(t);
    }

    function onPtr(e) { tx = e.clientX; ty = e.clientY; ptrT = performance.now(); }
    function onTouch(e) { var p = e.touches && e.touches[0]; if (p) { tx = p.clientX; ty = p.clientY; ptrT = performance.now(); } }
    function onVis() { if (!on) return; if (document.hidden) { cancelAnimationFrame(raf); raf = 0; } else if (!reduced && !raf) { last = performance.now(); raf = requestAnimationFrame(frame); } }

    return {
      start: function () {
        if (on) return;
        if (!cv) { cv = document.createElement('canvas'); cv.id = 'dz-cv'; ctx = cv.getContext('2d'); }
        if (!cv.parentNode) document.body.insertBefore(cv, document.body.firstChild);
        on = true;
        if (!bound) {
          bound = true;
          window.addEventListener('pointermove', onPtr, { passive: true });
          window.addEventListener('touchstart', onTouch, { passive: true });
          window.addEventListener('touchmove', onTouch, { passive: true });
          window.addEventListener('resize', function () { if (on) resize(); });
          document.addEventListener('visibilitychange', onVis);
        }
        resize();
        if (reduced) render(0);
        else { last = performance.now(); raf = requestAnimationFrame(frame); }
      },
      stop: function () {
        on = false;
        if (raf) cancelAnimationFrame(raf);
        raf = 0;
        if (cv && cv.parentNode) cv.parentNode.removeChild(cv);
      }
    };
  })();

  /* ───────────────────── Навигация ───────────────────── */

  var host = null, navSig = '', lastOn = '', styleEl = null, swStyle = null, sw = null;
  var obs = null, rafId = 0, wheelOn = false;

  function currentView() {
    var v = '';
    try { v = typeof tab !== 'undefined' ? String(tab) : ''; } catch (e) {}
    if (!v) { var b = document.querySelector('#nav button.on'); if (b) v = b.getAttribute('data-t') || ''; }
    return v;
  }
  function isFlat() { var v = root.getAttribute('data-dz-view'); return v === 'map' || v === 'chats' || v === 'tc'; }

  function readNav() {
    var nv = $('nav');
    if (!nv || nv.hidden) return null;
    var items = [], anyOn = false;
    var btns = nv.querySelectorAll('button');
    for (var i = 0; i < btns.length; i++) {
      var b = btns[i], plus = b.classList.contains('plus');
      var key = plus ? '+new' : (b.getAttribute('data-t') || '');
      if (!key) continue;
      var label = '';
      for (var k = 0; k < b.childNodes.length; k++) if (b.childNodes[k].nodeType === 3) label += b.childNodes[k].textContent;
      label = label.trim() || b.getAttribute('aria-label') || '';
      var nb = b.querySelector('.nb');
      var on = b.classList.contains('on');
      if (on) anyOn = true;
      items.push({ key: key, label: plus ? '＋ Заказ' : label, on: on, badge: nb ? nb.textContent.trim() : '' });
    }
    var mb = document.querySelector('#tb .tbm[data-t="more"]');
    if (mb) {
      var bn = mb.querySelector('.tbn'), view = root.getAttribute('data-dz-view') || '';
      items.push({ key: 'more', label: 'Ещё', on: view === 'more' || (!anyOn && !!view && view !== 'me'), badge: bn ? bn.textContent.trim() : '' });
    }
    return items;
  }

  function ensureHost() {
    if (host && host.parentNode) return host;
    host = document.createElement('div');
    host.id = 'dz-nav';
    host.setAttribute('role', 'navigation');
    host.hidden = true;
    host.addEventListener('click', function (e) {
      var b = e.target.closest ? e.target.closest('.dz-n') : null;
      if (!b) return;
      var k = b.getAttribute('data-k'), el = null;
      if (k === '+new') el = document.querySelector('#nav .plus');
      else if (k === 'more') el = document.querySelector('#tb .tbm[data-t="more"]');
      else {
        var all = document.querySelectorAll('#nav button[data-t]');
        for (var i = 0; i < all.length; i++) if (all[i].getAttribute('data-t') === k) { el = all[i]; break; }
      }
      if (el) el.click();
    });
    document.body.appendChild(host);
    return host;
  }

  function buildNav() {
    if (mode < 2) return;
    ensureHost();
    var items = readNav();
    if (!items || !items.length) { host.hidden = true; navSig = ''; return; }
    host.hidden = false;
    var sig = mode + '|' + innerWidth + '|' + JSON.stringify(items);
    if (sig === navSig) return;
    navSig = sig;
    var oldTr = host.querySelector('.dz-tr'), sl = oldTr ? oldTr.scrollLeft : 0, st = oldTr ? oldTr.scrollTop : 0;
    var pad = function (n) { return ('0' + n).slice(-2); };
    var btn = function (it, i, style) {
      return '<button type="button" class="dz-n' + (it.on ? ' on' : '') + '" data-k="' + esc(it.key) + '"' + (style ? ' style="' + style + '"' : '') + '>' +
        '<span class="dz-i">' + pad(i + 1) + '</span><span class="dz-d"></span><span class="dz-l">' + esc(it.label) + '</span>' +
        (it.badge ? '<b class="dz-b">' + esc(it.badge) + '</b>' : '') + '</button>';
    };
    if (mode === 2) {
      var n = items.length, vw = host.clientWidth || innerWidth, padX = 40, gap = 84, H = 98;
      var W = Math.max(vw, padX * 2 + n * gap);
      var X = function (i) { return padX + (W - padX * 2) * (i + 0.5) / n; };
      var Y = function (x) { var u = (x - W / 2) / (W / 2); return 32 + 30 * u * u; };
      var d = '', x;
      for (x = 0; x <= W; x += 8) d += (x ? 'L' : 'M') + x + ',' + Y(x).toFixed(1);
      host.innerHTML = '<div class="dz-tr"><div class="dz-in" style="width:' + W + 'px"><svg width="' + W + '" height="' + H + '" viewBox="0 0 ' + W + ' ' + H + '"><path d="' + d + '"/><path class="t" d="' + d + '"/></svg>' +
        items.map(function (it, i) { var xx = X(i); return btn(it, i, 'left:' + xx.toFixed(1) + 'px;top:' + Y(xx).toFixed(1) + 'px'); }).join('') + '</div></div>';
    } else {
      host.innerHTML = '<div class="dz-tr"><div class="dz-in">' + items.map(function (it, i) { return btn(it, i, ''); }).join('') + '</div></div>';
    }
    var tr = host.querySelector('.dz-tr'), act = host.querySelector('.dz-n.on');
    if (!tr) return;
    tr.scrollLeft = sl; tr.scrollTop = st;
    if (act && act.getAttribute('data-k') !== lastOn) {
      lastOn = act.getAttribute('data-k');
      if (mode === 2 || mode === 4) {
        var tgt = act.offsetLeft + act.offsetWidth / 2 - tr.clientWidth / 2;
        try { tr.scrollTo({ left: Math.max(0, tgt), behavior: sl ? 'smooth' : 'auto' }); } catch (e) { tr.scrollLeft = Math.max(0, tgt); }
      }
    }
  }

  function measure() {
    var tb = $('tb'), top = 0;
    if (tb && getComputedStyle(tb).display !== 'none') top = tb.offsetHeight || 0;
    window.__dzTop = top;
    root.style.setProperty('--dz-top', (top || 0) + 'px');
  }

  function sync() {
    rafId = 0;
    if (mode < 2) return;
    var view = currentView();
    if (root.getAttribute('data-dz-view') !== view) {
      root.setAttribute('data-dz-view', view);
      if (mode === 4) { var v = $('v'); if (v) v.scrollLeft = 0; }
    }
    var nv = $('nav');
    root.setAttribute('data-dz-auth', nv && !nv.hidden ? '1' : '0');
    if (document.body) document.body.classList.toggle('dz-modal', !!document.querySelector('.ov,#askov'));
    measure();
    buildNav();
  }
  function sched() { if (!rafId) rafId = requestAnimationFrame(sync); }

  function startObs() {
    if (obs) return;
    obs = new MutationObserver(sched);
    var nv = $('nav'), v = $('v'), m = $('m');
    if (nv) obs.observe(nv, { childList: true, subtree: true, attributes: true, attributeFilter: ['class', 'hidden'] });
    if (v) obs.observe(v, { childList: true, subtree: true });
    if (m) obs.observe(m, { childList: true, subtree: true });
    obs.observe(document.body, { childList: true });
    window.addEventListener('resize', sched);
    window.addEventListener('orientationchange', sched);
  }
  function stopObs() {
    if (obs) { obs.disconnect(); obs = null; }
    window.removeEventListener('resize', sched);
    window.removeEventListener('orientationchange', sched);
    if (rafId) { cancelAnimationFrame(rafId); rafId = 0; }
  }

  /* колесо мыши → горизонтальная прокрутка ленты (режим 4) */
  function onWheel(e) {
    if (mode !== 4 || isFlat()) return;
    var v = $('v');
    if (!v || !v.contains(e.target)) return;
    if (Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return;
    var el = e.target;
    while (el && el !== v) {
      var cs = getComputedStyle(el);
      if (/(auto|scroll)/.test(cs.overflowY) && el.scrollHeight > el.clientHeight + 1) {
        var atTop = el.scrollTop <= 0 && e.deltaY < 0;
        var atBot = el.scrollTop + el.clientHeight >= el.scrollHeight - 1 && e.deltaY > 0;
        if (!atTop && !atBot) return;
        break;
      }
      el = el.parentElement;
    }
    v.scrollLeft += e.deltaY;
    e.preventDefault();
  }
  function setWheel(on) {
    if (on && !wheelOn) { document.addEventListener('wheel', onWheel, { passive: false }); wheelOn = true; }
    else if (!on && wheelOn) { document.removeEventListener('wheel', onWheel, { passive: false }); wheelOn = false; }
  }

  /* ───────────────────── Применение режима ───────────────────── */

  function cleanup() {
    stopObs();
    Cosmos.stop();
    setWheel(false);
    if (host && host.parentNode) host.parentNode.removeChild(host);
    host = null; navSig = ''; lastOn = '';
    if (styleEl && styleEl.parentNode) styleEl.parentNode.removeChild(styleEl);
    styleEl = null;
    ['data-dz-view', 'data-dz-auth'].forEach(function (a) { root.removeAttribute(a); });
    root.style.removeProperty('--dz-top');
    if (document.body) document.body.classList.remove('dz-modal');
    window.__dzTop = 0;
  }

  function apply(n) {
    mode = n;
    try { localStorage.setItem(KEY, String(n)); } catch (e) {}
    root.setAttribute('data-dz', String(n));
    cleanup();
    if (n > 1) {
      styleEl = document.createElement('style');
      styleEl.id = 'dz-css';
      styleEl.textContent = cssFor(n);
      document.head.appendChild(styleEl);
      startObs();
      sync();
      if (n === 2) Cosmos.start();
      if (n === 4) setWheel(true);
      /* страховка: часть экранов дорисовывается чуть позже */
      setTimeout(sync, 250);
      setTimeout(sync, 1200);
    }
    updateSwitcher();
  }

  /* ───────────────────── Переключатель ───────────────────── */

  function updateSwitcher() {
    if (!sw) return;
    var cur = sw.querySelector('.dz-cur');
    if (cur) { cur.textContent = ('0' + mode).slice(-2); cur.title = 'Дизайн: ' + NAMES[mode - 1]; }
    var bs = sw.querySelectorAll('.dz-opts button');
    for (var i = 0; i < bs.length; i++) bs[i].classList.toggle('on', +bs[i].getAttribute('data-m') === mode);
  }

  function mountSwitcher() {
    swStyle = document.createElement('style');
    swStyle.id = 'dz-sw-css';
    swStyle.textContent = SW_CSS;
    document.head.appendChild(swStyle);
    sw = document.createElement('div');
    sw.id = 'dz-sw';
    sw.setAttribute('data-open', '0');
    sw.innerHTML = '<button type="button" class="dz-cur" aria-label="Дизайн сайта"></button><div class="dz-opts" role="menu">' +
      NAMES.map(function (nm, i) { return '<button type="button" role="menuitem" data-m="' + (i + 1) + '"><b>' + (i + 1) + '</b><span>' + nm + '</span></button>'; }).join('') + '</div>';
    document.body.appendChild(sw);
    sw.addEventListener('click', function (e) {
      var m = e.target.closest ? e.target.closest('[data-m]') : null;
      if (m) { sw.setAttribute('data-open', '0'); apply(parseInt(m.getAttribute('data-m'), 10)); return; }
      if (e.target.closest && e.target.closest('.dz-cur')) sw.setAttribute('data-open', sw.getAttribute('data-open') === '1' ? '0' : '1');
    });
    document.addEventListener('pointerdown', function (e) { if (sw && !sw.contains(e.target)) sw.setAttribute('data-open', '0'); }, true);
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') sw.setAttribute('data-open', '0');
      if (e.altKey && /^[1-4]$/.test(e.key)) apply(parseInt(e.key, 10));
    });
  }

  function init() {
    root.setAttribute('data-dz', String(mode));
    mountSwitcher();
    apply(mode);
  }

  window.MFDesigns = { set: function (n) { n = parseInt(n, 10); if (n >= 1 && n <= 4) apply(n); }, get: function () { return mode; } };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
