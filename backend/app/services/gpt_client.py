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

========================
CRITICAL ADDITIONS (MUST FOLLOW)
========================

**1) SECTION/DATE DISAMBIGUATION (HIGHEST PRIORITY)**
- If the outline lists paired/alternate dates for different sections (e.g., "Feb 2 & Feb 4" or "Mon OR Wed"),
  you MUST ask which section applies *unless* the user already provided their section in the pasted answers.
- If the user already provided the section (e.g., "Lab B02"), DO NOT ask again. Instead, use it later in parsing.

**2) MISSING SUB-ITEMS / COUNT CONSISTENCY CHECK**
- If a grading table says a component includes N sub-items (e.g., "Lab Assignments 1–8 = 15%")
  but the deadlines section only lists fewer than N due dates/items in the pasted text,
  you MUST ask for the missing sub-item dates OR the missing portion of the outline.
  (Example: “I only see 3 lab due dates, but grading says Labs 1–8. Can you paste the lab schedule table/pages?”)

**3) WEIGHT SOURCE OF TRUTH CHECK (TO PREVENT WRONG DIVISIONS)**
- If both (a) a grading breakdown table and (b) a deadlines/schedule section exist:
  - Treat the grading breakdown table as the authoritative source for weights.
  - Treat deadlines/schedule sections as authoritative for dates/timing.
- If the grading table is missing, unclear, or conflicts with other text, ask ONE targeted question:
  “Which grading breakdown is correct?” and reference the conflicting lines briefly.

**4) NON-GRADED WINDOWS MUST NOT BECOME ITEMS**
- If you see “discussion open between…”, “engagement window…”, “grace period…”, “late policy…”, or “extension window…”,
  do NOT ask questions about their dates unless they directly affect a graded item due date.
- You may ask how the user wants to schedule an “ongoing graded activity” ONLY if it has a weight.

**5) FINAL EXAM PLACEHOLDER RULE**
- If final exam is registrar-scheduled / TBD:
  - Ask exactly ONE question:
    “Do you want me to store this as REGISTRAR_SCHEDULED (TBD) now, or leave it empty and add later?”
  - Do not ask for the actual date.

**6) RECURRING RULE: ASK ONLY WHEN YOU CAN’T GENERATE**
- If recurrence is fully specified (first date + frequency + count or date range), do NOT ask.
- If recurrence is partially specified (e.g., “weekly” but no start date / section), ask only for the missing piece needed.

**7) DROP/OPTIONAL RULE CLARIFICATION**
- If the outline mentions “best N of M” / “drop lowest”:
  - Ask: “Do you want me to apply this rule and mark dropped items as optional (opt)?”
  - Do NOT ask how many are dropped if the outline already states it.

**8) ONE QUESTION PER MISSING FACT**
- Do not bundle multiple missing facts into one vague question.
- Keep questions short and answerable (multiple-choice style when possible).

========================
EXISTING GUIDANCE
========================

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
QUESTIONS:
1 [Specific, targeted question based on outline content]
2 [Another specific question if needed]
If NO questions are needed (everything is clear), respond with:

READY_TO_PARSE
"""

# Prompt for final parsing after questions are answered
SCHEDULER_PROMPT = f"""
You are a scheduling assistant. A user has provided a course outline and answered clarifying questions. Your task is to extract every graded assessment item in the course.

Output exactly ONE line per assessment item in the following format:

Name, Month DD YYYY, P%, EXPLANATION

Where:
- Name is the assessment title (e.g. "Quiz 1", "Assignment #2", "Midterm Exam").
- Month DD YYYY is the due date spelled out (e.g. "March 06 2026").
- P% is the percentage weight (e.g. "7.5 %").
- EXPLANATION is OPTIONAL and ONLY used when Month DD YYYY is not an exact calendar date.

If a precise calendar date is not given, use one of the following instead of a date:
- WEEK_OF <Month DD YYYY>
- LAB_DEPENDENT
- REGISTRAR_SCHEDULED
- NO_DATE

If NO_DATE is used, include a short explanation (e.g. "TBA by instructor", "No schedule provided").

--------------------
FORMAT RULES (STRICT)
--------------------
- Output ONLY the lines.
- One assessment per line.
- Do not merge multiple assessments into one line.
- Do not reorder fields.
- Do not add extra text, headings, bullets, or commentary.

--------------------
NON-GRADED EXCLUSION (CRITICAL)
--------------------
- ONLY output items that contribute to the final grade.
- Do NOT output non-graded items such as:
  - discussion periods / engagement windows
  - “open between” availability ranges
  - grace periods, extension windows, submission instructions
- Do NOT output any item with 0% unless the outline explicitly states it is graded at 0%.

--------------------
WEIGHT SOURCE OF TRUTH (CRITICAL)
--------------------
- The ONLY authoritative source for percentages/weights is the grading breakdown / final grade determination table.
- Ignore weights mentioned elsewhere if they conflict or are less explicit.
- Deadlines/schedule sections provide dates/timing, NOT weights, unless the grading table is missing.
- If multiple grading tables exist, choose the one that explicitly sums to 100% and is labeled like
  "Final Grade Determination", "Grading", "Assessment Breakdown", or equivalent.

--------------------
ATOMIC DEADLINE RULE (CRITICAL)
--------------------
- If a graded component has multiple distinct deadlines, you MUST output one line per deadline.
- Group-level rows are FORBIDDEN if individual deadlines exist.
- Collapsing multiple deadlines into a single row is NOT allowed.

--------------------
COMPONENT MAPPING STEP (CRITICAL)
--------------------
Before assigning any percentages, do this mentally:
- Identify each graded component and its total weight from the grading table (e.g., “Course Progress Checks = 15%”).
- Map each dated sub-item in the deadlines/schedule section to exactly ONE graded component.
- If a dated item cannot be mapped to a graded component in the table, EXCLUDE it (it is not graded).

--------------------
COMPONENT ANCHORING (CRITICAL)
--------------------
- Sub-items listed in deadlines/schedules (modules, checkpoints, weekly quizzes, lab deliverables, etc.)
  MUST inherit their weight ONLY from their graded component's total weight.
- You are FORBIDDEN from assigning a standalone per-item weight (e.g., “Module 0 = 5%”) unless the outline explicitly states that exact per-item weight.

--------------------
COMPONENT TOTAL RULE (CRITICAL)
--------------------
If a component has a total weight and multiple sub-items:
1) Count ALL sub-items belonging to that component across the ENTIRE outline.
2) Divide the component's total percentage by the TOTAL sub-item count.
3) Assign that value to each sub-item,
   unless the outline explicitly provides different per-item weights.

- Do NOT divide by the number of items on a single date.
- All sub-items must sum exactly to the component total.

EXAMPLE (MUST FOLLOW):
If the grading table says "Course Progress Checks = 15%" and there are 6 progress check sub-items,
each sub-item MUST be 2.5% (15 / 6).

--------------------
BEST-OF / DROPPED ITEM RULES (CRITICAL)
--------------------
- If the outline says "best N of M", output EXACTLY M items.
- Divide the total percentage by N (the number counted).
- Mark EXACTLY (M - N) items as "(opt)" in the Name.
- ALL items (including optional ones) must show the recalculated percentage.
- Do NOT assign 0% to optional items.

--------------------
ALTERNATIVE / OR ASSESSMENTS
--------------------
- If an assessment can be completed in one of multiple ways (A OR B):
  - Output one line per alternative.
  - Each alternative keeps the same divided percentage.
  - Do NOT choose one.
  - Do NOT mark alternatives as optional unless explicitly stated.

--------------------
DATE PRECISION RULES
--------------------
- Do NOT infer dates or times.
- Do NOT convert "week of" into a specific day.
- If multiple assessments share the same stated date, duplicate that date exactly.

--------------------
RECURRING ASSESSMENTS
--------------------
- Only calculate recurring dates if:
  - A first date is explicitly provided AND
  - The recurrence pattern is explicitly defined or confirmed by user answers.
- Otherwise use WEEK_OF or NO_DATE.

--------------------
LAB-SPECIFIC RULE
--------------------
- If lab reports are due a fixed time after the lab, compute the due date accordingly.
- Do NOT guess lab schedules.

--------------------
NO REBALANCING (CRITICAL)
--------------------
- You are NOT allowed to change any component's total weight to make math work.
- If the grading table says a component is X%, it must sum to X% exactly.

--------------------
PER-COMPONENT VERIFICATION (CRITICAL)
--------------------
Before outputting any lines, you MUST verify:
- For EACH graded component, the sum of its output item percentages equals that component's stated total weight.
If any component does not match:
- Correct the mapping/counting/division.
- Do NOT proceed until every component matches.

--------------------
OVERALL PERCENT VERIFICATION (CRITICAL)
--------------------
- After per-component verification, verify the overall total sums to exactly 100%.
- If still impossible, append "(CHECK_WEIGHTS)" to the affected Name(s).

--------------------
OUTPUT ONLY (FINAL)
--------------------
Return ONLY the lines in the required format. No extra text.

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
    
    # Dedupe before recheck (first parse can also produce dupes)
    items = _dedupe_items(items)
    
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

CRITICAL: Output EXACTLY one line per assessment item. NO duplicates. NO repeated items.
Output ONLY the item lines (Name, Month DD YYYY, P%)—no headers, no numbers, no extra text.
If you must correct, replace the list—do not append or duplicate.

If everything looks correct, output exactly: NO_CHANGES_NEEDED

"""

    messages = [{"role": "user", "content": recheck_prompt}]
    
    resp = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=messages,
        temperature=0.1
    )
    
    recheck_response = resp.choices[0].message.content or ""
    
    # If no changes needed, return original items (deduped)
    if "NO_CHANGES_NEEDED" in recheck_response.upper():
        return _dedupe_items(items)
    
    # Parse the corrected items - only lines that look like "Name, Month DD YYYY, P%"
    # Skip numbered lines (1. 2. 3.) and header-ish lines
    corrected_lines = []
    for l in recheck_response.splitlines():
        line = l.strip()
        if not line:
            continue
        # Skip lines that are clearly not items (numbers, headers, etc.)
        if re.match(r'^\d+[\.\)]\s', line):  # "1. " or "1) "
            line = re.sub(r'^\d+[\.\)]\s*', '', line)
        if line.upper() in ('NO_CHANGES_NEEDED', 'NO CHANGES NEEDED'):
            return _dedupe_items(items)
        if not re.search(r'[A-Za-z]', line) or ',' not in line:  # Must have letters and comma
            continue
        corrected_lines.append(line)
    
    corrected_items = []
    for line in corrected_lines:
        parts = [p.strip() for p in line.split(",")]
        if len(parts) >= 3:
            name, date, percent = parts[0], parts[1], parts[2]
            explanation = parts[3] if len(parts) > 3 else ""
            included = not ("(opt)" in name.lower() or "(optional)" in name.lower())
            corrected_items.append({
                "name": name,
                "date": date,
                "percent": percent,
                "included": included,
                "explanation": explanation
            })
    
    result = corrected_items if corrected_items else items
    return _dedupe_items(result)


def _dedupe_items(items: list[dict]) -> list[dict]:
    """Remove duplicate items by (name, date, percent). Keep first occurrence."""
    seen = set()
    out = []
    for it in items:
        key = (str(it.get('name', '')).strip(), str(it.get('date', '')).strip(), str(it.get('percent', '')).strip())
        if key in seen:
            continue
        seen.add(key)
        out.append(it)
    return out