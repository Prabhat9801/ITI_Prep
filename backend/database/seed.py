"""Database seeding - populates syllabus, topics, and questions."""
from sqlalchemy.orm import Session
from database.models import Subject, Topic, Subtopic, Question, StudyPlan
from data.questions_seed import QUESTIONS
import json
import random
import os

FIFTEEN_DAY_PLAN = [
    {"day": 1, "title": "Electricity Basics & Components", "title_hi": "बिजली की मूल बातें और कंपोनेंट्स", "type": "learning", "target_q": 100},
    {"day": 2, "title": "Circuit Analysis & AC Circuits", "title_hi": "सर्किट विश्लेषण और AC सर्किट", "type": "learning", "target_q": 100},
    {"day": 3, "title": "Network Theorems & Semiconductors", "title_hi": "नेटवर्क प्रमेय और सेमीकंडक्टर", "type": "learning", "target_q": 120},
    {"day": 4, "title": "Diodes & BJT Transistors", "title_hi": "डायोड और BJT ट्रांजिस्टर", "type": "learning", "target_q": 150},
    {"day": 5, "title": "FET, MOSFET & Amplifiers", "title_hi": "FET, MOSFET और एम्पलीफायर", "type": "learning", "target_q": 150},
    {"day": 6, "title": "Number Systems & Logic Gates", "title_hi": "संख्या प्रणाली और लॉजिक गेट्स", "type": "learning", "target_q": 120},
    {"day": 7, "title": "Combinational & Sequential Circuits", "title_hi": "कॉम्बिनेशनल और सीक्वेंशियल सर्किट", "type": "learning", "target_q": 120},
    {"day": 8, "title": "ADC/DAC & Measuring Instruments", "title_hi": "ADC/DAC और मापक यंत्र", "type": "learning", "target_q": 100},
    {"day": 9, "title": "Advanced Instruments & Communication", "title_hi": "एडवांस्ड इंस्ट्रूमेंट्स और संचार", "type": "learning", "target_q": 100},
    {"day": 10, "title": "Microprocessor & Microcontroller", "title_hi": "माइक्रोप्रोसेसर और माइक्रोकंट्रोलर", "type": "learning", "target_q": 100},
    {"day": 11, "title": "Mathematics Revision + Mixed Practice", "title_hi": "गणित रिवीजन + मिक्स्ड प्रैक्टिस", "type": "practice", "target_q": 200},
    {"day": 12, "title": "Physics + Weak Area Practice", "title_hi": "भौतिकी + कमजोर क्षेत्र अभ्यास", "type": "practice", "target_q": 200},
    {"day": 13, "title": "Full Mixed Practice - All Subjects", "title_hi": "पूर्ण मिश्रित अभ्यास", "type": "practice", "target_q": 250},
    {"day": 14, "title": "Full Mock Test Day", "title_hi": "पूर्ण मॉक टेस्ट दिवस", "type": "mock", "target_q": 300},
    {"day": 15, "title": "Final Revision & Weak Areas", "title_hi": "अंतिम रिवीजन और कमजोर क्षेत्र", "type": "revision", "target_q": 200},
]

def load_syllabus_json():
    syllabus_path = os.path.join(os.path.dirname(__file__), "..", "data", "syllabus.json")
    if not os.path.exists(syllabus_path):
        return []
    with open(syllabus_path, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    icons = ['⚡', '🔬', '💻', '📏', '📡', '🔧', '📐', '🔭', '🧪', '🗣️', '✏️', '🛠️', '🧘', '🖥️', '💡', '⚙️', '🌿', '🔌', '⏱️', '🕸️', '🤖', '📺', '📶', '🧰', '📟', '🧠', '📱', '🏭', '🌐']
    colors = ['#6366F1', '#EC4899', '#10B981', '#F59E0B', '#8B5CF6', '#EF4444', '#0EA5E9', '#14B8A6', '#F43F5E', '#64748B', '#D946EF', '#22C55E', '#3B82F6', '#F97316', '#475569']
    
    syllabus_py = []
    order = 1
    for subj in data.get('syllabus', []):
        name = subj.get('subject_name', '')
        topics = []
        if 'units' in subj:
            for unit in subj['units']:
                topic_name = unit.get('unit_title', '')
                subtopics = [{"name": st, "name_hi": st} for st in unit.get('topics', [])]
                topics.append({"name": topic_name, "name_hi": topic_name, "day": order, "subtopics": subtopics})
        elif 'topics' in subj:
            for t in subj['topics']:
                topics.append({"name": t, "name_hi": t, "day": order, "subtopics": []})
        if not topics:
            topics = [{"name": "General Theory", "name_hi": "सामान्य सिद्धांत", "day": order, "subtopics": [{"name": "Core Concepts", "name_hi": "मूल अवधारणाएँ"}]}]
        syllabus_py.append({
            "name": name, "name_hi": name,
            "icon": icons[(order-1) % len(icons)],
            "color": colors[(order-1) % len(colors)],
            "order": order, "target_questions": 1000,
            "topics": topics
        })
        order += 1
    return syllabus_py

def seed_database(db: Session):
    """Seed all data into the database."""
    existing = db.query(Subject).first()
    if existing:
        return False  # Already seeded

    SYLLABUS = load_syllabus_json()

    # Seed subjects, topics, subtopics
    for subj_data in SYLLABUS:
        subject = Subject(
            name=subj_data["name"],
            name_hi=subj_data["name_hi"],
            icon=subj_data["icon"],
            color=subj_data["color"],
            order_index=subj_data["order"],
            total_questions=subj_data["target_questions"]
        )
        db.add(subject)
        db.flush()

        for topic_data in subj_data["topics"]:
            topic = Topic(
                subject_id=subject.id,
                name=topic_data["name"],
                name_hi=topic_data["name_hi"],
                day_number=topic_data.get("day"),
                order_index=subj_data["topics"].index(topic_data)
            )
            db.add(topic)
            db.flush()

            for st_data in topic_data.get("subtopics", []):
                subtopic = Subtopic(
                    topic_id=topic.id,
                    name=st_data["name"],
                    name_hi=st_data["name_hi"],
                    order_index=topic_data["subtopics"].index(st_data)
                )
                db.add(subtopic)
            db.flush()

    db.commit()

    # Seed questions
    subjects_map = {s.name: s for s in db.query(Subject).all()}
    
    for subj_name, questions in QUESTIONS.items():
        subject = subjects_map.get(subj_name)
        if not subject:
            continue
        
        first_topic = db.query(Topic).filter(Topic.subject_id == subject.id).first()
        topics = db.query(Topic).filter(Topic.subject_id == subject.id).all()
        
        for i, q_data in enumerate(questions):
            # Distribute questions across topics
            topic = topics[i % len(topics)] if topics else first_topic
            
            # Shuffle options randomly
            res = shuffle_options(q_data)
            if not res or res[0] is None:
                continue
                
            a_val, b_val, c_val, d_val, correct_ans = res
            
            question = Question(
                subject_id=subject.id,
                topic_id=topic.id if topic else None,
                question_text=q_data["q"],
                option_a=a_val,
                option_b=b_val,
                option_c=c_val,
                option_d=d_val,
                correct_answer=correct_ans,
                difficulty=q_data.get("diff", "medium"),
                exam_level=q_data.get("lvl", "ITI"),
                question_type=q_data.get("type", "concept"),
                explanation=q_data.get("exp", ""),
                why_others_wrong=q_data.get("why_wrong", "")
            )
            db.add(question)
    
    db.commit()

    # Generate additional questions programmatically
    generate_extra_questions(db)

    # Seed 15-day plan
    for plan_data in FIFTEEN_DAY_PLAN:
        plan = StudyPlan(
            day_number=plan_data["day"],
            title=plan_data["title"],
            title_hi=plan_data["title_hi"],
            plan_type=plan_data["type"],
            target_questions=plan_data["target_q"],
            target_accuracy=70.0
        )
        db.add(plan)
    
    db.commit()
    return True


def shuffle_options(q_data):
    try:
        # Validate all required keys exist
        required = ["a", "b", "c", "d", "ans"]
        for key in required:
            if key not in q_data:
                return None, None, None, None, None

        options = [
            ("A", q_data["a"]),
            ("B", q_data["b"]),
            ("C", q_data["c"]),
            ("D", q_data["d"])
        ]
        
        # Find correct value
        correct_key = q_data["ans"]
        correct_val = q_data.get(correct_key.lower())
        if not correct_val:
             # Fallback if ans is something else
             correct_val = q_data["a"]
        
        random.shuffle(options)
        new_ans = "A" if options[0][1] == correct_val else "B" if options[1][1] == correct_val else "C" if options[2][1] == correct_val else "D"
        return options[0][1], options[1][1], options[2][1], options[3][1], new_ans
    except Exception:
        return None, None, None, None, None


def generate_extra_questions(db: Session):
    """Generate additional MCQs programmatically from templates."""
    templates = [
        # Basic Electronics extras
        {"subj": "Basic Electronics", "q": "Agar 3 resistor 10Ω, 20Ω, 30Ω series mein hain toh total resistance?", "a": "60Ω", "b": "5.45Ω", "c": "20Ω", "d": "30Ω", "ans": "A", "diff": "easy", "lvl": "ITI", "type": "numerical",
         "exp": "Series mein R_total = R1+R2+R3 = 10+20+30 = 60Ω"},
        {"subj": "Basic Electronics", "q": "Parallel mein 2 equal resistance R hain toh equivalent?", "a": "R/2", "b": "2R", "c": "R", "d": "R²", "ans": "A", "diff": "easy", "lvl": "ITI", "type": "numerical",
         "exp": "2 equal R parallel mein: R_eq = R×R/(R+R) = R²/2R = R/2"},
        {"subj": "Basic Electronics", "q": "Capacitor DC circuit mein kaise behave karta hai steady state mein?", "a": "Open circuit", "b": "Short circuit", "c": "Resistor", "d": "Inductor", "ans": "A", "diff": "medium", "lvl": "Diploma", "type": "concept",
         "exp": "DC steady state mein capacitor fully charge ho jaata hai aur current flow ruk jaata hai - open circuit."},
        {"subj": "Basic Electronics", "q": "Inductor DC circuit mein steady state mein kaise behave karta hai?", "a": "Short circuit", "b": "Open circuit", "c": "Capacitor", "d": "Diode", "ans": "A", "diff": "medium", "lvl": "Diploma", "type": "concept",
         "exp": "DC steady state mein inductor mein constant current flow hota hai bina opposition ke - short circuit."},
        {"subj": "Basic Electronics", "q": "Power ka formula kya hai?", "a": "P = V × I", "b": "P = V / I", "c": "P = V + I", "d": "P = V - I", "ans": "A", "diff": "easy", "lvl": "ITI", "type": "concept",
         "exp": "Power = Voltage × Current. Watt mein measure hoti hai."},
        # Semiconductor extras
        {"subj": "Semiconductor Devices", "q": "Silicon ka band gap kitna hai?", "a": "1.1 eV", "b": "0.7 eV", "c": "0.3 eV", "d": "2.0 eV", "ans": "A", "diff": "medium", "lvl": "Diploma", "type": "numerical",
         "exp": "Silicon ka band gap 1.1 eV hai. Germanium ka 0.67 eV hai."},
        {"subj": "Semiconductor Devices", "q": "LED mein light emission kis principle par hota hai?", "a": "Electroluminescence", "b": "Photoelectric effect", "c": "Thermionic emission", "d": "Piezoelectric effect", "ans": "A", "diff": "medium", "lvl": "Diploma", "type": "concept",
         "exp": "LED mein jab electron hole se recombine hota hai toh photon emit hota hai - electroluminescence."},
        {"subj": "Semiconductor Devices", "q": "Half wave rectifier ki ripple frequency kitni hoti hai?", "a": "Input frequency ke equal (f)", "b": "Double (2f)", "c": "Half (f/2)", "d": "Triple (3f)", "ans": "A", "diff": "medium", "lvl": "Diploma", "type": "numerical",
         "exp": "Half wave rectifier sirf ek half cycle use karta hai toh output ripple frequency = input frequency."},
        # Digital extras
        {"subj": "Digital Electronics", "q": "NOT gate ka output kya hota hai jab input 1 ho?", "a": "0", "b": "1", "c": "Undefined", "d": "Floating", "ans": "A", "diff": "easy", "lvl": "ITI", "type": "concept",
         "exp": "NOT gate inverter hai - input 1 toh output 0, input 0 toh output 1."},
        {"subj": "Digital Electronics", "q": "AND gate ka output kab 1 hota hai?", "a": "Jab sabhi inputs 1 hon", "b": "Jab koi ek input 1 ho", "c": "Jab sabhi 0 hon", "d": "Kabhi nahi", "ans": "A", "diff": "easy", "lvl": "ITI", "type": "concept",
         "exp": "AND gate mein output tabhi 1 hota hai jab ALL inputs 1 hon. Ek bhi 0 ho toh output 0."},
        {"subj": "Digital Electronics", "q": "OR gate ka output kab 0 hota hai?", "a": "Jab sabhi inputs 0 hon", "b": "Jab koi ek 0 ho", "c": "Jab sabhi 1 hon", "d": "Kabhi nahi", "ans": "A", "diff": "easy", "lvl": "ITI", "type": "concept",
         "exp": "OR gate mein output tabhi 0 hota hai jab ALL inputs 0 hon. Ek bhi 1 ho toh output 1."},
        {"subj": "Digital Electronics", "q": "Hexadecimal number 'A' ka decimal value?", "a": "10", "b": "11", "c": "12", "d": "15", "ans": "A", "diff": "easy", "lvl": "ITI", "type": "numerical",
         "exp": "Hex mein A=10, B=11, C=12, D=13, E=14, F=15."},
        # Instruments extras
        {"subj": "Measuring Instruments", "q": "Ammeter circuit mein kaise connect hota hai?", "a": "Series mein", "b": "Parallel mein", "c": "Dono mein", "d": "Kisi mein nahi", "ans": "A", "diff": "easy", "lvl": "ITI", "type": "concept",
         "exp": "Ammeter hamesha series mein connect hota hai taaki pura current usse ho kar guzre."},
        {"subj": "Measuring Instruments", "q": "Voltmeter circuit mein kaise connect hota hai?", "a": "Parallel mein", "b": "Series mein", "c": "Dono mein", "d": "Ground se", "ans": "A", "diff": "easy", "lvl": "ITI", "type": "concept",
         "exp": "Voltmeter hamesha parallel mein connect hota hai component ke across voltage measure karne ke liye."},
        # Communication extras
        {"subj": "Communication Systems", "q": "Modulation kyun zaroori hai?", "a": "Signal ko long distance transmit karne ke liye", "b": "Signal ko store karne ke liye", "c": "Signal ko delete karne ke liye", "d": "Signal ko print karne ke liye", "ans": "A", "diff": "easy", "lvl": "ITI", "type": "concept",
         "exp": "Low frequency audio signal directly transmit nahi ho sakta. Modulation se signal ko high frequency carrier par load karte hain."},
        # Microcontroller extras  
        {"subj": "Microcontroller & Microprocessor", "q": "Microprocessor aur microcontroller mein kya fark hai?", "a": "Microcontroller mein CPU + Memory + I/O sab ek chip par", "b": "Koi fark nahi", "c": "Microprocessor mein sab ek chip par", "d": "Dono same hain", "ans": "A", "diff": "easy", "lvl": "ITI", "type": "concept",
         "exp": "Microcontroller = CPU + RAM + ROM + I/O + Timer sab ek chip par. Microprocessor mein sirf CPU hota hai, baaki external."},
        # Math extras
        {"subj": "Mathematics", "q": "cos 0° ka value kya hai?", "a": "1", "b": "0", "c": "-1", "d": "0.5", "ans": "A", "diff": "easy", "lvl": "ITI", "type": "numerical",
         "exp": "cos 0° = 1. Yeh basic trigonometric value hai."},
        {"subj": "Mathematics", "q": "tan 45° ka value kya hai?", "a": "1", "b": "0", "c": "√3", "d": "1/√3", "ans": "A", "diff": "easy", "lvl": "ITI", "type": "numerical",
         "exp": "tan 45° = sin45°/cos45° = (1/√2)/(1/√2) = 1."},
        # Physics extras
        {"subj": "Physics", "q": "Coulomb's law kis se related hai?", "a": "Electric force between charges", "b": "Magnetic force", "c": "Gravitational force", "d": "Nuclear force", "ans": "A", "diff": "easy", "lvl": "ITI", "type": "concept",
         "exp": "Coulomb's law do point charges ke beech ki electric force batata hai: F = kq1q2/r²"},
    ]

    subjects_map = {s.name: s for s in db.query(Subject).all()}
    
    for t in templates:
        subject = subjects_map.get(t["subj"])
        if not subject:
            continue
        topic = db.query(Topic).filter(Topic.subject_id == subject.id).first()
        
        res = shuffle_options(t)
        if not res or res[0] is None:
            continue
            
        a_val, b_val, c_val, d_val, correct_ans = res
        
        q = Question(
            subject_id=subject.id,
            topic_id=topic.id if topic else None,
            question_text=t["q"],
            option_a=a_val,
            option_b=b_val,
            option_c=c_val,
            option_d=d_val,
            correct_answer=correct_ans,
            difficulty=t.get("diff", "medium"),
            exam_level=t.get("lvl", "ITI"),
            question_type=t.get("type", "concept"),
            explanation=t.get("exp", "")
        )
        db.add(q)
    
    db.commit()
