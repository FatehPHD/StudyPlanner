# gpt_client.py - Handles GPT-based outline parsing for course schedules
import os
import re
import datetime
from openai import OpenAI

# Initialize OpenAI client with API key from environment
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

# Use current year in prompts
current_year = datetime.date.today().year

# Prompt for extracting schedule items from course outlines
SCHEDULER_PROMPT = f"""
You are a scheduling assistant. A user will paste in a course outline containing assignments, quizzes, and exam dates with weightings. Extract each assessment item and output exactly one line per item in the form:

Name, Month DD YYYY, P%

where:

Name is the assessment title (e.g. "Quiz 1" or "Midterm Exam").
Month DD YYYY is the exact due date, spelled out (e.g. "March 06 {current_year}"); if no date is provided, use "January 01 {current_year}."
P% is the percentage weight (e.g. "7.5 %").

Rules:
- If a group of assessments (e.g. "Assignments 1-4, best 3 of 4 = 20%") is given, divide the total percentage by the number of counted items (e.g. 20 % / 3 = 6.667 %) and mark the extra item as optional with "(opt)" in its Name.
- If the outline states "best N of M," exactly M - N items are optional—append "(opt)" to their titles.
- Also detect sentences of the form "<Assessment> is scheduled for Month DD[, YYYY]" and convert them into list entries. If the year is missing, assume {current_year}.
- Do not output any extra text, lists, or punctuation—only one line per assessment in the exact format above.
- Ensure all percentages sum to 100 %. If they do not, reread the outline and adjust division or optional markings accordingly.
"""

def pre_process_outline(text: str) -> str:
    """Pre-process outline text to make dates explicit for GPT parsing."""
    year = str(datetime.date.today().year)
    # Handle lines like “Assignments due on Feb 1, Feb 14…”
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
    # Handle “Quizzes are in Lab during the weeks of Jan 27, Feb 3, …”
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
    # Convert “X is scheduled for Month DD” to explicit date
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

def parse_outline_with_gpt(outline_text: str) -> list[dict]:
    """Parse a course outline into assessment items using GPT."""
    if not outline_text.strip():
        return []
    outline_text = pre_process_outline(outline_text)
    messages = [
        {"role": "system", "content": SCHEDULER_PROMPT},
        {"role": "user",   "content": outline_text}
    ]
    resp = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=messages,
        store=True
    )
    raw = resp.choices[0].message.content or ""
    lines = [l.strip() for l in raw.splitlines() if l.strip()]
    items = []
    for line in lines:
        parts = [p.strip() for p in line.split(",")]
        if len(parts) == 3:
            name, date, percent = parts
            items.append({"name": name, "date": date, "percent": percent})
    return items
