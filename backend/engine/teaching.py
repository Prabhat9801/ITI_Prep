"""Teaching Engine v2 - Multi-AI powered explanations and quiz generation."""
from engine.ai_providers import call_ai, get_available_providers
import json
import re

# ─── System Prompts ─────────────────────────────────────────────────

TEACHER_SYSTEM_PROMPT = """Tu ek expert teacher hai jo BTSC ITI Instructor exam ki tayyari karwa raha hai.
Subject: Electronics / Communication / Physics / Mathematics / Chemistry aur related subjects.

RULES:
1. Hindi + Hinglish mein samjha (student comfortable feel kare)
2. Real-life examples de jo relatable hon
3. Step by step explain kar - pehle simple, phir deep
4. Jargon avoid kar, simple language use kar
5. Har section ke baad ek chhota summary de
6. Student ko encourage kar
7. Important points ko bold kar aur emoji use kar

FORMAT (strictly follow):
📌 **Definition:** [simple definition Hindi mein]
🔍 **Concept:** [detailed explanation with analogy]
⚙️ **Working/Details:** [kaise kaam karta hai / detailed theory]
💡 **Real-Life Example:** [practical example]
✅ **Key Points to Remember:**
- Point 1
- Point 2
- Point 3

🧠 **Quick Revision Questions:**
1. Question 1?
2. Question 2?
3. Question 3?
"""

QUIZ_GENERATE_PROMPT = """Tu ek expert MCQ question generator hai for BTSC ITI Instructor exam.

STRICT RULES:
1. Sirf THEORY based questions banao - NO numerical calculations
2. Questions aur Options sirf aur sirf **ROMAN HINGLISH + TECHNICAL ENGLISH** mein likho (jaise: "Circuit me resistance kaise measure karte hain?").
3. Har question ka explanation Roman Hinglish mein de.
4. Difficulty level follow kar: easy, medium, hard
5. Output MUST be valid JSON array - nothing else, no markdown, no explanation before/after
6. NEVER use pure English or pure Hindi scripts (Devanagari) - always mix Hindi words written in English alphabet with Technical terms.

EXAMPLE STYLE:
- "Kirchhoff ka Current Law (KCL) kya kehta hai?" ✅
- "What does Kirchhoff's Current Law state?" ❌ (ye mat likho)

OUTPUT FORMAT (strict JSON array):
[
  {
    "q": "Question Hinglish mein yahan?",
    "a": "Option A Hinglish mein",
    "b": "Option B Hinglish mein",
    "c": "Option C Hinglish mein",
    "d": "Option D Hinglish mein",
    "ans": "A",
    "diff": "easy",
    "lvl": "ITI",
    "type": "concept",
    "exp": "Explanation Hinglish mein - kyun ye sahi hai",
    "why_wrong": "Baaki options kyun galat hain - ek ek karke batao"
  }
]
"""


QUESTION_EXPLAIN_PROMPT = """Tu ek teacher hai. Student ne ek MCQ attempt kiya hai. 
Usko samjha ki:
1. Sahi answer kyun sahi hai - detail mein
2. Baaki options kyun galat hain - ek ek karke
3. Concept clearly explain kar Hindi mein
4. Ek real life example de taaki yaad rahe
5. Ek tip de exam ke liye"""


# ─── Teaching Functions ──────────────────────────────────────────────

def teach_topic(topic_name: str, level: str = "basic", provider: str = "auto", subtopics: list = None) -> str:
    """Generate teaching content for a topic using selected AI provider."""
    level_map = {
        "basic": "ITI level - bahut simple bhasha mein, jaise 10th class ke student ko samjha rahe ho. Short sentences, easy words.",
        "intermediate": "Diploma level - thoda detail mein, diagrams describe kar, formulas explain kar, working principle batao.",
        "advanced": "B.Tech level - deep theory, derivations mention kar, advanced applications batao, competitive exam level."
    }
    
    level_desc = level_map.get(level, level_map["basic"])
    
    subtopic_text = ""
    if subtopics:
        subtopic_text = f"\n\nIs topic ke andar ye subtopics cover karne hain:\n" + "\n".join(f"- {s}" for s in subtopics)
    
    messages = [
        {"role": "system", "content": TEACHER_SYSTEM_PROMPT},
        {"role": "user", "content": f"Mujhe '{topic_name}' ke baare mein padha. Level: {level_desc}. Pura topic cover kar detail mein.{subtopic_text}"}
    ]
    
    if provider == "auto":
        provider = _pick_best_provider()
    
    result = call_ai(provider, messages, temperature=0.7, max_tokens=3000)
    return result


def explain_answer(question: str, correct: str, selected: str, options: dict, provider: str = "auto") -> str:
    """Explain why an answer is correct/wrong."""
    if provider == "auto":
        provider = _pick_best_provider()
    
    messages = [
        {"role": "system", "content": QUESTION_EXPLAIN_PROMPT},
        {"role": "user", "content": f"Question: {question}\nOptions: A) {options.get('a','')} B) {options.get('b','')} C) {options.get('c','')} D) {options.get('d','')}\nCorrect Answer: {correct}\nStudent ne choose kiya: {selected}\nExplain kar kyun {correct} sahi hai aur baaki galat."}
    ]
    
    result = call_ai(provider, messages, temperature=0.7, max_tokens=1500)
    return result


def chat_with_teacher(message: str, context: str = "", provider: str = "auto", history: list = None) -> str:
    """General chat with AI teacher."""
    if provider == "auto":
        provider = _pick_best_provider()
    
    messages = [{"role": "system", "content": TEACHER_SYSTEM_PROMPT}]
    
    if context:
        messages.append({"role": "system", "content": f"Current topic context: {context}. Student is currently studying this topic. Answer in this context."})
    
    # Add chat history for continuity
    if history:
        for h in history[-6:]:  # Last 6 messages for context
            messages.append({"role": h["role"], "content": h["content"]})
    
    messages.append({"role": "user", "content": message})
    
    result = call_ai(provider, messages, temperature=0.7, max_tokens=2000)
    return result


def generate_quiz(subject: str, topic: str, count: int = 5, difficulty: str = "mixed", provider: str = "auto") -> list:
    """Generate quiz questions using AI for a specific topic."""
    if provider == "auto":
        provider = _pick_best_provider()
    
    diff_instruction = ""
    if difficulty != "mixed":
        diff_instruction = f"Sabhi questions ka difficulty level '{difficulty}' rakho."
    else:
        diff_instruction = "Mix karo - 2 easy, 2 medium, 1 hard."
    
    messages = [
        {"role": "system", "content": QUIZ_GENERATE_PROMPT},
        {"role": "user", "content": f"""Generate exactly {count} MCQ questions for:
Subject: {subject}
Topic: {topic}
{diff_instruction}

IMPORTANT: Output ONLY a valid JSON array. No markdown, no code blocks, no extra text.
Start with [ and end with ].
"""}
    ]
    
    result = call_ai(provider, messages, temperature=0.8, max_tokens=4000)
    
    # Parse JSON from response
    try:
        # Clean response - remove markdown code blocks if any
        cleaned = result.strip()
        cleaned = re.sub(r'^```json\s*', '', cleaned)
        cleaned = re.sub(r'^```\s*', '', cleaned)
        cleaned = re.sub(r'\s*```$', '', cleaned)
        cleaned = cleaned.strip()
        
        # Find JSON array
        start = cleaned.find('[')
        end = cleaned.rfind(']')
        if start != -1 and end != -1:
            json_str = cleaned[start:end+1]
            questions = json.loads(json_str)
            return questions
        
        return json.loads(cleaned)
    except json.JSONDecodeError:
        return []


def _pick_best_provider() -> str:
    """Pick the best available provider (prefer fast + free)."""
    providers = get_available_providers()
    if not providers:
        return "none"
    
    # Priority: cerebras > groq > grok > mistral > openai
    priority = ["cerebras", "groq", "grok", "mistral", "openai"]
    for p in priority:
        if any(prov["id"] == p for prov in providers):
            return p
    
    return providers[0]["id"]


# ─── Offline Fallbacks ───────────────────────────────────────────────

def get_offline_content(topic: str, level: str) -> str:
    """Fallback content when AI is not available."""
    return f"""📌 **{topic}**

🔍 **Concept:**
{topic} electronics ka ek important topic hai. Yeh concept exam mein frequently poocha jaata hai.

⚙️ **Working:**
Is topic ko samajhne ke liye basic electronics ki understanding zaroori hai. Step by step practice karein.

💡 **Example:**
Real life mein {topic} ka use bahut jagah hota hai - electronic devices, circuits, aur instruments mein.

✅ **Key Points:**
- Yeh topic {level} level par important hai
- Exam mein 2-3 questions aate hain is topic se
- Practice questions solve karein understanding ke liye

⚠️ **Note:** AI teacher abhi offline hai. API key set karein detailed explanations ke liye.

❓ **Self-Check Questions:**
1. {topic} ki basic definition kya hai?
2. {topic} ka practical use kahan hota hai?
3. {topic} se related koi formula yaad hai?"""
