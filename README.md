# CARBONFLOW ◉

**Sustainability Backlog Management System**

A node-connected Kanban board designed for managing carbon sustainability platform development. Features readable cards with visual node-connection accents, three view modes, sprint planning, activity logging, and deadline tracking.

![Board View](https://img.shields.io/badge/view-Board-34D399) ![List View](https://img.shields.io/badge/view-List-3B82F6) ![Node Map](https://img.shields.io/badge/view-Node_Map-A78BFA)

## Features

- **Board View** — Kanban columns with drag-and-drop cards + SVG connection lines
- **List View** — Structured table with sorting and inline reordering
- **Node Map** — Interactive graph visualization of all item relationships
- **Sprint Planning** — Assign items to sprints, track progress
- **Activity Log** — Full audit trail of all actions with filtering
- **Deadlines** — Per-item deadlines with overdue warnings
- **Role Switching** — Product Owner vs Developer permissions
- **Hierarchy** — Epics → Stories → Tasks with visual connections

## Quick Start

```bash
# Install dependencies
npm install

# Run locally
npm run dev

# Build for production
npm run build
```

## Deploy to GitHub Pages

### Option A: Automatic (GitHub Actions)

1. Create a new repo on GitHub named `carbonflow`
2. Push this code:
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/carbonflow.git
   git push -u origin main
   ```
3. Go to your repo → **Settings** → **Pages**
4. Under **Source**, select **GitHub Actions**
5. The included workflow will auto-deploy on every push to `main`
6. Your site will be live at `https://YOUR_USERNAME.github.io/carbonflow/`

### Option B: Manual

```bash
npm run build
npx gh-pages -d dist
```

## Configuration

If your repo name is different from `carbonflow`, update the `base` path in `vite.config.js`:

```js
base: '/your-repo-name/',
```

## Tech Stack

- React 18
- Vite 5
- Pure CSS (no UI framework)
- SVG for connection lines
- Canvas for particle background

## License

MIT
