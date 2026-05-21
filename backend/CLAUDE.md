# ScreenApp Backend

## Tech Stack
- **Framework:** FastAPI (Python)
- **Database:** MongoDB (Motor async driver)
- **Transcription:** OpenAI Whisper (CPU)
- **AI:** Claude Sonnet 4 via api.claudeopus.pro

## Local Development

```bash
cd backend
pip install -r requirements.txt
python -m uvicorn app.main:app --port 8000 --reload
```

## Environment Variables (Required)

Set these in Railway dashboard:

| Variable | Value | Notes |
|----------|-------|-------|
| `MONGO_URL` | `mongodb+srv://screenapp:ScreenApp123@cluster0.f2cubks.mongodb.net/` | MongoDB Atlas cluster |
| `DB_NAME` | `screenapp` | Database name |
| `ANTHROPIC_API_KEY` | (your key) | Set by owner — do NOT commit |
| `WHISPER_MODEL` | `base` | Whisper model size (base/small/medium/large) |
| `CORS_ORIGINS` | `*` | Allowed CORS origins |
| `MAX_UPLOAD_SIZE_MB` | `100` | Max upload size in MB |

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Health check |
| GET | `/api/recordings` | List all recordings |
| POST | `/api/recordings/upload` | Upload audio file |
| GET | `/api/recordings/{id}` | Get single recording |
| GET | `/api/recordings/{id}/audio` | Stream audio file |
| PATCH | `/api/recordings/{id}` | Rename or move to folder |
| DELETE | `/api/recordings/{id}` | Delete recording |
| POST | `/api/recordings/{id}/transcribe` | Transcribe audio |
| POST | `/api/recordings/{id}/summarize` | Generate summary |
| POST | `/api/recordings/{id}/chat` | Chat with recording |
| GET | `/api/folders` | List folders |
| POST | `/api/folders` | Create folder |
| PUT | `/api/folders/{id}` | Rename folder |
| DELETE | `/api/folders/{id}` | Delete folder |

## Deployment (Railway)

### GitHub Repo
`digithrivesolutionsllp-del/Screenapp` — connect the `backend/` subdirectory via Railway's monorepo support.

### railway.json
```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "nixpacks": {
      "name": "python",
      "install": ["pip install -r requirements.txt"]
    }
  },
  "deploy": {
    "startCommand": "uvicorn app.main:app --host 0.0.0.0 --port $PORT",
    "healthCheck": { "path": "/api/health" }
  }
}
```

### Required Environment Variables (set in Railway dashboard)
| Variable | Value |
|----------|-------|
| `MONGO_URL` | `mongodb+srv://screenapp:ScreenApp123@cluster0.f2cubks.mongodb.net/` |
| `DB_NAME` | `screenapp` |
| `ANTHROPIC_API_KEY` | **(user must set their own key — never hardcode)** |
| `WHISPER_MODEL` | `base` |
| `CORS_ORIGINS` | `*` |
| `MAX_UPLOAD_SIZE_MB` | `100` |

### Deployment Steps
1. Sign in to Railway at https://railway.app (GitHub OAuth)
2. Click "New Project" → "Deploy from GitHub repo" → select `digithrivesolutionsllp-del/Screenapp`
3. In project settings, set the root directory to `backend/`
4. Add all environment variables above (ANTHROPIC_API_KEY must be set by the owner)
5. Railway auto-deploys on each push to `main`
6. After first deploy, copy the Railway URL and update `vercel.json` with it

### Whisper Note
`openai-whisper` downloads model weights (~148 MB for base) on first transcription request, not at startup.

## Deployment (Vercel - Frontend)

1. Connect `frontend/` folder to Vercel
2. Set `REACT_APP_API_URL` to the Railway backend URL (e.g., `https://screenapp-backend.railway.app/api`)
3. Deploy