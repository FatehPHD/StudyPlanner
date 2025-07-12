import os
import re
import datetime
from openai import OpenAI

# Initialize once, using your OPENAI_API_KEY from env
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

# Dynamically insert the current year into the prompt
current_year = datetime.date.today().year

SCHEDULER_PROMPT = f"""
You are a scheduling assistant. A user will paste in a course outline containing assignments, quizzes, and exam dates with weightings. Extract each assessment item and output exactly one line per item in the form:

Name, Month DD YYYY, P%

where:

Name is the assessment title (e.g. "Quiz 1" or "Midterm Exam").

Month DD YYYY is the exact due date, spelled out (e.g. "March 06 {current_year}"); if no date is provided, use "January 01 {current_year}."

P% is the percentage weight (e.g. "7.5 %").

Rules:

If a group of assessments (e.g. "Assignments 1-4, best 3 of 4 = 20%") is given, divide the total percentage by the number of counted items (e.g. 20 % ÷ 3 = 6.667 %) and mark the extra item as optional with "(opt)" in its Name.

If the outline states "best N of M," exactly M - N items are optional—append "(opt)" to their titles.

Also detect sentences of the form "<Assessment> is scheduled for Month DD[, YYYY]" and convert them into list entries. If the year is missing, assume {current_year}.

Do not output any extra text, lists, or punctuation—only one line per assessment in the exact format above.

Ensure all percentages sum to 100 %. If they do not, reread the outline and adjust division or optional markings accordingly.
"""


def pre_process_outline(text: str) -> str:
    year = str(datetime.date.today().year)

    # 1) Catch the “Assignments due on Feb 1, Feb 14…” line
    m = re.search(
        r'Assignments.*?due on\s+([^\.]+)',
        text, flags=re.IGNORECASE
    )
    if m:
        # split out each date
        dates = re.split(r',\s*| and ', m.group(1))
        # build explicit lines
        items = []
        for i, d in enumerate(dates, start=1):
            # ensure it has the year
            d = d.strip()
            if not re.search(r'\d{4}', d):
                d = f"{d} {year}"
            items.append(f"Assignment {i}, {d},")
        # prepend to the document so GPT sees them first
        text = "\n".join(items) + "\n" + text

    # 2) Catch the “Quizzes are in Lab during the weeks of Jan 27, Feb 3, …”
    m2 = re.search(
        r'Quizzes.*?weeks of\s+([^\.]+)',
        text, flags=re.IGNORECASE
    )
    if m2:
        dates = re.split(r',\s*| and ', m2.group(1))
        items = []
        for i, d in enumerate(dates, start=1):
            d = d.strip()
            if not re.search(r'\d{4}', d):
                d = f"{d} {year}"
            items.append(f"Quiz {i}, {d},")
        text = "\n".join(items) + "\n" + text

    # …then your existing “scheduled for” and bare‐Month‐DD rules…
    # Pattern: “X is scheduled for Month DD”
    text = re.sub(
        r'([A-Z][^\n]+?)\s+is scheduled for\s+'
        r'(January|February|…|December)\s+(\d{1,2})(?!\s*\d{4})',
        lambda m: f"{m.group(1)} — {m.group(2)} {m.group(3)} {year}",
        text
    )
    # Pattern: bare Month DD → Month DD YYYY
    text = re.sub(
        r'\b(January|February|…|December)\s+(\d{1,2})(?!\s*\d{4})\b',
        rf'\1 \2 {year}',
        text
    )

    return text



def parse_outline_with_gpt(outline_text: str) -> list[dict]:
    if not outline_text.strip():
        return []

    # Pre-process the outline for explicit dates
    outline_text = pre_process_outline(outline_text)

    # Build the chat messages
    messages = [
        {"role": "system", "content": SCHEDULER_PROMPT},
        {"role": "user",   "content": outline_text}
    ]

    # Call GPT-4o-mini
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
        # Expect exactly 3 parts: name, date, percent
        if len(parts) == 3:
            name, date, percent = parts
            items.append({"name": name, "date": date, "percent": percent})
    return items
