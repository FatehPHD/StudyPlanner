import os, re
try:
    import openai
    openai.api_key = os.getenv("OPENAI_API_KEY", "")
except ImportError:
    openai = None

SYSTEM_PROMPT = """…"""

def parse_outline_with_gpt(outline_text: str):
    # If no key or OpenAI lib, return a mock response
    if not openai or not openai.api_key:
        print("⚠️  No OPENAI_API_KEY found — using mock data")
        return [
            {"name": "Quiz 1",         "date": "January 27 2025",  "percent": "7.5 %"},
            {"name": "Assignment 1",   "date": "February 1 2025",  "percent": "6.67 %"},
            {"name": "Midterm Exam",   "date": "March 6 2025",      "percent": "20 %"},
        ]

    # Otherwise call GPT-o4-mini as before
    resp = openai.ChatCompletion.create(
        model="o4-mini",
        messages=[
            {"role": "system",  "content": SYSTEM_PROMPT},
            {"role": "user",    "content": outline_text}
        ]
    )
    lines = resp.choices[0].message.content.strip().splitlines()
    parsed = []
    for line in lines:
        m = re.match(r"(.+),\s*([A-Za-z]+\s+\d{1,2}\s+\d{4}),\s*([\d.]+)\s*%", line)
        if m:
            parsed.append({
                "name":    m.group(1),
                "date":    m.group(2),
                "percent": m.group(3) + " %"
            })
    return parsed
