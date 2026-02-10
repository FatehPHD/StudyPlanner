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
You are a scheduling assistant. A user has provided a course outline and answered clarifying questions (if any).
Your task is to extract every GRADED assessment item and output EXACTLY one line per item.

========================
OUTPUT FORMAT (STRICT)
========================
Output ONE line per graded assessment item in EXACTLY this CSV-like format:

Name, Date, Percent, Explanation, Optional

Where:
- Name: short assessment name (e.g., "Quiz 1", "Midterm", "Project", "Final Exam").
  - Do NOT add "(opt)" or "(optional)" to the name.
- Date: an exact due date in "Month DD YYYY" (e.g., "February 26 2026") OR one of:
  - REGISTRAR_SCHEDULED
  - NO_DATE
  - WEEK_OF Month DD YYYY
  - LAB_DEPENDENT
- Percent: numeric percentage with a trailing " %" (e.g., "5 %", "6.667 %").
- Explanation: empty string "" if not needed; otherwise a short note (e.g., "tentative", "TBD by registrar").
- Optional: the word true (item is dropped/optional, not counted in grade) or false (item counts). REQUIRED on every line.
CRITICAL: Every line MUST have exactly 5 comma-separated values: Name, Date, Percent, Explanation, Optional. When "best N of M" or "drop lowest" applies, exactly (M−N) lines must have Optional = true.

Return ONLY the lines. No headings, no bullets, no extra commentary.

========================
INCLUDE ALL GRADED COMPONENTS (CRITICAL)
========================
- You MUST output exactly one row for EVERY component that appears in the grading breakdown / final grade determination table with a weight that contributes to 100%.
- This includes: Quizzes, Midterm, Project, Final Exam, AND also Participation, In-class Participation, Attendance, or any similar component that has a percentage in the table.
- If a component has no single due date (e.g. In-class Participation or ongoing), output one row with Date=NO_DATE or NO_DATE (ongoing) and its weight. Do NOT skip it.

========================
NON-GRADED EXCLUSION (CRITICAL)
========================
- ONLY output items that contribute to the final grade (i.e., appear in the grading breakdown / final grade determination table).
- EXCLUDE non-graded windows and policies, including:
  - discussion periods / engagement windows
  - “open between” availability ranges
  - extension windows, grace periods, late policy text
- Do NOT output ANY 0% items unless the outline explicitly states they are graded at 0%.

========================
WEIGHT SOURCE OF TRUTH (CRITICAL)
========================
- The ONLY authoritative source for weights is the grading breakdown / final grade determination table that sums to 100%.
- Deadlines/schedule text provides dates/timing, NOT weights.
- Do NOT create weights from deadlines text if the grading table exists.

========================
SECTION DUPLICATION BAN (CRITICAL FIX)
========================
- Do NOT duplicate assessment items by lecture/lab section (e.g., “LEC 01 vs LEC 02”) unless the outline explicitly says
  different sections have different graded requirements or different weights.
- If the outline says something like “Both sections will have 4 quizzes…”, that means ONE set of quizzes for the course,
  NOT 4 quizzes per section.

========================
ATOMIC DEADLINE RULE (CRITICAL)
========================
- If a graded component has multiple distinct dated sub-items, you MUST output one line per dated sub-item.
- Group-level items like “Quizzes = 15%” are FORBIDDEN when individual quiz dates/items are listed.

========================
STEP 1 — IDENTIFY GRADED COMPONENTS
========================
From the grading breakdown table, list each graded component and its total weight.
Example components: Quizzes, Participation, In-class Participation, Attendance, Midterm, Project, Final Exam.
Do not omit Participation/Attendance-type rows even if they have no single date (use NO_DATE or NO_DATE (ongoing)).

========================
STEP 2 — MAP DATED ITEMS TO COMPONENTS
========================
Using the deadlines/assessments text, identify dated sub-items and map EACH to exactly ONE graded component.
- If an item cannot be mapped to any component in the grading table, EXCLUDE it (it is not graded).

========================
RULE PRIORITY ORDER (CRITICAL FIX)
========================
When assigning per-item percentages, apply rules in this exact priority order:

(1) BEST-OF / DROP RULES (HIGHEST PRIORITY)
(2) EXPLICIT PER-ITEM WEIGHTS (if the outline explicitly gives each item’s weight)
(3) COMPONENT EVEN SPLIT (default)

Lower priority rules must NEVER override higher priority rules.

========================
(1) BEST-OF / DROP RULES (HIGHEST PRIORITY)
========================
If the grading table says "best N of M" or the outline says "drop lowest X":
- Output EXACTLY M items (one row per quiz/assignment).
- N = number of items that COUNT toward the grade. M = total number of items.
- Compute each item's Percent = (component_total / N). Divide by N (counted), NOT by M (total).
  **Example:** Quizzes 15% total, "best 3 of 4" → N=3, M=4. Output 4 rows (Quiz 1..Quiz 4).
  Each row Percent = 15 ÷ 3 = 5 %. All four rows show 5 %. Do NOT use 15÷4 = 3.75% or 1.25%.
- Mark EXACTLY (M − N) items as Optional=true (dropped), and the remaining N as Optional=false. You MUST output the word true as the 5th field for dropped items and false for counted items—no exceptions.
- Optional (dropped) items KEEP the same Percent. Do NOT set them to 0%.
- If the outline provides dated items, label them sequentially (Quiz 1..Quiz M) in the order of the dates.
- If it does NOT specify which ones get dropped, set Optional=true on the LAST (M − N) items by date order.

========================
(2) EXPLICIT PER-ITEM WEIGHTS
========================
If (and only if) the outline explicitly lists each item’s weight (e.g., “Quiz 1 = 3%, Quiz 2 = 4%”):
- Use those exact weights.
- Optional remains false unless best-of/drop explicitly applies.

========================
(3) COMPONENT EVEN SPLIT (DEFAULT)
========================
If a component has total weight W% and it has K dated sub-items AND no best-of/drop rule applies:
- Assign each sub-item Percent = (W / K).
- Optional=false for all unless explicitly dropped.

========================
DATE RULES (STRICT)
========================
- Do NOT infer missing dates.
- If a date is stated as tentative, still use the date but set Explanation="tentative".
- For registrar scheduled finals, use Date=REGISTRAR_SCHEDULED and Explanation="registrar scheduled".
- If truly no timing exists, use Date=NO_DATE with a short Explanation.

========================
PERCENT VALIDATION (CRITICAL)
========================
- For components WITHOUT a drop rule: the sum of that component's item Percents equals the component total.
- For components WITH "best N of M": each item Percent = component_total/N; the N included items sum to component_total (the M−N optional rows show the same Percent but are excluded from the grade).
- Overall total of all components must sum to exactly 100%.
- If it still cannot be made consistent due to conflicting text, append " (CHECK_WEIGHTS)" to the Name of affected items.

Return ONLY the lines in the required format.

"""

def _is_optional(opt_val: str, name: str) -> bool:
    """True if this item is optional/dropped (not counted in grade)."""
    if not opt_val:
        return False
    o = opt_val.lower().strip()
    if o in ("true", "optional", "yes", "dropped", "1"):
        return True
    if "(opt)" in name.lower() or "(optional)" in name.lower():
        return True
    return False


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
        model="gpt-4o",
        messages=messages,
        temperature=0.1
    )
    
    raw = resp.choices[0].message.content or ""
    lines = [l.strip() for l in raw.splitlines() if l.strip()]
    items = []
    
    for line in lines:
        parts = [p.strip() for p in line.split(",")]
        if len(parts) >= 3:
            # Optional is always last field (true/false). Handle commas in Name/Explanation.
            name, date, percent = parts[0], parts[1], parts[2]
            if len(parts) >= 5:
                explanation = ",".join(parts[3:-1]).strip()
                opt_val = parts[-1].lower()
            elif len(parts) == 4:
                explanation = parts[3]
                opt_val = ""
            else:
                explanation = ""
                opt_val = ""
            included = not _is_optional(opt_val, name)
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
    
    # Build rechecking prompt (same format as parse output)
    items_text = "\n".join([f"{item['name']}, {item['date']}, {item['percent']}, {item.get('explanation', '')}, {'true' if not item.get('included', True) else 'false'}" for item in items])
    
    recheck_prompt = f"""
You just parsed a course outline and generated these items:

{items_text}

Please recheck for these common errors and fix them:

1. **Optional items**: If the outline mentions "lowest X dropped" or "best N of M", exactly M-N items should have Optional: true (the last M-N items of that component). Do NOT put "(opt)" in the Name.

2. **Lab due dates**: Lab reports are due a certain amount of days after completion date. Make sure lab dates are due dates, not completion dates. probably mentioned

3. **Percentage calculations (best N of M / drop lowest)**: Divide the component total by N (the number that COUNT), not by M (total items). Every row—including dropped ones—shows the same Percent = component_total ÷ N.
   - Example: Best 3 of 4 quizzes, 15% total → N=3, so each of the 4 rows = 15÷3 = 5 %. Do NOT use 15÷4 = 3.75% or 1.25%.
   - Example: 5 quizzes 2.5% total, 1 dropped → N=4 count, so 2.5÷4 = 0.625% each (all 5 rows show 0.625%).
   - The dropped/optional item still shows that same percentage; do not set it to 0%.

4. **Date format**: Use "Month DD YYYY" for known dates. For placeholder dates keep exactly: REGISTRAR_SCHEDULED (final exam TBD), NO_DATE (no timing), or NO_DATE (ongoing) for ongoing items. Do NOT replace these with real dates.

5. **Consistency**: Ensure all percentages sum to 100%.

6. **Do not drop graded components**: If the outline grading table includes Participation, In-class Participation, Attendance, or similar (with a %), there must be exactly one row for it, with Date=NO_DATE or NO_DATE (ongoing) if it has no single date.

Original outline context:
{outline_text[:500]}...

User answers:
{answers if answers else "None"}

If you find any errors, output the corrected items in the same format:
Name, Date, P%, EXPLANATION, Optional

Date is either "Month DD YYYY" or REGISTRAR_SCHEDULED or NO_DATE (or NO_DATE (ongoing)). Optional is true or false. No "(opt)" in Name.

CRITICAL: Output EXACTLY one line per assessment item. NO duplicates. NO repeated items.
Every line MUST have 5 fields: Name, Date, P%, EXPLANATION, Optional. Optional must be the word true or false.
When "best N of M" or "drop lowest" applies, keep exactly (M−N) rows with Optional = true (the dropped items).
Output ONLY the item lines—no headers, no numbers, no extra text.
If you must correct, replace the list—do not append or duplicate.

If everything looks correct, output exactly: NO_CHANGES_NEEDED

"""

    messages = [{"role": "user", "content": recheck_prompt}]
    
    resp = client.chat.completions.create(
        model="gpt-4o",
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
            if len(parts) >= 5:
                explanation = ",".join(parts[3:-1]).strip()
                opt_val = parts[-1].lower()
            elif len(parts) == 4:
                explanation = parts[3]
                opt_val = ""
            else:
                explanation = ""
                opt_val = ""
            included = not _is_optional(opt_val, name)
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