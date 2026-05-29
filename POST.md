# Personal software is already here

*The agent can build you an interface for anything. The only thing missing was a way to talk back. So I built it.*

A while ago I wrote that [text is not the death of UI](https://sheriff.substack.com/p/ui-for-ai-micro-interfaces-move-us). The argument was simple: clicking beats typing for structured input. You shouldn't describe a color in a paragraph when a swatch will do. You shouldn't narrate the order of five steps when you could just drag them. I called these micro-interfaces — the right control, generated for the exact moment you need it.

Since then the models got good. Really good at code. And something clicked for me: if an agent can write a clean component or a tidy HTML page in seconds, then the interface itself becomes disposable. Built for one person, one task, one moment — and thrown away after. That's personal software. Not an app a thousand people share. A screen made for you, right now, then gone.

This is the part I think people are sleeping on. We spent two years funneling every interaction through a chat box, as if the paragraph were the final form of human-computer interaction. It isn't. There's no reason every exchange with an agent should be mediated by prose — or by some pre-built app a product team shipped months ago, guessing what you'd want. The agent *is* the product team now. It can build the screen on demand.

Anthropic just made a neighboring point: [HTML is an unreasonably effective output format for Claude Code](https://claude.com/blog/using-claude-code-the-unreasonable-effectiveness-of-html). Ask it for a spec, a plan, a code review, and instead of a wall of Markdown you'll never finish reading, you get a *page* — tables, diagrams, tabs, real layout. I buy this completely. HTML is the universal canvas, and the agent already speaks it fluently.

But generating the interface is only half a loop.

Here's the gap. Claude builds you a beautiful plan as HTML. You open it, reorder the steps, kill two of them, rewrite a third, approve the rest. And then… what? Your changes are stuck in a browser tab. The conversation is in another window. You end up retyping your own decisions back into the chat — the exact typing the interface was supposed to save you from.

So I built **claude-interact** to close it.

It's one file you drop into any HTML Claude generates. It watches your inputs — the slider, the chips, the drag-to-reorder list, the edited text — and with one click prints a little **receipt**: a tidy summary of everything you chose, copied straight to your clipboard. You paste it back into the chat. The interface talks; now it talks back. No server, no install, no account. Copy, paste, done.

I put up three live demos — a plan reviewer, a theme picker, and a project brief — so you can feel the round trip yourself:

→ **[github.com/sherifmak/claude-interact](https://github.com/sherifmak/claude-interact)**  ·  try them live at **[sherifmak.github.io/claude-interact](https://sherifmak.github.io/claude-interact/)**

Open one, change things, hit the coral button, and watch your clicks become something you can hand right back to the agent.

This is a tiny tool making a big bet: the next interface for AI isn't a better chat box, and it isn't a fixed app. It's whatever the agent builds for you in the moment — plus a clean way to hand your answer back. I'm genuinely excited to see what people loop back.
