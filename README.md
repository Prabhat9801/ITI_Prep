# 🎓 AI Tutor Platform

A next-generation, fully responsive interactive learning platform designed for exam preparation. Built with a smart, multi-provider AI backend that teaches theory, generates dynamic quizzes, and answers doubts in Hinglish.

## ✨ Core Features

- **Smart Multi-AI Engine:** Seamlessly integrates Groq (Llama), Cerebras, Mistral, and OpenAI.
- **Auto-Failover Key Rotation:** The system supports up to 100 backup API keys per provider. If an AI provider hits a rate limit or goes down, the system automatically falls back to the next key or the next provider without interrupting the user experience.
- **Interactive "Learn" Hub:** Replaces static reading with dynamic, AI-generated theory, examples, and chat.
- **Hinglish AI Quiz Generator:** Instantly generates dynamic, topic-specific MCQs in Hindi & Hinglish.
- **Anti-Sleep Architecture:** Specially designed for free-tier deployments (like Render) with background pinging to prevent server sleep during active usage.
- **Fully Responsive UI:** A premium, glassmorphism design that works flawlessly on Mobile, Tablet, and Desktop.

## 📂 Project Structure

- `/frontend` - React.js (Vite) frontend with Tailwind CSS and Lucide Icons.
- `/backend` - FastAPI Python backend with dynamic AI routing and SQLite database.

## 🚀 Quick Links
- **[Local Setup Guide](setup.md)**
- **[Render Deployment Guide](render_deployment.md)**

## 🛡️ License
This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
