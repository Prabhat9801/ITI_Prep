# Backend Deployment (Render)

Instructions to deploy the FastAPI backend to Render.

## Settings
- **Service Type:** Web Service
- **Root Directory:** `backend`
- **Environment:** `Python 3`
- **Build Command:** `pip install -r requirements.txt`
- **Start Command:** `uvicorn main:app --host 0.0.0.0 --port $PORT`

## Environment Variables
- `GROQ_API_KEY`: Required
- `CEREBRAS_API_KEY`: Required
- `MISTRAL_API_KEY`: Required
- `DATABASE_URL`: (Optional) PostgreSQL URL for permanent storage.

## Notes
- The background question generator runs every 15 minutes as long as the service is active.
- On the Free Tier, the database resets on every redeploy unless `DATABASE_URL` is used.
