# Frontend Deployment (Render)

Instructions to deploy the Vite React frontend to Render.

## Settings
- **Service Type:** Static Site
- **Root Directory:** `frontend`
- **Build Command:** `npm install && npm run build`
- **Publish Directory:** `dist`

## Environment Variables
- `VITE_API_BASE_URL`: The URL of your deployed backend (e.g., `https://your-backend.onrender.com/api`).

## Important: Redirects
To handle React routing (SPA) correctly, you MUST add a rewrite rule in Render settings:
- **Source:** `/*`
- **Destination:** `/index.html`
- **Action:** `Rewrite`
