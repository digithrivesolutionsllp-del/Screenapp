# ScreenApp Frontend

## Tech Stack
- **Framework:** React 19 (create-react-app with Craco)
- **Styling:** Tailwind CSS + Radix UI + Lucide icons
- **Routing:** React Router v7
- **API:** Axios (base URL via `REACT_APP_API_URL` env var)

## Local Development

```bash
cd frontend
yarn install
yarn start
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `REACT_APP_API_URL` | `http://localhost:8000/api` | Backend API base URL |

**For production:** Set `REACT_APP_API_URL` to your Railway backend URL, e.g.:
```
REACT_APP_API_URL=https://screenapp-backend.railway.app/api
```

## Deployment (Vercel)

1. Connect `frontend/` folder to Vercel (or import from GitHub repo `digithrivesolutionsllp-del/Screenapp`)
2. Set environment variable: `REACT_APP_API_URL` = your Railway backend URL
3. Vercel auto-builds with `yarn build` → outputs to `build/`
4. Update `vercel.json` with the actual backend URL

## Key Files

- `src/App.js` — Router setup
- `src/pages/AppPage.js` — Main recording app page
- `src/lib/api.js` — API client (axios instance, base URL from env)
- `src/hooks/use-toast.js` — Toast notifications

## Chrome Extension

Located in `../extension/` — install via `chrome://extensions/` → Load unpacked.

## Deployment (Railway - Backend)

See `../backend/CLAUDE.md` for backend deployment instructions.