# ScreenApp -- Setup Guide

This guide walks you through setting up ScreenApp from scratch, from creating cloud accounts to running the app locally, plus deployment options.

---

## Account Setup

### MongoDB Atlas (Free Tier)

MongoDB Atlas is a fully managed cloud database. The free M0 sandbox cluster is sufficient for development.

1. **Sign up.** Go to [https://www.mongodb.com/atlas](https://www.mongodb.com/atlas) and create a free account. You can sign up with Google, GitHub, or an email + password.

2. **Create a cluster.** After logging in, click **Build a Database**. Select the **Free** tier (M0 Sandbox). Choose a provider and region closest to you (e.g., AWS / Mumbai for India, AWS / us-east-1 for US). Click **Create**.

3. **Create a database user.** Navigate to **Security > Database Access > Add New Database User**. Set a username (e.g., `screenapp_user`) and a strong password. Save this password -- you will need it for the connection string. Under **Built-in Role**, select **Read and write to any database**. Click **Add User**.

4. **Configure network access.** Navigate to **Security > Network Access > Add IP Address**. Click **Allow Access from Anywhere** (0.0.0.0/0) for local development. Click **Confirm**.

5. **Get your connection string.**
   - Go to **Deployment > Database**.
   - Click **Connect** on your cluster.
   - Select **Connect your application**.
   - Copy the connection string. It looks like:
     ```
     mongodb+srv://username:password@cluster-name.mongodb.net/?retryWrites=true&w=majority
     ```
   - Replace `username` with your database user and `password` with the password you set in step 3.

6. **Test the connection.** Add the connection string to your `backend/.env` file as `MONGO_URL`, then start the backend server. If the server starts without MongoDB connection errors, you are connected.

---

### Anthropic API Key (Claude Opus)

The Anthropic API key is used for AI summarization and chat-with-recordings features.

1. **Sign up or log in.** Go to [https://console.anthropic.com/](https://console.anthropic.com/) and create an account or log in.

2. **Navigate to the API keys page.** Click your name in the bottom-left corner, then select **API Keys**.

3. **Create a new API key.** Click **Create Key**. Give it a name like `screenapp-dev`. Copy the key immediately -- it will not be shown again.

4. **Add credits (if needed).** New accounts get some free credits. Check your credit balance at the top of the console. For development, the free credits are typically sufficient.

5. **Add the key to your env.** Set `ANTHROPIC_API_KEY=sk-ant-...` in your `backend/.env` file.

---

## Local Development Setup

### Prerequisites

- **Node.js** 18 or higher. Download from [https://nodejs.org/](https://nodejs.org/).
- **Python** 3.11 or higher. Download from [https://www.python.org/](https://www.python.org/).
- **Yarn** (recommended) or npm. Install yarn with: `npm install -g yarn`

Verify your versions:

```bash
node --version   # should be >= 18
python --version  # should be >= 3.11
```

### Step 1: Clone the repository

```bash
git clone <repo-url>
cd screenapp
```

### Step 2: Install Whisper dependencies

Whisper requires PyTorch and the transformers library. These are heavy installs, so set aside a few minutes.

```bash
cd backend

# Install PyTorch with CPU support (smaller, faster install for development)
pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cpu

# Install Whisper and supporting libraries
pip install openai-whisper transformers
```

For GPU acceleration (optional, significantly faster transcription):

```bash
pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu118
pip install openai-whisper transformers
```

Note: `openai-whisper` is the package name on PyPI (not `whisper`).

### Step 3: Install remaining Python dependencies

```bash
pip install -r requirements.txt
```

### Step 4: Configure environment variables

```bash
cp backend/.env.example backend/.env
```

Edit `backend/.env` and fill in:
- `MONGO_URL` -- your MongoDB Atlas connection string
- `DB_NAME` -- use `screenapp` (or any name you prefer)
- `ANTHROPIC_API_KEY` -- your Anthropic API key
- `CORS_ORIGINS` -- `http://localhost:3000`
- `HOST` -- `0.0.0.0`
- `PORT` -- `8000`

### Step 5: Install frontend dependencies

```bash
cd frontend
yarn install
```

### Step 6: Start the backend

```bash
cd backend
uvicorn server:app --reload --host 0.0.0.0 --port 8000
```

Expected output:
```
INFO:     Uvicorn running on http://0.0.0.0:8000
INFO:     Application startup complete.
```

### Step 7: Start the frontend

Open a new terminal:

```bash
cd frontend
yarn start
```

The frontend will open at `http://localhost:3000`. If port 3000 is in use, it will use the next available port (e.g., 3001).

---

## Tab Audio Capture Feature

The tab audio capture feature is one of the core differentiators for this app. It lets you record audio playing in any browser tab (like a YouTube video or an online training course) without capturing your microphone or system audio.

**What it does:** Instead of recording from your microphone, it uses Chrome's `getDisplayMedia` API to capture the audio stream from a specific browser tab. The ScreenApp tab is automatically excluded from the tab picker, so you must select a different tab as the source.

**Browser requirement:** This feature requires Chrome 107 or later. It is available in all Chromium-based browsers (Chrome, Edge, Brave). Firefox and Safari do not support `selfBrowserSurface` and will not show tab options in the sharing dialog.

### Step-by-step walkthrough

1. **Go to the App page.** Click **New Recording** in the sidebar, or click the Chrome Extension button at the bottom of the sidebar.

2. **Open a content tab.** Open a new browser tab and navigate to the site with the audio you want to record (e.g., YouTube, Udemy, Coursera, a webinar platform). Start the video or audio playing.

3. **In the ScreenApp modal, enable Tab Audio.** Toggle the **Tab Audio** switch to the ON position (blue). You can also leave **Microphone** on if you want both your voice and the tab audio recorded together.

4. **Click Start Recording.** The Chrome sharing dialog will appear.

5. **In the Chrome dialog:**
   - Select the **Chrome Tab** tab at the top (not "Entire Screen" and not an application window).
   - You will see a list of your open tabs. Select the tab that is playing the audio.
   - **Important:** Check the **"Share tab audio"** checkbox at the bottom of the dialog.
   - Click **Share**.

6. **Recording starts.** You will see the recording indicator in the ScreenApp modal turn red and the timer will start counting. Audio waveform bars will animate to show live audio levels.

7. **Pause and resume as needed.** Use the pause button to pause recording and resume when ready.

8. **Stop and save.** Click **Stop & Save**. The recording will be saved and appear in your Recent Recordings list with a title like "Tab Audio - 10:30 AM".

### Visual confirmation of tab audio being captured

- The waveform visualization should show active audio bars. If the bars are flat, no audio is being captured.
- The recording indicator in the top-left of the dialog should show the word "Tab audio" next to the timer.
- In the saved recording title, the source will be labeled as "Tab Audio".

### Common issues

| Problem | Solution |
|---------|----------|
| Dialog shows no tabs, only "Entire Screen" and application windows | Your browser may not support tab audio sharing. Use Chrome or Edge. |
| "No tab audio detected" alert on save | The "Share tab audio" checkbox was not checked. Stop the current stream, click Start Recording again, and make sure to check the checkbox. |
| Tab audio is silent or very low quality | Some sites block tab audio at the OS level. Try selecting "Entire Screen" instead, or use the microphone option. |
| ScreenApp tab appears in the picker | This should not happen with `selfBrowserSurface: 'exclude'` set. If it does, ensure you are using the latest version of Chrome. |

---

## Troubleshooting Common Issues

### Backend won't start -- MongoDB connection error

```
pymongo.errors.ConfigurationError: DNS的问...
```

This usually means the connection string has an incorrect username, password, or cluster name. Double-check:
- The username and password in the connection string match exactly what you set in MongoDB Atlas (the password may contain special characters that need URL encoding).
- Your IP address is allowlisted in MongoDB Atlas **Security > Network Access**.
- The cluster name in the connection string matches your actual cluster name.

### Backend won't start -- Anthropic API key not found

```
KeyError: 'ANTHROPIC_API_KEY'
```

Make sure the `ANTHROPIC_API_KEY` is set in `backend/.env` and that you started the backend server from the `backend/` directory (so the `.env` file is in the right place).

### Frontend shows a blank white screen

- Open the browser console (F12 > Console). Look for red error messages.
- If you see module not found errors, run `yarn install` in the frontend directory.
- If you see CORS errors, ensure `http://localhost:3000` is listed in `CORS_ORIGINS` in `backend/.env` and restart the backend.

### Tab audio not working

- Confirm you are using Chrome or Edge (not Firefox or Safari).
- Ensure the "Share tab audio" checkbox is checked in the Chrome dialog.
- Some enterprise or managed Chrome versions disable tab audio capture. Try using "Entire Screen" with system audio instead.
- If the waveform stays flat during tab recording, no audio stream was captured. Stop and retry.

### `yarn install` fails with permission errors

On Windows, run PowerShell as Administrator, or use:
```bash
npm install --global yarn
yarn install
```

### Port 3000 already in use

The frontend will automatically use the next available port (3001, 3002, etc.). Open the URL shown in the terminal.

---

## Deployment Options

### Option 1: Render.com (Recommended for Beginners)

Render offers a free tier for both web services and background workers.

**Backend deployment:**

1. Push your code to GitHub.
2. Go to [https://render.com](https://render.com) and sign up.
3. Click **New > Web Service**.
4. Connect your GitHub repository.
5. Configure:
   - **Root Directory:** `backend`
   - **Build Command:** `pip install -r requirements.txt`
   - **Start Command:** `uvicorn server:app --host 0.0.0.0 --port $PORT`
6. Add environment variables from your `.env` file (MONGO_URL, DB_NAME, ANTHROPIC_API_KEY, CORS_ORIGINS).
7. Click **Create Web Service**.

**Frontend deployment:**

1. In the Render dashboard, click **New > Web Service**.
2. Connect the same repository.
3. Configure:
   - **Root Directory:** `frontend`
   - **Build Command:** `yarn install && yarn build`
   - **Start Command:** Leave blank (static site)
4. Set `CORS_ORIGINS` in the backend to include the Render frontend URL.
5. Deploy.

Note: For the frontend on Render, you may want to use a separate service like **Netlify** or **Vercel** for easier static site hosting:
- `netlify deploy --dir=build --prod` (after `yarn build`)
- `vercel --prod` (after `yarn build`)

### Option 2: Railway

Railway is simple to use and offers a generous free tier.

1. Push to GitHub.
2. Go to [https://railway.app](https://railway.app) and sign up.
3. Click **New Project > Deploy from GitHub repo**.
4. Select the repository.
5. Railway will auto-detect the frontend and backend. Configure the start command:
   - Backend: `cd backend && uvicorn server:app --host 0.0.0.0 --port $PORT`
6. Add environment variables from your `.env` file.
7. Railway will assign a public URL. Update `CORS_ORIGINS` to include this URL.

### Option 3: VPS (DigitalOcean, Linode, Hetzner)

For full control, deploy to a VPS with Ubuntu 22.04+.

**Server setup:**

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Install Python 3.11
sudo apt install -y python3.11 python3.11-venv python3-pip

# Install Nginx
sudo apt install -y nginx

# Clone and setup
cd /opt
git clone <your-repo>
cd screenapp/backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

**Systemd service for the backend:**

```ini
# /etc/systemd/system/screenapp-backend.service
[Unit]
Description=ScreenApp Backend
After=network.target

[Service]
User=www-data
WorkingDirectory=/opt/screenapp/backend
Environment="PATH=/opt/screenapp/backend/venv/bin"
ExecStart=/opt/screenapp/backend/venv/bin/uvicorn server:app --host 127.0.0.1 --port 8000
Restart=always

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl enable screenapp-backend
sudo systemctl start screenapp-backend
```

**Nginx reverse proxy for frontend + backend:**

```nginx
# /etc/nginx/sites-available/screenapp
server {
    listen 80;
    server_name your-domain.com;

    # Frontend (built static files served by nginx)
    location / {
        root /opt/screenapp/frontend/build;
        try_files $uri $uri/ /index.html;
    }

    # Backend API
    location /api/ {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/screenapp /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

**SSL with Certbot:**

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

### Quick Comparison

| Option | Cost | Complexity | Best For |
|--------|------|-------------|----------|
| Render.com | Free tier available | Low | Quick hobby projects, prototypes |
| Railway | Free tier + paid plans | Low | Startups, small teams |
| VPS (DigitalOcean) | From $4/mo | Medium | Full control, production apps |
| Vercel + Railway | Free tiers | Low | Frontend on Vercel, backend on Railway |

---

## Environment Variables Reference

See `backend/.env.example` for the full list. Here is a more detailed breakdown:

| Variable | Required | Description |
|----------|----------|-------------|
| `MONGO_URL` | Yes | MongoDB Atlas connection string. Format: `mongodb+srv://user:pass@cluster.mongodb.net/?retryWrites=true&w=majority` |
| `DB_NAME` | Yes | Name of your MongoDB database. Created automatically on first write. |
| `ANTHROPIC_API_KEY` | Yes | Your Anthropic API key (starts with `sk-ant-`). Get it from console.anthropic.com |
| `CORS_ORIGINS` | Yes | Comma-separated list of frontend URLs allowed to call this API. Must not have spaces around commas. |
| `HOST` | No | Server bind address. Default: `0.0.0.0` |
| `PORT` | No | Server port. Default: `8000` |

