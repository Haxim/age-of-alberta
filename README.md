# Age of Alberta — Render.com static deploy

An isometric, Age-of-Empires-style educational browser game for Grades 1–6
(Alberta curriculum), with a built-in printable PDF worksheet generator.

This is a **pure static site** — plain HTML, Canvas, and JavaScript. No backend,
no build step, no Node server. It just serves the files in `public/`.

## What's in here

```
public/            <- everything that gets served (this is the publish directory)
  index.html       <- entry point
  engine.js        <- game engine
  worksheets.js    <- printable worksheet + PDF generator
  splash.jpg       <- title screen art
  assets/          <- sprites, building art, hero images, manifest
render.yaml        <- optional one-click Render Blueprint
```

> Note: the worksheet generator pulls jsPDF from a public CDN at runtime, so the
> deployed site needs normal outbound internet access (Render static sites have this).

---

## Option A — One-click Blueprint (recommended)

1. Push this folder to a GitHub/GitLab repo (the `render.yaml` must be at the repo root).
2. In the Render dashboard, click **New → Blueprint** and pick the repo.
3. Render reads `render.yaml`, creates a **Static Site**, and deploys. Done.

## Option B — Manual static site (no render.yaml needed)

1. Push this folder to a Git repo (or use Render's "Deploy from public Git URL").
2. In Render: **New → Static Site** and connect the repo.
3. Set these fields:
   - **Build Command:** *(leave blank)*
   - **Publish Directory:** `public`
4. Click **Create Static Site**.

## Option C — Drag-and-drop / no Git

Some Render plans support manual uploads. If yours does, create a **Static Site**
and upload the contents of the `public/` folder, with the publish directory set to
the upload root.

---

## Local test (optional)

```bash
cd public
python3 -m http.server 8000
# then open http://localhost:8000
```

## Updating

Replace the files in `public/` with new versions and redeploy (push to Git, or
re-upload). Nothing else to change.
