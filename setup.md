# Local Setup Guide

Welcome to the AI Tutor Platform! Follow these steps to get the project running locally.

## Prerequisites
- **Node.js** (v18 or higher)
- **Python** (v3.10 or higher)
- **Git**

## 1. Backend Setup (FastAPI)
The backend powers the AI integrations, database, and logic.

```bash
# Navigate to the backend folder
cd backend

# Create a virtual environment
python -m venv .venv

# Activate the virtual environment
# On Windows:
.venv\Scripts\activate
# On Mac/Linux:
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Start the server
uvicorn main:app --reload
```
The backend will run on `http://127.0.0.1:8000`.

## 2. Environment Variables (.env)
In the `backend` folder, you will find a `.env` file. Open it and paste your API keys for the AI providers (Groq, Cerebras, Mistral, OpenAI). You can add up to 100 backup keys for each provider by naming them `GROQ_API_KEY_1`, `GROQ_API_KEY_2`, etc.

## 3. Frontend Setup (React/Vite)
The frontend provides the user interface.

```bash
# Open a new terminal and navigate to the frontend folder
cd frontend

# Install dependencies
npm install

# Start the development server
npm run dev
```
The frontend will run on `http://localhost:5173`. Open this URL in your browser to start using the app!
