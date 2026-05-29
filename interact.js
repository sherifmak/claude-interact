/* ============================================================
   claude-interact  ·  interact.js
   A zero-dependency drop-in that closes the loop between an
   HTML interface and the Claude Code chat.

   Drop it in:
     <link rel="stylesheet" href="interact.css">
     <script src="interact.js" defer></script>

   Mark up your interactive elements:
     <input data-interact="Accent color" type="color" value="#ff4d23">
     <select data-interact="Font">…</select>
     <textarea data-interact="Hero copy">…</textarea>
     <input type="checkbox" data-interact="Include analytics">

   Order / reorderable lists:
     <ol data-interact-order="Step order">
       <li data-interact-item>
         <input type="checkbox" data-interact-toggle checked>
         <span data-interact-text>Set up the project</span>
       </li>
     </ol>

   Single-choice decisions (buttons):
     <div data-interact-decision="Decision">
       <button data-interact-choice="Approve">Approve</button>
       <button data-interact-choice="Revise">Revise</button>
     </div>

   Or drive it from JS:
     Interact.value('Budget', '$4,200');
     Interact.config({ title: 'Trip planner' });

   Click the floating button → a receipt prints, the text is copied,
   you paste it back into Claude Code. That's the whole loop.
   ============================================================ */
(function () {
  'use strict';

  var REPO = 'https://github.com/sherifmak/claude-interact';

  var cfg = {
    title: null,                 // defaults to data-interact-title / document.title
    button: 'Tear off for Claude',
    intro: 'Feedback from the interface you generated',
    outro: 'Apply these choices to the artifact, then we can keep iterating.'
  };

  var manual = [];               // [{label, value}] registered via JS, in order

  /* ---------- public API ---------- */
  var Interact = {
    config: function (opts) { Object.assign(cfg, opts || {}); return Interact; },
    value: function (label, value) {
      var hit = manual.find(function (m) { return m.label === label; });
      if (hit) hit.value = String(value);
      else manual.push({ label: label, value: String(value) });
      return Interact;
    },
    remove: function (label) {
      manual = manual.filter(function (m) { return m.label !== label; });
      return Interact;
    },
    collect: collect,
    format: format,
    open: openReceipt,
    copy: copyText
  };
  window.Interact = Interact;

  /* ---------- field discovery ---------- */
  function title() {
    if (cfg.title) return cfg.title;
    var el = document.querySelector('[data-interact-title]');
    if (el) return el.getAttribute('data-interact-title') || el.textContent.trim();
    return (document.title || 'Interface').replace(/\s*[·|—-].*$/, '').trim();
  }

  function labelFor(el) {
    return el.getAttribute('data-interact') || el.getAttribute('aria-label') ||
           el.name || el.id || 'Value';
  }

  function inputValue(el) {
    var t = (el.type || el.tagName).toLowerCase();
    if (t === 'checkbox') {
      return el.checked
        ? (el.getAttribute('data-interact-on') || 'yes')
        : (el.getAttribute('data-interact-off') || 'no');
    }
    if (el.tagName === 'SELECT') {
      var o = el.options[el.selectedIndex];
      return o ? o.textContent.trim() : '';
    }
    if (el.isContentEditable) return el.textContent.trim();
    return (el.value != null ? String(el.value) : el.textContent).trim();
  }

  function collect() {
    var fields = [];
    var seenRadio = {};

    // Walk every loop-aware node once, in DOM order, so the receipt
    // reads top-to-bottom exactly like the page.
    var nodes = document.querySelectorAll(
      '[data-interact], [data-interact-order], [data-interact-decision]'
    );

    nodes.forEach(function (el) {
      // ----- ordered / toggle lists -----
      if (el.hasAttribute('data-interact-order')) {
        var label = el.getAttribute('data-interact-order') || 'Order';
        var items = el.querySelectorAll('[data-interact-item]');
        var lines = [];
        var n = 0;
        items.forEach(function (it) {
          var textEl = it.querySelector('[data-interact-text]');
          var txt = textEl ? textEl.textContent.trim()
                   : (it.getAttribute('data-interact-item') || it.textContent.trim());
          var toggle = it.querySelector('[data-interact-toggle], input[type=checkbox]');
          var off = toggle && !toggle.checked;
          n++;
          lines.push('  ' + n + '. ' + txt + (off ? '   — REMOVED' : ''));
        });
        fields.push({ label: label, value: '\n' + lines.join('\n'), block: true });
        return;
      }

      // ----- single-choice decision groups -----
      if (el.hasAttribute('data-interact-decision')) {
        var dlabel = el.getAttribute('data-interact-decision') || 'Decision';
        var active = el.querySelector(
          '[data-interact-choice].is-active, [data-interact-choice][aria-pressed="true"]'
        );
        var dval = active
          ? (active.getAttribute('data-interact-choice') || active.textContent.trim())
          : '(none picked)';
        fields.push({ label: dlabel, value: dval });
        return;
      }

      // ----- plain inputs -----
      if ((el.type || '').toLowerCase() === 'radio') {
        var key = labelFor(el);
        if (seenRadio[key]) return;
        seenRadio[key] = true;
        var checked = document.querySelector(
          'input[type=radio][name="' + el.name + '"]:checked'
        );
        fields.push({
          label: key,
          value: checked ? (checked.getAttribute('data-interact-value') ||
                 (checked.labels && checked.labels[0] ? checked.labels[0].textContent.trim() : checked.value))
                 : '(none)'
        });
        return;
      }

      var v = inputValue(el);
      fields.push({ label: labelFor(el), value: v === '' ? '(empty)' : v });
    });

    // merge JS-registered values (override matching labels, else append)
    manual.forEach(function (m) {
      var hit = fields.find(function (f) { return f.label === m.label; });
      if (hit) hit.value = m.value;
      else fields.push(m);
    });

    return { title: title(), fields: fields };
  }

  /* ---------- format the pasteable block ---------- */
  function format() {
    var data = collect();
    var out = [];
    out.push(cfg.intro + ' — "' + data.title + '":');
    out.push('');
    data.fields.forEach(function (f) {
      if (f.block) out.push('• ' + f.label + ':' + f.value);
      else out.push('• ' + f.label + ': ' + f.value);
    });
    out.push('');
    out.push(cfg.outro);
    out.push('');
    out.push('— sent via claude-interact · ' + REPO);
    return out.join('\n');
  }

  /* ---------- UI: floating button + receipt ---------- */
  var scrim, receiptBody, toastEl;

  var LOOP_ICON =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" ' +
    'stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 1 1-3-6.7"/>' +
    '<path d="M21 4v5h-5"/></svg>';

  function build() {
    // floating launcher
    var bar = document.createElement('div');
    bar.className = 'interact-bar';
    var btn = document.createElement('button');
    btn.className = 'interact-bar__btn';
    btn.type = 'button';
    btn.innerHTML = LOOP_ICON + '<span>' + cfg.button + '</span>';
    btn.addEventListener('click', openReceipt);
    bar.appendChild(btn);

    // receipt modal
    scrim = document.createElement('div');
    scrim.className = 'interact-scrim';
    scrim.innerHTML =
      '<div class="interact-receipt" role="dialog" aria-label="Feedback receipt">' +
        '<div class="interact-receipt__head"><b>CLAUDE · INTERACT</b>' +
        '<span>round-trip receipt</span></div>' +
        '<pre class="interact-receipt__body"></pre>' +
        '<div class="interact-barcode"></div>' +
        '<div class="interact-receipt__foot">' +
          '<button class="btn btn--coral" data-interact-copy>Copy for Claude</button>' +
          '<button class="btn btn--ghost" data-interact-close>Close</button>' +
          '<p class="interact-receipt__hint">Paste into your Claude Code chat ⌘V</p>' +
        '</div>' +
      '</div>';
    receiptBody = scrim.querySelector('.interact-receipt__body');

    scrim.addEventListener('click', function (e) {
      if (e.target === scrim || e.target.hasAttribute('data-interact-close')) close();
      if (e.target.hasAttribute('data-interact-copy')) { copyText(); }
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && scrim.classList.contains('is-open')) close();
    });

    // toast
    toastEl = document.createElement('div');
    toastEl.className = 'interact-toast';

    // wire decision-button single-select
    document.querySelectorAll('[data-interact-decision]').forEach(function (group) {
      group.addEventListener('click', function (e) {
        var c = e.target.closest('[data-interact-choice]');
        if (!c || !group.contains(c)) return;
        group.querySelectorAll('[data-interact-choice]').forEach(function (b) {
          b.classList.remove('is-active'); b.setAttribute('aria-pressed', 'false');
        });
        c.classList.add('is-active'); c.setAttribute('aria-pressed', 'true');
      });
    });

    document.body.appendChild(bar);
    document.body.appendChild(scrim);
    document.body.appendChild(toastEl);
  }

  function openReceipt() {
    receiptBody.textContent = format();
    scrim.classList.add('is-open');
    copyText(true);              // auto-copy on print (we're inside a click gesture)
  }
  function close() { scrim.classList.remove('is-open'); }

  function copyText(quiet) {
    var txt = format();
    receiptBody.textContent = txt;
    var done = function () { if (!quiet) toast('Copied ✓  — now paste into Claude'); else toast('Copied ✓'); };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(txt).then(done, function () { legacyCopy(txt); done(); });
    } else { legacyCopy(txt); done(); }
  }

  function legacyCopy(txt) {
    var ta = document.createElement('textarea');
    ta.value = txt; ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta); ta.select();
    try { document.execCommand('copy'); } catch (e) {}
    document.body.removeChild(ta);
  }

  var toastTimer;
  function toast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.add('is-on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.classList.remove('is-on'); }, 2200);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', build);
  } else { build(); }
})();
