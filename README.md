# claude-interact

**Interfaces that talk back.**

Claude Code is so good at code that it can hand you a real, purpose-built interface for any task — a slider, a set of chips, a drag-to-reorder list. The missing half is the way back: when you tweak that slider, where does the answer go? `claude-interact` closes the loop. Drop one CSS file and one JS file into any HTML Claude generates, and a single click prints a tidy, paste-able **receipt** of every choice you made — copied to your clipboard, ready to drop straight back into the chat. No server, no install, no account.

## The loop

Four moves, then repeat:

1. **You ask** — plain language, like always: _"Show me the plan."_
2. **Claude builds** an HTML interface and opens it in your browser. Real controls, not a wall of text.
3. **You decide** by clicking — reorder, edit, pick, approve.
4. **It talks back** — one click prints a paste-able receipt → clipboard → chat.

That receipt is the whole point: structured, human-readable feedback Claude can act on, with zero plumbing between the page and the conversation.

## Quick start

Add two tags to the `<head>` (or anywhere) of your HTML:

```html
<link rel="stylesheet" href="interact.css">
<script src="interact.js" defer></script>
```

Then mark up the controls you want in the receipt:

```html
<input  data-interact="Accent color" type="color" value="#ff4d23">
<select data-interact="Font">
  <option>Inter</option>
  <option>Söhne</option>
</select>
<textarea data-interact="Hero copy">Build software at the speed of thought.</textarea>
<input type="checkbox" data-interact="Include analytics">
```

A floating **"Tear off for Claude"** button appears in the corner. Click it, the receipt prints and copies itself, and you paste it back into Claude Code with `⌘V`.

## Use it with Claude Code

Paste `PROMPT.md` into your Claude Code session once. From then on, when you ask for a plan, a design, or a set of options, Claude hands you a loop-enabled interface and treats the receipt you paste back as your chosen input. The gist:

```text
When I ask you to show me a plan, a design, or a set of options,
build it as a single HTML file and open it in my browser.

Make the choices interactive — sliders, chips, drag-to-reorder
lists, editable text, approve/revise buttons — never a wall of text.

Include claude-interact so I can send my answers back to you:
  <link rel="stylesheet" href="interact.css">
  <script src="interact.js" defer></script>
Mark each control with data-interact="Friendly label", lists with
data-interact-order, and decisions with data-interact-decision.

When I paste back a "claude · loop receipt", treat it as my chosen
input and apply it to what you generated.
```

## Attribute reference

### HTML attributes

| Attribute | Put it on | What it does |
| --- | --- | --- |
| `data-interact="Label"` | any `input`, `select`, `textarea`, contenteditable | Captures the field's value under `Label`. Checkboxes report `yes`/`no`; selects report the option text; radios report the checked option. |
| `data-interact-on` / `data-interact-off` | a `data-interact` checkbox | Overrides the `yes`/`no` text for checked / unchecked (e.g. `data-interact-on="enabled"`). |
| `data-interact-order="Label"` | a list container (`ol`/`ul`/`div`) | Emits an ordered, top-to-bottom list of its items under `Label`. |
| `data-interact-item` | each item inside a `data-interact-order` list | Marks a list entry. |
| `data-interact-text` | a node inside an item | The text used for that item (falls back to the item's own text). |
| `data-interact-toggle` | a checkbox inside an item | Unchecking it marks the item `— REMOVED` in the receipt. |
| `data-interact-decision="Label"` | a group container | A single-choice decision. Clicking a choice inside it activates that one. |
| `data-interact-choice="Value"` | a `button` inside a decision group | One option. The active choice's value is reported under the group's `Label`. |
| `data-interact-title="…"` | any element | Sets the receipt title (otherwise the cleaned-up `document.title` is used). |

### JavaScript API

The global `window.Interact` lets you drive the receipt from code. Methods that mutate config or values return `Interact`, so they chain.

| Call | Effect |
| --- | --- |
| `Interact.config({ title, button, intro, outro })` | Override the receipt title, the launcher button label, and the intro / outro lines. |
| `Interact.value(label, value)` | Register (or update) a field. Overrides a matching `data-interact` label, else appends. |
| `Interact.remove(label)` | Drop a JS-registered field by label. |
| `Interact.collect()` | Return `{ title, fields }` — the structured data behind the receipt. |
| `Interact.format()` | Return the receipt as the exact pasteable string. |
| `Interact.open()` | Open the receipt modal (and auto-copy). |

```js
Interact.config({ title: 'Trip planner', button: 'Send to Claude' });
Interact.value('Budget', '$4,200');
```

## Demos

Three working interfaces, each one loop-enabled. Live on the GitHub Pages site, source in `demos/`:

- **`demos/plan.html`** — Plan reviewer. Claude drafts a plan as HTML; reorder steps, edit them inline, drop the ones you don't want, approve.
- **`demos/theme.html`** — Theme picker. A live styling panel — colour, type, spacing, radius — previewing in real time. Send back the tokens you like.
- **`demos/choices.html`** — Choices & brief. The everyday case: a structured brief with chips, ranges, toggles, and free text instead of a wall of questions.

## How it works

On load, `interact.js` injects a floating launcher and a receipt modal, then wires up any decision groups. When you open the receipt it scans every `data-interact`, `data-interact-order`, and `data-interact-decision` node in DOM order so the receipt reads top-to-bottom exactly like the page, merges in anything registered via `Interact.value`, formats it into a clean text block, and copies it to your clipboard (with a legacy `execCommand` fallback). Paste it back into the chat and the loop is closed.

## Project structure

```text
claude-interact/
├── interact.js          # the drop-in (zero dependencies)
├── interact.css         # shared styles for the launcher + receipt
├── index.html       # landing page / live "taste it" demo
├── PROMPT.md        # paste this into Claude Code
├── README.md
└── demos/
    ├── plan.html    # plan reviewer
    ├── theme.html   # theme picker
    └── choices.html # choices & brief
```

## About

Built by [Sherif Maktabi](https://sheriff.substack.com) as a companion to the essay _"Personal software is already here."_ The whole thing is one CSS file and one JS file — read them, fork them, make the loop your own.

## License

MIT.
