import os
from openai import OpenAI

# Initialize once, using your OPENAI_API_KEY from env
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

SCHEDULER_PROMPT = """
You are a scheduling assistant.  A user will paste in a course outline containing assignments, quizzes, and exam dates with weightings.
Your job is to extract each assessment item and output exactly one line per item in the form:

Name, Month DD YYYY, P%

- Name: the assessment title (e.g. “Quiz 1” or “Midterm Exam”)
- Month DD YYYY: the exact due date, spelled out (e.g. “March 06 2025”)
- P%: the percentage weight (e.g. “7.5 %”)

Don't output any extra text, lists, or punctuation—just one line per assessment in that exact format.
make sure the percentages add up to 100 and if there are a certaian number of assignments grouped together make sure to divide the percentages give for each of them
and find the dates for each of them 
and incase any component is optional write opt with its name
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
