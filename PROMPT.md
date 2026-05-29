# PROMPT.md

Paste the block below into your Claude Code session once. From then on, whenever you ask for a plan,
a design, or a set of options, Claude hands you a clickable HTML interface instead of a wall of text — and you send your answers back with one click.

---

> **Instructions for Claude Code — keep these in mind for the rest of this session.**
>
> When I ask you to show me a **plan, a design, an option set, or any set of choices**, do not reply with prose. Instead:
>
> 1. **Build it as a single HTML file** and open it in my browser (e.g. `open plan.html` on macOS, `xdg-open` on Linux, `start` on Windows).
>
> 2. **Make every choice interactive**, never paragraphs to read:
>    - sliders / number ranges for amounts
>    - chips or buttons for single picks
>    - drag-to-reorder lists for sequencing, with checkboxes to drop items
>    - editable text fields for names, copy, and free input
>    - approve / revise buttons for sign-off
>
> 3. **Include claude-loop** so I can send my answers back to you. In `<head>`:
>    ```html
>    <link rel="stylesheet" href="loop.css">
>    ```
>    Before `</body>`:
>    ```html
>    <script src="loop.js" defer></script>
>    ```
>    (Make sure `loop.css` and `loop.js` sit next to the HTML file, or fix the paths.)
>
> 4. **Mark up the controls** with these exact attributes:
>    - `data-loop="Friendly label"` on any single input — `<input>`, `<select>`, `<textarea>`, checkbox (checkboxes default to `yes`/`no`; override with `data-loop-on` / `data-loop-off`). Radio groups report the checked option.
>    - `data-loop-order="List label"` on an `<ol>`/`<ul>`. Each row gets `data-loop-item`; put the label text in a child with `data-loop-text`, and an optional `<input type="checkbox" data-loop-toggle>` — unchecked items are reported as REMOVED.
>    - `data-loop-decision="Decision label"` on a group, with `<button data-loop-choice="Approve">` for each option. The library wires single-select; the active button is the reported choice.
>    - Optionally set a panel title with `data-loop-title="…"` on a wrapper element.
>
> 5. **Drive it from JS** when useful:
>    - `Loop.config({ title: 'Trip planner' })` to set the receipt title.
>    - `Loop.value('Budget', '$4,200')` to register a computed value (overrides a matching label, else appends).
>
> 6. **When I paste back a "CLAUDE · LOOP" receipt**, treat its bulleted fields as my chosen input — the decisions, the order (respecting REMOVED items), the edited text and values — and apply them to what you generated, then keep iterating. Don't re-ask what the receipt already answers.

---

## Copyable skeleton

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Launch plan</title>
  <link rel="stylesheet" href="loop.css">
</head>
<body>
  <main data-loop-title="Launch plan">
    <label>Project name
      <input type="text" data-loop="Project name" value="Aurora">
    </label>

    <label>Budget
      <input type="range" min="0" max="10000" value="4200" data-loop="Budget">
    </label>

    <ol data-loop-order="Step order">
      <li data-loop-item>
        <input type="checkbox" data-loop-toggle checked>
        <span data-loop-text>Set up the repo</span>
      </li>
      <li data-loop-item>
        <input type="checkbox" data-loop-toggle checked>
        <span data-loop-text>Write the landing page</span>
      </li>
    </ol>

    <div data-loop-decision="Sign-off">
      <button type="button" data-loop-choice="Approve">Approve</button>
      <button type="button" data-loop-choice="Revise">Revise</button>
    </div>
  </main>

  <script src="loop.js" defer></script>
  <script>Loop.config({ title: 'Launch plan' });</script>
</body>
</html>
```

Click the floating **“Tear off for Claude”** button, copy the receipt, and paste it back into your chat.
