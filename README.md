# Email Spam Detector

`plain text → CountVectorizer (cv.pkl) → MultinomialNB (clf.pkl) → 1 = SPAM / else NOT SPAM`

- `backend/` – FastAPI (`POST /api/predict {"text": "..."}`), also serves the built React app
- `frontend/` – React + Vite single page
- One Docker image, one container, port 80 on the VPS

## Run locally

```bash
docker compose up --build
```
Open http://localhost

## CI/CD (GitHub Actions)

On every push to `main`: build image → push to `ghcr.io/<you>/<repo>` → SSH into VPS → `docker compose pull && up -d`.

### One-time setup

1. **VPS**: install Docker (`curl -fsSL https://get.docker.com | sh`) and add your user to the docker group (`sudo usermod -aG docker $USER`).
2. **SSH key** for GitHub Actions (on your machine):
   ```bash
   ssh-keygen -t ed25519 -f deploy_key -N ""
   ```
   Append `deploy_key.pub` to `~/.ssh/authorized_keys` on the VPS.
3. **GitHub repo → Settings → Secrets and variables → Actions**, add:
   - `VPS_HOST` – server IP
   - `VPS_USER` – ssh user
   - `VPS_SSH_KEY` – contents of `deploy_key` (private key)
4. Push to `main`. Watch it in the **Actions** tab.
