# gpt_client.py - Handles GPT-based outline parsing for course schedules
import os
import re
import datetime
from openai import OpenAI

# Initialize OpenAI client with API key from environment
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

# Use current year in prompts
current_year = datetime.date.today().year

# Prompt for analyzing outline and asking clarifying questions
ANALYSIS_PROMPT = f"""
You are a scheduling assistant. A user will paste in a course outline containing assignments, quizzes, and exam dates with weightings. 

Your job is to analyze the outline and identify SPECIFIC missing information that would prevent accurate scheduling.

**CRITICAL RULE**: Only ask questions for information that is ACTUALLY MISSING and ESSENTIAL for scheduling.

**ANALYZE THE OUTLINE CAREFULLY** and ask targeted questions based on what's actually in the document:

**For multiple sections/labs:**
- If there are multiple lab sections (e.g., B01-B16), ask which specific section the student is in
- If there are different schedules for different sections, ask for section-specific information

**For recurring assessments:**
- If labs are scheduled with a table showing different weeks for different sections, ask if they want auto-generation or specific dates
- If assignments have a schedule table, confirm the dates rather than asking for them

**For exam dates:**
- If midterm has a specific date, confirm it rather than asking
- If final is "Registrar scheduled", ask if they want a placeholder or to wait

**For ongoing assessments:**
- If something is "ongoing" (like Top Hat), ask how they want it scheduled (aggregate vs weekly)

**For drop rules:**
- If the outline mentions dropping lowest grades, ask if they want this applied

**EXAMPLES OF SMART QUESTIONS:**

✅ DO ask: "Which lab section are you in? (e.g., B01, B02, etc.)" (if multiple lab sections exist)
✅ DO ask: "Do you want me to auto-generate your lab dates from the schedule table, or provide specific dates?" (if there's a lab schedule table)
✅ DO ask: "The outline shows assignments due Sep 17, Sep 24, Oct 1, etc. Are these dates correct for you?" (if dates are listed)
✅ DO ask: "Top Hat is ongoing (5%). How should I schedule it - as one item or weekly entries?" (if ongoing assessment)
✅ DO ask: "The outline says the lowest pre-lab quiz is dropped. Should I mark one as optional?" (if drop rule mentioned)

❌ DON'T ask: "What are the lab dates?" (if there's a detailed schedule table)
❌ DON'T ask: "What are the assignment dates?" (if they're clearly listed)
❌ DON'T ask: "What is the midterm date?" (if it's clearly stated)

**Output format:**
If questions are needed, respond with:
```
QUESTIONS:
1. [Specific, targeted question based on outline content]
2. [Another specific question if needed]
```

If NO questions are needed (everything is clear), respond with:
```
READY_TO_PARSE
```
"""

# Prompt for final parsing after questions are answered
SCHEDULER_PROMPT = f"""
You are a scheduling assistant. A user has provided a course outline and answered clarifying questions. Now extract each assessment item and output exactly one line per item in the form:

Name, Month DD YYYY, P%

where:

Name is the assessment title (e.g. "Quiz 1" or "Midterm Exam").
Month DD YYYY is the exact due date, spelled out (e.g. "March 06 {current_year}"). If no specific date is mentioned in the outline, use "NO_DATE" and provide an explanation.
P% is the percentage weight (e.g. "7.5 %").
EXPLANATION is optional - if you use "NO_DATE", provide a brief explanation of why the date is missing (e.g. "No schedule provided", "TBA by instructor", "Weekly throughout semester").

Format: Name, Month DD YYYY, P%, EXPLANATION

Rules:
- If a group of assessments (e.g. "Assignments 1-4, best 3 of 4 = 20%") is given, divide the total percentage by the number of counted items (e.g. 20 % / 3 = 6.667 %) and mark the extra item as optional with "(opt)" in its Name.
- If the outline states "best N of M," exactly M - N items are optional—append "(opt)" to their **Name** field.
- If the user confirmed dropping the lowest item (e.g., "lowest pre-lab quiz dropped"), mark one item as "(opt)" in the **Name** field and divide the percentage among the remaining items.
- **CRITICAL:** The "(opt)" marker must go in the **Name** field, NOT in the percentage field.
- **EXAMPLE:** For "lowest pre-lab quiz dropped" with 5 quizzes worth 2.5% total:
  - Output: "Pre-Lab Quiz 1, Sep 08 2025, 0.625 %"
  - Output: "Pre-Lab Quiz 2, Sep 15 2025, 0.625 %"  
  - Output: "Pre-Lab Quiz 3, Sep 22 2025, 0.625 %"
  - Output: "Pre-Lab Quiz 4, Sep 29 2025, 0.625 %"
  - Output: "Pre-Lab Quiz 5 (opt), Oct 06 2025, 0.625 %"
- **CRITICAL:** All items (including optional ones) should show the recalculated percentage, not the original divided percentage.
- For recurring assignments (e.g., "assignments due every 2 weeks"), calculate all dates based on the first date provided in the answers.
- If the user provided a section and first date, use that to calculate all subsequent dates for recurring items.
- **CRITICAL FOR LABS:** Lab reports are due certain time after the lab date. Always add that amount of time to lab completion dates to get the due date.
- Do not output any extra text, lists, or punctuation—only one line per assessment in the exact format above.
- Ensure all percentages sum to 100 %. If they do not, reread the outline and adjust division or optional markings accordingly.
- CRITICAL: Mark optional items with "(opt)" in the name - these will be set as "not included" by default.
"""

def pre_process_outline(text: str) -> str:
    """Pre-process outline text to make dates explicit for GPT parsing."""
    year = str(datetime.date.today().year)
    # Handle lines like "Assignments due on Feb 1, Feb 14…"
    m = re.search(r'Assignments.*?due on\s+([^\.]+)', text, flags=re.IGNORECASE)
    if m:
        dates = re.split(r',\s*| and ', m.group(1))
        items = []
        for i, d in enumerate(dates, start=1):
            d = d.strip()
            if not re.search(r'\d{4}', d):
                d = f"{d} {year}"
            items.append(f"Assignment {i}, {d},")
        text = "\n".join(items) + "\n" + text
    # Handle "Quizzes are in Lab during the weeks of Jan 27, Feb 3, …"
    m2 = re.search(r'Quizzes.*?weeks of\s+([^\.]+)', text, flags=re.IGNORECASE)
    if m2:
        dates = re.split(r',\s*| and ', m2.group(1))
        items = []
        for i, d in enumerate(dates, start=1):
            d = d.strip()
            if not re.search(r'\d{4}', d):
                d = f"{d} {year}"
            items.append(f"Quiz {i}, {d},")
        text = "\n".join(items) + "\n" + text
    # Convert "X is scheduled for Month DD" to explicit date
    text = re.sub(
        r'([A-Z][^\n]+?)\s+is scheduled for\s+'
        r'(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2})(?!\s*\d{4})',
        lambda m: f"{m.group(1)} — {m.group(2)} {m.group(3)} {year}",
        text
    )
    # Add year to bare Month DD
    text = re.sub(
        r'\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2})(?!\s*\d{4})\b',
        rf'\1 \2 {year}',
        text
    )
    return text

def analyze_outline_for_questions(outline_text: str) -> dict:
    """Analyze outline and return questions if needed, or indicate ready to parse."""
    if not outline_text.strip():
        return {"status": "ready", "items": []}
    
    outline_text = pre_process_outline(outline_text)
    messages = [
        {"role": "system", "content": ANALYSIS_PROMPT},
        {"role": "user", "content": outline_text}
    ]
    
    resp = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=messages,
        temperature=0.1
    )
    
    raw = resp.choices[0].message.content or ""
    print(f"DEBUG: GPT raw response: {repr(raw)}")  # Debug line
    
    # Remove markdown code blocks if present
    if raw.startswith("```") and raw.endswith("```"):
        raw = raw[3:-3].strip()
    elif raw.startswith("```"):
        raw = raw[3:].strip()
    
    print(f"DEBUG: Cleaned response: {repr(raw)}")
    
    if raw.strip() == "READY_TO_PARSE":
        print("DEBUG: GPT said READY_TO_PARSE")
        return {"status": "ready", "items": []}
    
    if raw.startswith("QUESTIONS:"):
        print("DEBUG: GPT provided QUESTIONS")
        questions_text = raw.replace("QUESTIONS:", "").strip()
        questions = []
        for line in questions_text.split('\n'):
            line = line.strip()
            if line and (line.startswith(('1.', '2.', '3.', '4.', '5.', '6.', '7.', '8.', '9.')) or 
                        line.startswith(('1)', '2)', '3)', '4)', '5)', '6)', '7)', '8)', '9)'))):
                # Remove numbering
                question = re.sub(r'^\d+[\.\)]\s*', '', line)
                if question:
                    questions.append(question)
        
        print(f"DEBUG: Extracted questions: {questions}")
        return {"status": "questions", "questions": questions}
    
    # Fallback - treat as ready to parse
    print(f"DEBUG: Fallback - treating as ready to parse. Raw response: {repr(raw)}")
    return {"status": "ready", "items": []}

def parse_outline_with_gpt(outline_text: str, answers: list = None) -> list[dict]:
    """Parse a course outline into assessment items using GPT, optionally with clarifying answers."""
    if not outline_text.strip():
        return []
    
    outline_text = pre_process_outline(outline_text)
    
    # If answers provided, include them in the prompt
    if answers:
        answers_text = "\n".join([f"Q{i+1}: {answer}" for i, answer in enumerate(answers)])
        user_content = f"Course Outline:\n{outline_text}\n\nAnswers to clarifying questions:\n{answers_text}"
    else:
        user_content = outline_text
    
    messages = [
        {"role": "system", "content": SCHEDULER_PROMPT},
        {"role": "user", "content": user_content}
    ]
    
    resp = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=messages,
        temperature=0.1
    )
    
    raw = resp.choices[0].message.content or ""
    lines = [l.strip() for l in raw.splitlines() if l.strip()]
    items = []
    
    for line in lines:
        parts = [p.strip() for p in line.split(",")]
        if len(parts) >= 3:
            name, date, percent = parts[0], parts[1], parts[2]
            explanation = parts[3] if len(parts) > 3 else ""
            
            # Check if item is optional (marked with "(opt)")
            included = not ("(opt)" in name.lower() or "(optional)" in name.lower())
            items.append({
                "name": name, 
                "date": date, 
                "percent": percent, 
                "included": included,
                "explanation": explanation
            })
    
    # Rechecking step - validate and fix common errors
    items = recheck_parsed_items(items, outline_text, answers)
    
    return items

def recheck_parsed_items(items: list[dict], outline_text: str, answers: list = None) -> list[dict]:
    """Recheck parsed items for common errors and fix them."""
    
    # Build rechecking prompt
    items_text = "\n".join([f"{item['name']}, {item['date']}, {item['percent']}" for item in items])
    
    recheck_prompt = f"""
You just parsed a course outline and generated these items:

{items_text}

Please recheck for these common errors and fix them:

1. **Optional items**: If the outline mentions "lowest X dropped" or "best N of M", exactly M-N items should have "(opt)" in their NAME field (not percentage field).

2. **Lab due dates**: Lab reports are due a certain amount of days after completion date. Make sure lab dates are due dates, not completion dates. probably mentioned

3. **Percentage calculations**: If items are optional, divide the total percentage among the remaining counted items. 
   - Example: 5 quizzes worth 2.5% total, with 1 dropped = 2.5% ÷ 4 counted = 0.625% each
   - The optional item should still show the calculated percentage (0.625%), not the original (0.5%)

4. **Date format**: Use "Month DD YYYY" format (e.g., "September 08 2025").

5. **Consistency**: Ensure all percentages sum to 100%.

Original outline context:
{outline_text[:500]}...

User answers:
{answers if answers else "None"}

If you find any errors, output the corrected items in the same format:
Name, Month DD YYYY, P%

If everything looks correct, output "NO_CHANGES_NEEDED"
check it alll with the outline since every outline is different so i cant tell u wat u might have done wrong recheckkk

"""

    messages = [{"role": "user", "content": recheck_prompt}]
    
    resp = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=messages,
        temperature=0.1
    )
    
    recheck_response = resp.choices[0].message.content or ""
    
    # If no changes needed, return original items
    if "NO_CHANGES_NEEDED" in recheck_response:
        return items
    
    # Parse the corrected items
    corrected_lines = [l.strip() for l in recheck_response.splitlines() if l.strip()]
    corrected_items = []
    
    for line in corrected_lines:
        parts = [p.strip() for p in line.split(",")]
        if len(parts) >= 3:
            name, date, percent = parts[0], parts[1], parts[2]
            explanation = parts[3] if len(parts) > 3 else ""
            # Check if item is optional (marked with "(opt)")
            included = not ("(opt)" in name.lower() or "(optional)" in name.lower())
            corrected_items.append({
                "name": name, 
                "date": date, 
                "percent": percent, 
                "included": included,
                "explanation": explanation
            })
    
    return corrected_items if corrected_items else items