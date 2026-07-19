# Critical Role Tracker

A mobile-friendly web app for tracking [Critical Role](https://critrole.com) —
episodes, characters, and the web of connections between episodes (foreshadowing,
callbacks, plot threads, character arcs), visualized as an interactive
force-directed graph.

Covers all four campaigns (Vox Machina, Mighty Nein, Bells Hells, Age of Umbra)
plus one-shots. All data lives in your browser's `localStorage`; a JSON
export/import gives you a manual cross-device backup.

## Features

- **Episodes** — log episode number, title, date watched, a *"what happened"*
  summary (inline-editable), notes, and a YouTube link (embedded when set).
- **Characters** — track PCs/NPCs per campaign with alive/dead/unknown status,
  player, a freeform stats & skills block, and a per-character timeline of events.
- **Timeline** — a campaign-wide, episode-ordered feed of character events.
- **Graph** — an interactive force-directed graph of episode connections.
  Nodes are episodes (colored by campaign, sized by connection count); edges are
  connections (colored by type). Tap a node to inspect it and jump to it. Toggle
  between the active campaign and all campaigns.
- **Auto-fill** *(optional)* — let AI do the lookups via serverless proxies to the
  Anthropic API (web search grounded in the Critical Role wiki):
  - **Episodes** — from the episode number, fetch a *"what happened"* summary and
    the official YouTube URL (`/api/episode-info`).
  - **Characters** — from the character name, fetch class/title, player, a stats &
    skills block, and background notes (`/api/character-info`).

  Both use **preview-then-accept**: suggestions are shown for review and only
  applied on a tap, so nothing overwrites your text. Available in the add modals
  and on each episode card / character detail view. Hidden automatically when no
  API key is configured; manual entry always works.
- **Export / Import** — back up or restore the whole dataset as JSON from the
  settings menu (⚙︎ in the header).

## Tech stack

- [Vite](https://vitejs.dev/) + [React 18](https://react.dev/)
- [Tailwind CSS](https://tailwindcss.com/) for styling
- [lucide-react](https://lucide.dev/) icons
- [react-force-graph-2d](https://github.com/vasturiano/react-force-graph) for the graph
- Deployed on [Vercel](https://vercel.com/) (static SPA + one serverless function)

## Local development

```bash
npm install
npm run dev        # http://localhost:5173
```

Other scripts:

```bash
npm run build      # production build to dist/
npm run preview    # serve the production build locally
```

> Note: the **Auto-fill** button relies on the `/api/episode-info`
> serverless function, which only runs on Vercel (or `vercel dev`). Under plain
> `npm run dev` / `npm run preview` the button hides itself — everything else
> works, and you can always type the summary / paste a URL manually.

## Deploying to Vercel

1. Push this repo to GitHub and import it into Vercel (it auto-detects Vite).
2. *(Optional)* To enable **Auto-fill**, add environment variables in the
   Vercel project settings:
   - `ANTHROPIC_API_KEY` = your Anthropic API key *(required for auto-fill)*
   - `ANTHROPIC_MODEL` = *(optional)* override the model the serverless functions
     use. Defaults to `claude-sonnet-5`; set this if that model isn't available to
     your account (a `404 model: …` error in the Vercel logs means you need to).
3. Deploy. The static app is served from `dist/`, and the `api/*.js` files
   run as serverless functions.

If you skip step 2, the app deploys and works fully — only the optional
auto-fetch feature stays hidden.

## Data & privacy

All tracker data is stored locally in your browser (`localStorage`, key
`cr-tracker-data`). Nothing is sent to a server except the optional auto-fetch
request (episode number/title only). Clearing site data or switching browsers
loses your data unless you **Export** first.
