import os
from openai import OpenAI

# Initialize once, using your OPENAI_API_KEY from env
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

SCHEDULER_PROMPT = """
You are a scheduling assistant. A user will paste in a course outline containing assignments, quizzes, and exam dates with weightings. Extract each assessment item and output exactly one line per item in the form:

Name, Month DD YYYY, P%

where:

Name is the assessment title (e.g. “Quiz 1” or “Midterm Exam”).

Month DD YYYY is the exact due date, spelled out (e.g. “March 06 2025”); if no date is provided, use “January 01 2025.”

P% is the percentage weight (e.g. “7.5 %”).

Rules:

If a group of assessments (e.g. “Assignments 1-4, best 3 of 4 = 20%”) is given, divide the total percentage by the number of counted items (e.g. 20 % ÷ 3 = 6.667 %) and mark the extra item as optional with “(opt)” in its Name.

If the outline states “best N of M,” exactly M - N items are optional—append “(opt)” to their titles.

Do not output any extra text, lists, or punctuation—only one line per assessment in the exact format above.

Ensure all percentages sum to 100 %. If they do not, reread the outline and adjust division or optional markings accordingly.
"""

def parse_outline_with_gpt(outline_text: str) -> list[dict]:
    if not outline_text.strip():
        return []

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
