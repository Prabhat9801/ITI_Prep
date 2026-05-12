# Deployment Guide (Render)

This project is optimized for deployment on [Render](https://render.com/). The Frontend will be hosted as a **Static Site** (Free & Fast) and the Backend as a **Web Service**.

> [!TIP]
> **Smart Anti-Sleep Feature:** The frontend includes an auto-ping mechanism. As long as a student has the dashboard open, it pings the backend every 5 minutes. This prevents the Render Free Tier backend from sleeping while users are active!

---

## Part 1: Deploy the Backend (Web Service)

1. Go to your [Render Dashboard](https://dashboard.render.com/) and click **New+** -> **Web Service**.
2. Connect your GitHub repository.
3. Use the following settings:
   - **Name:** `ai-prep-backend`
   - **Root Directory:** `backend`
   - **Environment:** `Python 3`
   - **Build Command:** `pip install -r requirements.txt`
   - **Start Command:** `uvicorn main:app --host 0.0.0.0 --port $PORT`
4. **Environment Variables:**
   - Click **Advanced** -> **Add Environment Variable**:
     - `GROQ_API_KEY`: [Your Groq Key]
     - `CEREBRAS_API_KEY`: [Your Cerebras Key]
     - `MISTRAL_API_KEY`: [Your Mistral Key]
     - `DATABASE_URL`: (Optional) Use a Supabase or Neon PostgreSQL URL to keep your data permanent. If left empty, it will use local SQLite (resets on redeploy).
5. Click **Create Web Service**. 
6. Once deployed, copy the backend URL (e.g., `https://ai-prep-backend.onrender.com`).

---

## Part 2: Deploy the Frontend (Static Site)

1. Go to your Render Dashboard and click **New+** -> **Static Site**.
2. Connect the same GitHub repository.
3. Use the following settings:
   - **Name:** `ai-prep-frontend`
   - **Root Directory:** `frontend`
   - **Build Command:** `npm install && npm run build`
   - **Publish Directory:** `dist`
4. **Environment Variables:**
   - Add `VITE_API_BASE_URL`: `https://ai-prep-backend.onrender.com/api` (Use your actual backend URL).
5. Click **Create Static Site**.
6. **Handling Navigation (Crucial):**
   - Go to your Frontend's Render settings -> **Redirects/Rewrites**.
   - Add a rule:
     - **Source:** `/*`
     - **Destination:** `/index.html`
     - **Action:** `Rewrite`
   - This ensures that refreshing pages like `/history` or `/practice` doesn't result in a 404.

---

## 📋 Database Persistence (Important)

Render's Free Tier web services have an ephemeral file system. This means your SQLite database (`app.db`) will be **deleted** every time the server restarts or you redeploy code.

**How to keep your data permanent:**
1. **Free Option (Recommended):** Create a free PostgreSQL database on [Supabase](https://supabase.com/) or [Neon.tech](https://neon.tech/).
2. Copy the **Connection String** (URL).
3. Add it as an environment variable in Render Backend settings: `DATABASE_URL=postgresql://user:pass@host:port/dbname`.
4. The system will automatically detect this and use the permanent cloud database instead of SQLite.

---

## Done! 🎉
Your Fullstack AI Tutor is now live. The **Question Bank** will grow organically as students take quizzes, and the **Background Generator** will keep adding questions every 15 minutes as long as the backend is awake!
