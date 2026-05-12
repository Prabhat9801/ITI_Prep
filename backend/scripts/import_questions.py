import json
import re
import os
import ast

def clean_subject_name(name):
    # Remove "Unit X", "UNIT X", "S. No.", "Practical Outcomes", etc.
    name = re.sub(r'Unit\s+\d+.*', '', name, flags=re.IGNORECASE).strip()
    name = re.sub(r'UNIT\s+\d+.*', '', name, flags=re.IGNORECASE).strip()
    name = re.sub(r'Unit\s+[IVXLCDM]+.*', '', name, flags=re.IGNORECASE).strip()
    name = re.sub(r'UNIT\s+[IVXLCDM]+.*', '', name, flags=re.IGNORECASE).strip()
    
    # Remove trailing junk like "Lab S", "LabVolumetric", etc.
    name = re.sub(r'Lab[A-Z].*', ' Lab', name).strip()
    name = re.sub(r'Practices[A-Z].*', ' Practices', name).strip()
    name = re.sub(r'Graphics[A-Z].*', ' Graphics', name).strip()
    
    # Map to standard names
    mapping = {
        "Mathematics - I": ["Mathematics - I", "Mathematics -I", "Mathematics-I"],
        "Mathematics - II": ["Mathematics - II", "Mathematics -II", "Mathematics-II"],
        "Applied Physics I": ["Applied Physics I", "Applied Physics - I", "Applied Physics-I", "Applied Physics -I"],
        "Applied Physics II": ["Applied Physics II", "Applied Physics - II", "Applied Physics-II", "Applied Physics -II"],
        "Applied Chemistry": ["Applied Chemistry", "Applied Chemistry Lab"],
        "Communication Skills in English": ["Communication Skills in English", "Communication Skills"],
        "Engineering Graphics": ["Engineering Graphics", "Engineering Graphics Unit"],
        "Engineering Workshop Practices": ["Engineering Workshop Practices", "Engineering Workshop PracticeS"],
        "Sports and Yoga": ["Sports and Yoga", "Physical Education", "Sports"],
        "Introduction to IT Systems": ["Introduction to IT Systems", "Introduction to IT Systems Lab"],
        "Fundamentals of Electrical and Electronics Engineering": ["Fundamentals of Electrical and Electronics Engineering"],
        "Engineering Mechanics": ["Engineering Mechanics", "Engineering Mechanics Lab"],
        "Environmental Science": ["Environmental Science"],
        "Principles of Electronic Communication": ["Principles of Electronic Communication"],
        "Electronic Devices and Circuits": ["Electronic Devices and Circuits", "Electronics Devices and Circuits"],
        "Electronic Measurement and Instrumentation": ["Electronic Measurement and Instrumentation", "Electronic Measurements and Instrumentation"],
        "Electric Circuits & Network": ["Electric Circuits & Network"],
        "Microcontroller and Applications": ["Microcontroller and Applications"],
        "Consumer Electronics": ["Consumer Electronics"],
        "Digital Communication Systems": ["Digital Communication Systems"],
        "Electronic Equipment Maintenance": ["Electronic Equipment Maintenance"],
        "Linear Integrated Circuits": ["Linear Integrated Circuits"],
        "Embedded Systems": ["Embedded Systems"],
        "Mobile and Wireless Communication": ["Mobile and Wireless Communication"],
        "Industrial Automation": ["Industrial Automation"],
        "Microwave and Radar": ["Microwave and Radar", "Microwave and RADAR"],
        "Computer Networking and Data Communication": ["Computer Networking and Data Communication"],
    }
    
    for std_name, variants in mapping.items():
        for v in variants:
            if v.lower() in name.lower():
                # Check if it's a Lab version
                if "lab" in name.lower() and "lab" not in std_name.lower():
                    return std_name + " Lab"
                return std_name
                
    return name

def extract_questions_from_text(file_path):
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    json_blocks = re.findall(r'\[\s*\{.*?\}\s*\]', content, re.DOTALL)
    parts = re.split(r'\[\s*\{.*?\}\s*\]', content, flags=re.DOTALL)
    
    questions_by_subject = {}
    
    for i, block in enumerate(json_blocks):
        try:
            clean_block = block.strip()
            data = json.loads(clean_block)
            
            header_text = parts[i].strip()
            subject = "Unknown Subject"
            
            patterns = [
                r"Unit\s+\d+[:\.]\s*([A-Za-z\s&-]+)",
                r"Subject[:\-]\s*([A-Za-z\s&-]+)",
                r"questions from\s+([A-Za-z\s&-]+)",
                r"generate 50 more.*from\s+([A-Za-z\s\d&-]+)"
            ]
            
            found = False
            for p in patterns:
                match = re.search(p, header_text, re.IGNORECASE)
                if match:
                    subject = match.group(1).strip()
                    found = True
                    break
            
            if not found:
                lines = header_text.split('\n')
                for line in reversed(lines):
                    if line.strip() and not line.strip().startswith('json'):
                        subject = line.strip()
                        break
            
            subject = clean_subject_name(subject)

            if subject not in questions_by_subject:
                questions_by_subject[subject] = []
            
            questions_by_subject[subject].extend(data)
            print(f"Imported {len(data)} questions for: {subject}")
            
        except Exception as e:
            pass
            
    return questions_by_subject

def update_seed_file(new_data, seed_path):
    # Start fresh with new data
    with open(seed_path, 'w', encoding='utf-8') as f:
        f.write('"""MCQ question templates for seeding the database."""\n\n')
        f.write('QUESTIONS = ')
        f.write(json.dumps(new_data, indent=4, ensure_ascii=False))
        f.write('\n')

if __name__ == "__main__":
    generated_txt = r"c:\Users\prabh\Desktop\Prep\generated.txt"
    seed_file = r"c:\Users\prabh\Desktop\Prep\backend\data\questions_seed.py"
    
    print("Starting refined extraction from generated.txt...")
    questions = extract_questions_from_text(generated_txt)
    
    if questions:
        print(f"Total cleaned subjects found: {len(questions)}")
        update_seed_file(questions, seed_file)
        print("Successfully updated questions_seed.py")
    else:
        print("No questions found in generated.txt")
