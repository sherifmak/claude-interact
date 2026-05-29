/* ============================================================
   claude-loop  ·  loop.js
   A zero-dependency drop-in that closes the loop between an
   HTML interface and the Claude Code chat.

   Drop it in:
     <link rel="stylesheet" href="loop.css">
     <script src="loop.js" defer></script>

   Mark up your interactive elements:
     <input data-loop="Accent color" type="color" value="#ff4d23">
     <select data-loop="Font">…</select>
     <textarea data-loop="Hero copy">…</textarea>
     <input type="checkbox" data-loop="Include analytics">

   Order / reorderable lists:
     <ol data-loop-order="Step order">
       <li data-loop-item>
         <input type="checkbox" data-loop-toggle checked>
         <span data-loop-text>Set up the project</span>
       </li>
     </ol>

   Single-choice decisions (buttons):
     <div data-loop-decision="Decision">
       <button data-loop-choice="Approve">Approve</button>
       <button data-loop-choice="Revise">Revise</button>
     </div>

   Or drive it from JS:
     Loop.value('Budget', '$4,200');
     Loop.config({ title: 'Trip planner' });

   Click the floating button → a receipt prints, the text is copied,
   you paste it back into Claude Code. That's the whole loop.
   ============================================================ */
(function () {
  'use strict';

  var REPO = 'https://github.com/sherifmak/claude-loop';

  var cfg = {
    title: null,                 // defaults to data-loop-title / document.title
    button: 'Tear off for Claude',
    intro: 'Feedback from the interface you generated',
    outro: 'Apply these choices to the artifact, then we can keep iterating.'
  };

  var manual = [];               // [{label, value}] registered via JS, in order

  /* ---------- public API ---------- */
  var Loop = {
    config: function (opts) { Object.assign(cfg, opts || {}); return Loop; },
    value: function (label, value) {
      var hit = manual.find(function (m) { return m.label === label; });
      if (hit) hit.value = String(value);
      else manual.push({ label: label, value: String(value) });
      return Loop;
    },
    remove: function (label) {
      manual = manual.filter(function (m) { return m.label !== label; });
      return Loop;
    },
    collect: collect,
    format: format,
    open: openReceipt,
    copy: copyText
  };
  window.Loop = Loop;

  /* ---------- field discovery ---------- */
  function title() {
    if (cfg.title) return cfg.title;
    var el = document.querySelector('[data-loop-title]');
    if (el) return el.getAttribute('data-loop-title') || el.textContent.trim();
    return (document.title || 'Interface').replace(/\s*[·|—-].*$/, '').trim();
  }

  function labelFor(el) {
    return el.getAttribute('data-loop') || el.getAttribute('aria-label') ||
           el.name || el.id || 'Value';
  }

  function inputValue(el) {
    var t = (el.type || el.tagName).toLowerCase();
    if (t === 'checkbox') {
      return el.checked
        ? (el.getAttribute('data-loop-on') || 'yes')
        : (el.getAttribute('data-loop-off') || 'no');
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
      '[data-loop], [data-loop-order], [data-loop-decision]'
    );

    nodes.forEach(function (el) {
      // ----- ordered / toggle lists -----
      if (el.hasAttribute('data-loop-order')) {
        var label = el.getAttribute('data-loop-order') || 'Order';
        var items = el.querySelectorAll('[data-loop-item]');
        var lines = [];
        var n = 0;
        items.forEach(function (it) {
          var textEl = it.querySelector('[data-loop-text]');
          var txt = textEl ? textEl.textContent.trim()
                   : (it.getAttribute('data-loop-item') || it.textContent.trim());
          var toggle = it.querySelector('[data-loop-toggle], input[type=checkbox]');
          var off = toggle && !toggle.checked;
          n++;
          lines.push('  ' + n + '. ' + txt + (off ? '   — REMOVED' : ''));
        });
        fields.push({ label: label, value: '\n' + lines.join('\n'), block: true });
        return;
      }

      // ----- single-choice decision groups -----
      if (el.hasAttribute('data-loop-decision')) {
        var dlabel = el.getAttribute('data-loop-decision') || 'Decision';
        var active = el.querySelector(
          '[data-loop-choice].is-active, [data-loop-choice][aria-pressed="true"]'
        );
        var dval = active
          ? (active.getAttribute('data-loop-choice') || active.textContent.trim())
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
          value: checked ? (checked.getAttribute('data-loop-value') ||
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
    out.push('— sent via claude-loop · ' + REPO);
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
    bar.className = 'loop-bar';
    var btn = document.createElement('button');
    btn.className = 'loop-bar__btn';
    btn.type = 'button';
    btn.innerHTML = LOOP_ICON + '<span>' + cfg.button + '</span>';
    btn.addEventListener('click', openReceipt);
    bar.appendChild(btn);

    // receipt modal
    scrim = document.createElement('div');
    scrim.className = 'loop-scrim';
    scrim.innerHTML =
      '<div class="loop-receipt" role="dialog" aria-label="Feedback receipt">' +
        '<div class="loop-receipt__head"><b>CLAUDE · LOOP</b>' +
        '<span>round-trip receipt</span></div>' +
        '<pre class="loop-receipt__body"></pre>' +
        '<div class="loop-barcode"></div>' +
        '<div class="loop-receipt__foot">' +
          '<button class="btn btn--coral" data-loop-copy>Copy for Claude</button>' +
          '<button class="btn btn--ghost" data-loop-close>Close</button>' +
          '<p class="loop-receipt__hint">Paste into your Claude Code chat ⌘V</p>' +
        '</div>' +
      '</div>';
    receiptBody = scrim.querySelector('.loop-receipt__body');

    scrim.addEventListener('click', function (e) {
      if (e.target === scrim || e.target.hasAttribute('data-loop-close')) close();
      if (e.target.hasAttribute('data-loop-copy')) { copyText(); }
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && scrim.classList.contains('is-open')) close();
    });

    // toast
    toastEl = document.createElement('div');
    toastEl.className = 'loop-toast';

    // wire decision-button single-select
    document.querySelectorAll('[data-loop-decision]').forEach(function (group) {
      group.addEventListener('click', function (e) {
        var c = e.target.closest('[data-loop-choice]');
        if (!c || !group.contains(c)) return;
        group.querySelectorAll('[data-loop-choice]').forEach(function (b) {
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
