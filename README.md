# Email Spam Detector

`plain text → CountVectorizer (cv.pkl) → MultinomialNB (clf.pkl) → 1 = SPAM / else NOT SPAM`

- `backend/` – FastAPI (`POST /api/predict {"text": "..."}`); in production it also serves the built React app
- `frontend/` – React + Vite single page

## Run locally

```bash
cd backend
python -m venv .venv
.venv/Scripts/pip install -r requirements.txt   # Linux/mac: .venv/bin/pip
.venv/Scripts/python -m uvicorn main:app --port 8000
```

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:5173 (Vite forwards `/api` to the backend).

Run the backend tests: `cd backend && pytest` (needs `pip install pytest httpx`).

## CI/CD (GitHub Actions → VPS)

`.github/workflows/deploy.yml`:

- **build** (every push / PR): runs pytest and builds the frontend
- **deploy** (push to `main` only): builds the frontend, copies it to `backend/static` on the
  server, then `git pull`, `pip install` and `systemctl restart fraud-detection`

The app listens on `127.0.0.1:8001` (port 8000 is left for the other FastAPI app).
NGINX sits in front of it on ports 80/443 and handles the domain and HTTPS.

```
browser ──https──▶ NGINX (:443) ──▶ uvicorn 127.0.0.1:8001 (systemd service)
```

## VPS setup (one time)

All commands run on the VPS (Ubuntu/Debian) as your normal user.
First set your domain once in the terminal (used by the commands below):

```bash
DOMAIN=spam.example.com
```

### 1. Packages

```bash
sudo apt update
sudo apt install -y git python3 python3-venv nginx curl
```

Python 3.10+ is required (`python3 --version`).

### 2. Get the code

```bash
mkdir -p ~/app/src && cd ~/app/src
git clone https://github.com/parsanoroozi/Fraud-Detection.git
cd Fraud-Detection
python3 -m venv venv
venv/bin/pip install -r backend/requirements.txt
```

### 3. systemd service (auto-start on boot, auto-restart on crash)

```bash
sudo cp deploy/fraud-detection.service /etc/systemd/system/
sudo sed -i "s/YOUR_USER/$USER/g" /etc/systemd/system/fraud-detection.service
sudo systemctl daemon-reload
sudo systemctl enable --now fraud-detection   # enable = start on every reboot
```

Check it:

```bash
sudo systemctl status fraud-detection
curl http://127.0.0.1:8001/api/health          # {"status":"ok"}
```

The page itself appears after the first CI/CD deploy (it copies the built frontend).

### 4. Domain name

At your domain registrar / DNS provider, add a record:

| Type | Name | Value |
|------|------|-------|
| A | `spam` (or `@` for the root domain) | your VPS IP |

Wait until it resolves to your IP: `ping $DOMAIN`.

### 5. NGINX

```bash
sudo cp deploy/nginx.conf /etc/nginx/sites-available/fraud-detection
sudo sed -i "s/YOUR_DOMAIN/$DOMAIN/g" /etc/nginx/sites-available/fraud-detection
sudo ln -s /etc/nginx/sites-available/fraud-detection /etc/nginx/sites-enabled/
sudo nginx -t                    # test config
sudo systemctl enable nginx      # start on boot
sudo systemctl reload nginx
```

Now `http://<your domain>` should show the app.

### 6. Firewall (ufw)

> ⚠️ Allow your SSH port **before** enabling ufw, or you will lock yourself out.
> If SSH runs on a custom port (your `PROD_PORT`), use that number instead of `OpenSSH`.

```bash
sudo ufw allow OpenSSH          # or: sudo ufw allow <PROD_PORT>/tcp
sudo ufw allow 'Nginx Full'     # ports 80 + 443
sudo ufw enable
sudo ufw status
```

Port 8001 stays closed to the outside — only NGINX talks to it.
Also open ports 80/443 in your VPS provider's panel if it has its own firewall.

### 7. SSL / HTTPS (free, Let's Encrypt)

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d $DOMAIN
```

Pick the option to **redirect HTTP to HTTPS**. Certbot edits the NGINX config for you and
sets up auto-renewal. Test renewal with:

```bash
sudo certbot renew --dry-run
```

Now open `https://<your domain>`. 🎉

### 8. GitHub secrets (for CI/CD)

Repo → Settings → Environments → **production** → add secrets:
`PROD_HOST`, `PROD_PORT`, `PROD_USERNAME`, `PROD_PASSWORD`

Every push to `main` now deploys automatically.

## Useful commands on the VPS

```bash
sudo systemctl status fraud-detection      # is it running?
sudo journalctl -u fraud-detection -f      # live app logs
sudo systemctl restart fraud-detection     # restart app
sudo tail -f /var/log/nginx/error.log      # nginx errors
sudo reboot                                # app + nginx come back automatically
```
