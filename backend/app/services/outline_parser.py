import re
from dataclasses import dataclass, asdict
from datetime import datetime
from typing import List, Optional, Dict, Tuple, Callable
import pdfplumber

# -----------------------------
# Patterns (tune over time)
# -----------------------------
# Strict: "Assignment 1 : Due March 15, 2024"
ASSIGNMENT_DUE_RE = re.compile(
    r"(Assignment|Lab)\s*(\d+)\s*:\s*Due\s*(?:on\s*)?([A-Za-z]{3,9}\s+\d{1,2},?\s+\d{4})\s*(\d{1,2}:\d{2}\s*[AP]M)?",
    re.IGNORECASE
)

# Looser: "Assignment 1 due March 15", "Due: March 15, 2024", "Lab 2 - Due March 15"
DUE_LOOSE_RE = re.compile(
    r"(Assignment|Lab|Homework|HW)\s*(\d+)\b.{0,30}?(?:due|due\s*date)\s*:?\s*([A-Za-z]{3,9}\s+\d{1,2},?\s*\d{4})"
    r"|(?:Due|Due\s*date)\s*:?\s*([A-Za-z]{3,9}\s+\d{1,2},?\s*\d{4})\s*[\(\[]?(Assignment|Lab)\s*(\d+)",
    re.IGNORECASE
)

# Date-only fallback: "March 15, 2024" near "assignment" or "lab"
DUE_DATE_ONLY_RE = re.compile(
    r"(Assignment|Lab|Homework)\s*(\d+).{0,80}?([A-Za-z]{3,9}\s+\d{1,2},?\s+\d{4})",
    re.IGNORECASE
)

# "due date for each assignment is: January 30, February 13, March 6, March 20 and April 3"
DUE_ASSIGNMENT_LIST_RE = re.compile(
    r"(?:due\s+date\s+for\s+each\s+)?(?:assignment|lab)s?\s*(?:is|are)\s*:?\s*",
    re.IGNORECASE
)

# "#1 : January 29", "#2 : March 12" (Individual Assignments)
# "#1 Team Charter... : February 5", "#2 Video Lesson: March 5" (Team Activities)
DUE_HASH_RE = re.compile(
    r"#(\d+)\s*:?\s*([A-Za-z]{3,9}\s+\d{1,2}(?:,?\s*\d{4})?)|"
    r"#(\d+)\s+([^:]+?)\s*:\s*([A-Za-z]{3,9}\s+\d{1,2}(?:,?\s*\d{4})?)",
    re.IGNORECASE
)

# Strict weights
WEIGHT_RE = re.compile(
    r"\b(Quiz(?:\s*\d+)?|Final\s*Exam|Midterm(?:\s*\d+)?|Project|Assignments?|Labs?|Lab\s*Reports?)\b"
    r".{0,40}?\b(\d{1,3}(?:\.\d+)?)\s*%\b",
    re.IGNORECASE
)

# Looser: "30% Assignments", "Assignments (30%)", "Assignments - 30%"
WEIGHT_LOOSE_RE = re.compile(
    r"\b(\d{1,3}(?:\.\d+)?)\s*%\s*(?:[-–—]\s*)?(Quiz(?:\s*\d+)?|Final\s*Exam|Midterm(?:\s*\d+)?|Project|Assignments?|Labs?|Participation|Attendance|Reports?)\b"
    r"|\b(Quiz(?:\s*\d+)?|Final\s*Exam|Midterm(?:\s*\d+)?|Project|Assignments?|Labs?|Participation|Attendance|Reports?)\s*[\(\[]?\s*(\d{1,3}(?:\.\d+)?)\s*%\s*[\)\]]?",
    re.IGNORECASE
)

# Catch "X%" within 50 chars of component keywords (for odd layouts)
WEIGHT_NEAR_RE = re.compile(
    r"(?:Assignments?|Labs?|Quiz(?:zes)?|Midterm|Final\s*Exam|Project|Participation|Attendance|Reports?)\s*.{0,50}?(\d{1,3}(?:\.\d+)?)\s*%"
    r"|(\d{1,3}(?:\.\d+)?)\s*%.{0,50}?(?:Assignments?|Labs?|Quiz(?:zes)?|Midterm|Final\s*Exam|Project|Participation|Attendance|Reports?)",
    re.IGNORECASE
)

@dataclass
class DueItem:
    kind: str
    number: str
    due_date_raw: str
    due_time_raw: str
    page: int

@dataclass
class WeightItem:
    component: str
    weight: float
    page: int
    raw: str

# Date pattern: "Jan 30, 2026", "Feb 24 2026", "March 15, 2024"
DATE_RE = re.compile(r"[A-Za-z]{3,9}\s+\d{1,2},?\s*\d{4}")
# Month names only - for multi-date extraction (avoids "Module 0", "Page 4" false positives)
# Optional . after abbrev (e.g. "Apr. 10, 2026")
MONTHS = r"(?:Jan(?:uary)?\.?|Feb(?:ruary)?\.?|Mar(?:ch)?\.?|Apr(?:il)?\.?|May\.?|Jun(?:e)?\.?|Jul(?:y)?\.?|Aug(?:ust)?\.?|Sep(?:tember)?\.?|Oct(?:ober)?\.?|Nov(?:ember)?\.?|Dec(?:ember)?\.?)"
DATE_OPTIONAL_YEAR_RE = re.compile(rf"\b{MONTHS}\s+\d{{1,2}}(?:,?\s*\d{{4}})?\b", re.IGNORECASE)

NO_DATE_STR = "no date allocated"

# Time range: "7:00-8:30pm", "7:00-8:30 PM", "11:59pm"
TIME_RANGE_RE = re.compile(r"(\d{1,2}:\d{2})\s*[-–]\s*(\d{1,2}:\d{2})\s*([AP]M)?", re.IGNORECASE)
TIME_SINGLE_RE = re.compile(r"(\d{1,2}:\d{2})\s*([AP]M)", re.IGNORECASE)

def find_time_for_component(component: str, text: str, window: int = 200) -> str:
    """Extract time or time range for component (e.g. Midterm 7:00-8:30 PM)."""
    section = _get_section_for_component(text, component, max_chars=window + 200)
    pat = _search_pattern_for_component(component)
    for m in pat.finditer(section):
        snippet = section[m.end() : m.end() + window]
        # Prefer time range (e.g. 7:00-8:30 PM)
        tr = TIME_RANGE_RE.search(snippet)
        if tr:
            t1, t2, ampm = tr.group(1), tr.group(2), (tr.group(3) or "PM").upper()
            return f"{t1}-{t2} {ampm}"
        ts = TIME_SINGLE_RE.search(snippet)
        if ts:
            return f"{ts.group(1)} {ts.group(2).upper()}"
    return ""

@dataclass
class ParseResult:
    dues: List[DueItem]
    weights: List[WeightItem]
    total_weight: float
    weight_ok: bool
    warnings: List[str]
    method: str
    component_dates: Optional[Dict[str, str]] = None  # component -> date or NO_DATE_STR
    component_multi_dates: Optional[Dict[str, List[str]]] = None  # component -> [date1, date2, ...] when multiple deadlines
    component_multi_items: Optional[Dict[str, List[Tuple[str, str]]]] = None  # component -> [(label, date), ...] when we have "Label: Date" structure
    component_times: Optional[Dict[str, str]] = None  # component -> time string (e.g. "7:00-8:30 PM")

# -----------------------------
# PDF extraction (grab entire PDF first)
# -----------------------------

def extract_full_pdf(pdf_path: str) -> Tuple[str, List[str]]:
    """Extract full PDF content. Returns (full_text, pages_text)."""
    pages_text: List[str] = []
    with pdfplumber.open(pdf_path) as pdf:
        for p in pdf.pages:
            pages_text.append(p.extract_text() or "")
    full_text = "\n".join(pages_text)
    return full_text, pages_text

# -----------------------------
# Parsing helpers
# -----------------------------

def normalize_component(name: str) -> str:
    n = re.sub(r"\s+", " ", name.strip(), flags=re.IGNORECASE)
    n = n.replace("Exam", "Exam").title()
    # Preserve Roman numerals (II, III, IV, etc.) - title() turns "II" into "Ii"
    n = re.sub(r"\bIi\b", "II", n)
    n = re.sub(r"\bIii\b", "III", n)
    n = re.sub(r"\bIv\b", "IV", n)
    return n

def _search_pattern_for_component(component: str) -> re.Pattern:
    """Build flexible regex to find component in text. Handles Quiz/Quiz 1, Final Exam, Assignments, etc."""
    comp = re.sub(r"\s+", " ", component.strip())
    # Use first significant word as anchor; allow optional number (Quiz 1, Midterm 2)
    parts = [p for p in comp.split() if not p.isdigit()]
    if not parts:
        return re.compile(r"$^")
    # Match "Quiz" or "Quiz 1", "Final" or "Final Exam", "Assignment" or "Assignments"
    first = re.escape(parts[0])
    return re.compile(rf"\b{first}\w*(?:\s+\d+)?\b", re.IGNORECASE)

def find_date_for_component(component: str, text: str, window: int = 150) -> str:
    """
    Search for a date near the component name in text.
    Uses section-scoped search so we don't mix dates (e.g. Final Exam vs Final Project).
    Returns NO_DATE_STR when context says no date (e.g. 'Registrar scheduled', 'TBA').
    """
    section = _get_section_for_component(text, component, max_chars=window + 300)
    pat = _search_pattern_for_component(component)
    candidates: List[Tuple[int, str]] = []  # (distance, date) - lower distance = better
    for m in pat.finditer(section):
        after = section[m.end() : m.end() + window]
        after_lower = after.lower()
        # No date if explicitly says Registrar scheduled, TBA, etc.
        if re.search(r"registrar\s+scheduled|tba|to\s+be\s+announced|date\s+tba", after_lower):
            return NO_DATE_STR  # explicit no-date
        # If 'after' looks like grading table (weight %), don't use 'before' - date could be wrong component
        if re.search(r"\d+\s*%", after[:60]):
            before = ""
        else:
            before = section[max(0, m.start() - window) : m.start()]
        for snippet, dist_penalty in [(after, 0), (before, 100)]:
            if not snippet:
                continue
            date_m = DATE_RE.search(snippet) or DATE_OPTIONAL_YEAR_RE.search(snippet)
            if date_m:
                date_str = date_m.group(0).strip()
                if not re.search(r"\d{4}", date_str):
                    date_str = date_str + ", 2026"
                ctx = snippet[: date_m.start() + 80].lower()
                if "scheduled" in ctx or "due" in ctx or "date" in ctx:
                    dist_penalty -= 50
                candidates.append((dist_penalty, date_str))
    if not candidates:
        return NO_DATE_STR
    candidates.sort(key=lambda x: x[0])
    return candidates[0][1]

def _normalize_date_for_dedup(d: str) -> str:
    """Normalize 'Jan 22, 2026' and 'January 22, 2026' to same form for deduplication."""
    d = d.strip()
    if not re.search(r"\d{4}", d):
        d = d + ", 2026"
    # Expand short months for consistent dedup
    months = {"jan": "January", "feb": "February", "mar": "March", "apr": "April", "may": "May",
              "jun": "June", "jul": "July", "aug": "August", "sep": "September", "oct": "October",
              "nov": "November", "dec": "December"}
    for short, long in months.items():
        if re.match(rf"\b{short}\b", d, re.I):
            d = re.sub(rf"\b{short}\b", long, d, count=1, flags=re.I)
            break
    return d

# "Label: Date" pattern - e.g. "Intro quiz: January 22", "Module 0: January 22"
LABEL_DATE_RE = re.compile(
    r"^([^:\n]+?)\s*:\s*(" + MONTHS + r"\s+\d{1,2}(?:,?\s*\d{4})?)\s*$",
    re.IGNORECASE | re.MULTILINE
)

# Final Project: "proposal... March 13", "demo... April 8 (L02) or Friday, April 10 (L01)", "report... April 14"
# Use "will be due" / "due at" to avoid matching intro list ("the project proposal, the project demo and the project report")
FINAL_PROJECT_PROPOSAL_RE = re.compile(r"proposal\s+will\s+be\s+due.{0,60}?(" + MONTHS + r"\s+\d{1,2}(?:,?\s*\d{4})?)", re.IGNORECASE)
FINAL_PROJECT_DEMO_RE = re.compile(r"demo\b.{0,120}?(" + MONTHS + r"\s+\d{1,2}(?:,?\s*\d{4})?)\s*\(L(\d+)\)", re.IGNORECASE)
FINAL_PROJECT_REPORT_RE = re.compile(r"report\s+will\s+be\s+due.{0,60}?(" + MONTHS + r"\s+\d{1,2}(?:,?\s*\d{4})?)", re.IGNORECASE)

def find_multi_items_final_project(text: str) -> List[Tuple[str, str]]:
    """
    Parse Final Project structure: Proposal, Demo (L02), Demo (L01), Report.
    Returns [(label, date), ...] in chronological order.
    """
    section = _get_section_for_component(text, "Final Project", max_chars=600)
    items: List[Tuple[str, str]] = []
    seen: set[Tuple[str, str]] = set()
    # Proposal
    for m in FINAL_PROJECT_PROPOSAL_RE.finditer(section):
        d = m.group(1).strip()
        if not re.search(r"\d{4}", d):
            d = d + ", 2026"
        key = ("Proposal", d)
        if key not in seen:
            seen.add(key)
            items.append(("Proposal", d))
    # Demo - can have multiple (L02, L01) with different dates in same sentence
    for m in FINAL_PROJECT_DEMO_RE.finditer(section):
        d = m.group(1).strip()
        lab = m.group(2).strip()
        if not re.search(r"\d{4}", d):
            d = d + ", 2026"
        key = (f"Demo (L{lab})", d)
        if key not in seen:
            seen.add(key)
            items.append((f"Demo (L{lab})", d))
    # Also find "April 10 (L01)" when "or Friday, April 10 (L01)" appears after first demo match
    demo_date_lab_re = re.compile(rf"({MONTHS}\s+\d{{1,2}}(?:,?\s*\d{{4}})?)\s*\(L(\d+)\)", re.IGNORECASE)
    for m in demo_date_lab_re.finditer(section):
        if "demo" in section[max(0, m.start() - 150) : m.start()].lower():
            d = m.group(1).strip()
            lab = m.group(2).strip()
            if not re.search(r"\d{4}", d):
                d = d + ", 2026"
            key = (f"Demo (L{lab})", d)
            if key not in seen:
                seen.add(key)
                items.append((f"Demo (L{lab})", d))
    # Report
    for m in FINAL_PROJECT_REPORT_RE.finditer(section):
        d = m.group(1).strip()
        if not re.search(r"\d{4}", d):
            d = d + ", 2026"
        key = ("Report", d)
        if key not in seen:
            seen.add(key)
            items.append(("Report", d))
    return sorted(items, key=lambda x: _parse_date_for_sort(x[1]))

def find_multi_items_label_date(component: str, text: str, window: int = 500) -> List[Tuple[str, str]]:
    """
    Parse "Label: Date" structure (e.g. Course Progress Checks with Intro quiz, Module 0, etc.).
    Returns [(label, date), ...]. Excludes "Discussion Period" and "Open between" range lines.
    """
    pat = _search_pattern_for_component(component)
    items: List[Tuple[str, str]] = []
    seen: set[Tuple[str, str]] = set()
    for m in pat.finditer(text):
        snippet = text[m.end() : m.end() + window]
        if re.search(r"registrar\s+scheduled|tba|to\s+be\s+announced", snippet.lower()):
            continue
        if re.search(r"\d+\s*%", snippet[:80]):
            continue
        stop = re.search(r"\n(?:Individual\s+Assignments|Team\s+Activities|Team\s+Grades)\b", snippet, re.I)
        if stop:
            snippet = snippet[: stop.start()]
        for line in snippet.split("\n"):
            line = line.strip()
            if not line or "discussion period" in line.lower() or "open between" in line.lower() or "between " in line.lower():
                continue
            lm = LABEL_DATE_RE.match(line)
            if lm:
                label = lm.group(1).strip()
                date_str = lm.group(2).strip()
                if not re.search(r"\d{4}", date_str):
                    date_str = date_str + ", 2026"
                key = (label.lower(), date_str)
                if key not in seen:
                    seen.add(key)
                    items.append((label, date_str))
    return items

# Section boundaries: stop date extraction when we hit the next component's section
# (avoids mixing Assignment dates with Final Project dates, etc.)
_SECTION_BOUNDARIES = re.compile(
    r"\b(the\s+final\s+project|one\s+final\s+project|the\s+midterm|midterm\s+test\s+[IVX\d]+|"
    r"the\s+final\s+exam|one\s+final\s+exam|one\s+midterm|\d+\s*-\s*midterm\s+test|"
    r"individual\s+assignments|team\s+activities|final\s+grade\s+determination|"
    r"\d+\s*-\s*group\s+project|\d+\s*-\s*final\s+quiz|in-class\s+participation|one\s+hands\s+on\s+project)\b",
    re.IGNORECASE
)

def _get_section_for_component(text: str, component: str, max_chars: int = 800) -> str:
    """
    Get the text section that discusses this component. Stops at the next section boundary
    so we don't mix dates from different components (e.g. Assignment dates vs Final Project dates).
    Prefers "The X" (paragraph start) over "one X" (intro sentence) for better section targeting.
    """
    comp_lower = component.lower()
    # Use more specific patterns; prefer "The X" to skip intro mentions like "one final project"
    if "final exam" in comp_lower or comp_lower == "final exam":
        # Prefer "The final exam" (paragraph start)
        m = re.search(r"\bthe\s+final\s+exam\b", text, re.IGNORECASE)
        if not m:
            m = re.search(r"\bfinal\s+exam\b", text, re.IGNORECASE)
    elif "final project" in comp_lower or (comp_lower == "project" and "final" in text.lower()[:500]):
        m = re.search(r"\bthe\s+final\s+project\b", text, re.IGNORECASE)
        if not m:
            m = re.search(r"\bfinal\s+project\b", text, re.IGNORECASE)
    elif "midterm" in comp_lower:
        m = None
        # Prefer "Midterm Test II" for Midterm II, "Midterm Test I" for Midterm I
        if "ii" in comp_lower or "2" in comp_lower:
            m = re.search(r"\bmidterm\s+test\s+ii\b", text, re.IGNORECASE)
            if not m:
                m = re.search(r"\bmidterm\s+ii\b", text, re.IGNORECASE)
        if not m:
            m = re.search(r"\bthe\s+midterm\b", text, re.IGNORECASE)
        if not m:
            m = re.search(r"\bmidterm\s+test\s+i\b", text, re.IGNORECASE)
        if not m:
            m = re.search(r"\bmidterm\b", text, re.IGNORECASE)
    elif "quiz" in comp_lower:
        m = re.search(r"\b\d+\s+quizzes?\s+held\b", text, re.IGNORECASE)
        if not m:
            m = re.search(r"\bquizzes?\b", text, re.IGNORECASE)
    elif "lab" in comp_lower and "assignment" in comp_lower:
        m = re.search(r"\b(?:individual\s+)?lab\s+assignments?\b", text, re.IGNORECASE)
        if not m:
            m = re.search(r"\blab\s+assignments?\b", text, re.IGNORECASE)
    elif "assignment" in comp_lower:
        m = re.search(r"\bthe\s+assignments\b", text, re.IGNORECASE)
        if not m:
            m = re.search(r"\bdue\s+date\s+for\s+each\s+assignment\b", text, re.IGNORECASE)
        if not m:
            m = re.search(r"\bassignments?\b", text, re.IGNORECASE)
    else:
        pat = _search_pattern_for_component(component)
        m = pat.search(text)
    if not m:
        return text[:max_chars]  # fallback to start of text
    start = m.start()
    snippet = text[start : start + max_chars]
    # Stop at next section boundary
    boundary = _SECTION_BOUNDARIES.search(snippet[50:])  # skip past our own header
    if boundary:
        snippet = snippet[: 50 + boundary.start()]
    return snippet

def find_multi_dates_for_component(component: str, text: str, window: int = 400) -> List[str]:
    """
    When a component has multiple deadlines, find all unique dates near the component.
    Uses section-scoped search to avoid mixing dates from different components.
    Excludes dates inside "between X-Y" or "Open between" ranges.
    """
    section = _get_section_for_component(text, component, max_chars=window + 200)
    pat = _search_pattern_for_component(component)
    all_dates: List[str] = []
    seen_norm: set[str] = set()
    for m in pat.finditer(section):
        snippet = section[m.end() : m.end() + window]
        if re.search(r"registrar\s+scheduled|tba|to\s+be\s+announced", snippet.lower()):
            continue
        if re.search(r"\d+\s*%", snippet[:80]):
            continue
        stop = re.search(r"\n(?:Individual\s+Assignments|Team\s+Activities|Team\s+Grades)\b", snippet, re.I)
        if stop:
            snippet = snippet[: stop.start()]
        for date_m in DATE_OPTIONAL_YEAR_RE.finditer(snippet):
            d = date_m.group(0).strip()
            if not re.search(r"\d{4}", d):
                d = d + ", 2026"
            if re.search(r"between\s+" + re.escape(d), snippet, re.I) or re.search(r"open\s+between", snippet[:date_m.start() + 50], re.I):
                continue
            norm = _normalize_date_for_dedup(d)
            if norm not in seen_norm:
                seen_norm.add(norm)
                all_dates.append(d)
        # Expand "Feb 2 and 4" -> Feb 2, Feb 4 (day-only after "and")
        and_day_re = re.compile(rf"({MONTHS}\s+)(\d{{1,2}})\s+and\s+(\d{{1,2}})", re.IGNORECASE)
        for am in and_day_re.finditer(snippet):
            month_part, day1, day2 = am.group(1), am.group(2), am.group(3)
            for day in (day1, day2):
                d = f"{month_part}{day}".strip()
                if not re.search(r"\d{4}", d):
                    d = d + ", 2026"
                norm = _normalize_date_for_dedup(d)
                if norm not in seen_norm:
                    seen_norm.add(norm)
                    all_dates.append(d)
    return sorted(all_dates)

def enrich_component_dates(result: ParseResult, full_text: str) -> None:
    """For each weight component, find its date(s). If multiple dates found, store in component_multi_dates or component_multi_items."""
    dates: Dict[str, str] = {}
    multi_dates: Dict[str, List[str]] = {}
    multi_items: Dict[str, List[Tuple[str, str]]] = {}
    times: Dict[str, str] = {}
    for wi in result.weights:
        comp = wi.component
        if comp in dates:
            continue
        single = find_date_for_component(comp, full_text)
        # For Lab/Assignments/Quizzes with multiple dates, prefer multi-dates
        if single != NO_DATE_STR and ("lab" in comp.lower() or "assignment" in comp.lower() or "quiz" in comp.lower()):
            multi = find_multi_dates_for_component(comp, full_text)
            if len(multi) >= 2:
                multi_dates[comp] = multi
                single = NO_DATE_STR
        if single != NO_DATE_STR:
            dates[comp] = single
        else:
            if not re.match(r"^(?:Assignment\s*#\d+|#\d+\s+)", comp, re.I):
                # Try Final Project structure (Proposal, Demo L02, Demo L01, Report)
                if "project" in comp.lower() and "final" in comp.lower():
                    label_items = find_multi_items_final_project(full_text)
                    if len(label_items) >= 2:
                        multi_items[comp] = label_items
                # Try "Label: Date" structure (e.g. Intro quiz: January 22, Module 0: January 22)
                if comp not in multi_items:
                    label_items = find_multi_items_label_date(comp, full_text)
                    if len(label_items) >= 2:
                        multi_items[comp] = label_items
                if comp not in multi_items:
                    multi = find_multi_dates_for_component(comp, full_text)
                    if len(multi) >= 2:
                        multi_dates[comp] = multi
            dates[comp] = NO_DATE_STR
        # Extract time (e.g. Midterm 7:00-8:30 PM)
        t = find_time_for_component(comp, full_text)
        if t:
            times[comp] = t
    result.component_dates = dates
    result.component_multi_dates = multi_dates
    result.component_multi_items = multi_items
    result.component_times = times
    # Remove misleading "No due dates found" warning when we got dates from enrichment
    has_dates = (
        any(v != NO_DATE_STR for v in dates.values()) or
        bool(multi_dates) or
        bool(multi_items)
    )
    if has_dates and result.warnings:
        result.warnings = [w for w in result.warnings if "no due dates found" not in w.lower()]

DEFAULT_TIME = "11:59 PM"

def _parse_date_for_sort(s: str) -> Tuple[int, int, int]:
    """Parse date string to (year, month, day) for sorting. Returns (9999, 12, 31) for invalid/TBD."""
    if not s or s == NO_DATE_STR or s.upper() == "TBD":
        return (9999, 12, 31)
    for fmt in ("%B %d, %Y", "%b %d, %Y", "%B %d %Y", "%b %d %Y", "%B %d", "%b %d"):
        try:
            dt = datetime.strptime(s.strip(), fmt)
            if dt.year == 1900:  # no year in format
                dt = dt.replace(year=2026)
            return (dt.year, dt.month, dt.day)
        except ValueError:
            continue
    return (9999, 12, 31)

def build_unified_items(result: ParseResult) -> List[dict]:
    """
    Merge dues and weights into one table. When a weight component (e.g. Assignments 60%)
    matches multiple dues (Assignment 1-5), split the weight evenly across them.
    If time is not found, defaults to 11:59 PM.
    """
    items: List[dict] = []
    component_dates = result.component_dates or {}
    component_multi_dates = result.component_multi_dates or {}
    component_multi_items = result.component_multi_items or {}
    component_times = result.component_times or {}

    def matches_due(weight_comp: str, due_kind: str) -> bool:
        w = weight_comp.lower()
        d = due_kind.lower()
        if "assignment" in w and ("assignment" in d or d == "assignment"):
            return True
        if "lab" in w and d == "lab":
            return True
        if "homework" in w and d == "homework":
            return True
        if ("case" in w or "proposal" in w) and ("case" in d or "proposal" in d or "charter" in d):
            return True
        if ("video" in w or "lesson" in w) and ("video" in d or "lesson" in d):
            return True
        if "reflection" in w and "reflection" in d:
            return True
        return False

    for wi in result.weights:
        comp = wi.component
        weight = wi.weight
        date_val = component_dates.get(comp, "")
        page = wi.page
        raw = wi.raw

        # Extract number from component (e.g. "Assignment #1" -> 1, "#1 Case Proposal" -> 1)
        num_match = re.search(r"#?(\d+)", comp)
        comp_num = num_match.group(1) if num_match else None

        # Find matching dues (Assignment 1,2,3... or Lab 1,2...)
        matching_dues = [
            d for d in result.dues
            if matches_due(comp, d.kind) and (comp_num is None or d.number == comp_num)
        ]
        matching_dues.sort(key=lambda d: (d.kind, int(d.number) if d.number.isdigit() else 0))

        if matching_dues:
            # Split weight evenly across dues
            n = len(matching_dues)
            per_item = round(weight / n, 1)
            for d in matching_dues:
                if n == 1:
                    comp_name = comp
                    if comp.startswith("#") and ("case" in d.kind.lower() or "video" in d.kind.lower() or "reflection" in d.kind.lower()):
                        comp_name = "Team " + re.sub(r"^#\d+\s+", "", comp)
                else:
                    comp_name = f"{d.kind} #{d.number} ({d.number}/{n})"
                items.append({
                    "component": comp_name,
                    "weight": per_item,
                    "due_date": d.due_date_raw,
                    "due_time": (d.due_time_raw or "").strip() or DEFAULT_TIME,
                    "page": d.page,
                    "raw": raw,
                })
        else:
            # Single row or split by multiple dates/items
            label_items = component_multi_items.get(comp)
            if label_items and len(label_items) >= 2:
                base = comp.replace(" Checks", " Check") if "Progress Checks" in comp else comp
                label_items_sorted = sorted(label_items, key=lambda x: _parse_date_for_sort(x[1]))
                # Final Project: 3 parts (Proposal, Demo, Report) - Demo can have 2 dates (L02, L01)
                if "project" in comp.lower() and any("demo" in lb.lower() for lb, _ in label_items):
                    total_parts = 3
                    per_item = round(weight / total_parts, 2)  # 6.67% each
                    for idx, (label, d) in enumerate(label_items_sorted):
                        part = 2 if "demo" in label.lower() else (1 if "proposal" in label.lower() else 3)
                        due_time = "" if "demo" in label.lower() else DEFAULT_TIME
                        items.append({
                            "component": f"{base} – {label} ({part}/{total_parts})",
                            "weight": per_item,
                            "due_date": d,
                            "due_time": due_time,
                            "page": page,
                            "raw": raw,
                        })
                else:
                    per_item = round(weight / len(label_items_sorted), 1)
                    for idx, (label, d) in enumerate(label_items_sorted):
                        due_time = "" if "demo" in label.lower() else DEFAULT_TIME
                        items.append({
                            "component": f"{base} – {label} ({idx + 1}/{len(label_items_sorted)})",
                            "weight": per_item,
                            "due_date": d,
                            "due_time": due_time,
                            "page": page,
                            "raw": raw,
                        })
            else:
                multi = component_multi_dates.get(comp)
                if multi and len(multi) >= 2:
                    per_item = round(weight / len(multi), 1)
                    multi_sorted = sorted(multi, key=lambda d: _parse_date_for_sort(d))
                    for idx, d in enumerate(multi_sorted):
                        items.append({
                            "component": f"{comp} ({idx + 1}/{len(multi)})",
                            "weight": per_item,
                            "due_date": d,
                            "due_time": DEFAULT_TIME,
                            "page": page,
                            "raw": raw,
                        })
                else:
                    # Use component_times (e.g. Midterm 7:00-8:30 PM) or default
                    due_time = component_times.get(comp, "")
                    if not due_time and date_val and date_val != NO_DATE_STR:
                        due_time = DEFAULT_TIME
                    # Final Exam often shows "TBD" when Registrar-scheduled
                    if "final exam" in comp.lower() and date_val == NO_DATE_STR:
                        date_val = "TBD"
                        if not due_time:
                            due_time = "TBD"
                    items.append({
                        "component": comp,
                        "weight": weight,
                        "due_date": date_val,
                        "due_time": due_time,
                        "page": page,
                        "raw": raw,
                    })

    # Sort entire table by due date (earliest first; no date at end)
    items.sort(key=lambda x: (_parse_date_for_sort(x.get("due_date") or ""), x.get("component", "")))

    return items

def dedupe_weights(weights: List[WeightItem]) -> List[WeightItem]:
    """Remove exact (component, weight) duplicates."""
    seen: set[Tuple[str, float]] = set()
    out: List[WeightItem] = []
    for wi in weights:
        key = (wi.component.lower(), round(wi.weight, 3))
        if key not in seen:
            seen.add(key)
            out.append(wi)
    return out

def merge_weights_by_component(weight_lists: List[List[WeightItem]]) -> List[WeightItem]:
    """Merge weights from multiple techniques. Same component -> keep best."""
    by_comp: Dict[str, WeightItem] = {}

    def score_item(item: WeightItem) -> int:
        """Higher = more reliable. Prefer '68% Quiz 1' over 'Quiz 1 (60%)'."""
        r = (item.raw or "").strip()
        w_str = str(int(item.weight)) if item.weight == int(item.weight) else str(item.weight)
        score = 0
        if w_str in r and "%" in r:
            score += 1
        # Prefer "X% Component" (weight first) - usually clearer
        if re.match(rf"^\s*{re.escape(w_str)}\s*%", r):
            score += 2
        return score

    for wi in (w for lst in weight_lists for w in lst):
        key = wi.component.lower()
        if key not in by_comp:
            by_comp[key] = wi
        elif score_item(wi) > score_item(by_comp[key]):
            by_comp[key] = wi
    return list(by_comp.values())

def validate_total(weights: List[WeightItem], tol: float = 1.5) -> Tuple[float, bool]:
    """Check if weights sum to 100%. tol=1.5 allows for rounding in PDFs."""
    total = sum(w.weight for w in weights)
    ok = abs(total - 100.0) <= tol
    return total, ok

def result_score(r: ParseResult) -> float:
    """Higher = better. Prefer weight_ok, then more data, then closer to 100%."""
    score = 0.0
    if r.weight_ok:
        score += 1000
    score += len(r.dues) * 10
    score += len(r.weights) * 10
    if r.weights:
        score += max(0, 100 - abs(r.total_weight - 100))
    return score

# -----------------------------
# Technique 1: Strict text regex
# -----------------------------

def _parse_dues_strict(pages_text: List[str]) -> List[DueItem]:
    dues: List[DueItem] = []
    for i, txt in enumerate(pages_text):
        for m in ASSIGNMENT_DUE_RE.finditer(txt):
            kind = m.group(1).strip()
            num = m.group(2).strip()
            date_raw = m.group(3).strip()
            time_raw = (m.group(4) or "").strip()
            dues.append(DueItem(kind=kind.title(), number=num, due_date_raw=date_raw, due_time_raw=time_raw, page=i + 1))
    return dues

def _parse_weights_strict(pages_text: List[str]) -> List[WeightItem]:
    weights: List[WeightItem] = []
    for i, txt in enumerate(pages_text):
        for m in WEIGHT_RE.finditer(txt):
            comp = normalize_component(m.group(1))
            w = float(m.group(2))
            weights.append(WeightItem(component=comp, weight=w, page=i + 1, raw=m.group(0).strip()))
    return weights

def technique_1_strict_regex(pdf_path: str, full_text: str, pages_text: List[str]) -> ParseResult:
    dues = _parse_dues_strict(pages_text)
    weights = dedupe_weights(_parse_weights_strict(pages_text))
    total, ok = validate_total(weights)
    warnings = []
    if not dues:
        warnings.append("No due dates found (strict regex).")
    if not weights:
        warnings.append("No weights found (strict regex).")
    if weights and not ok:
        warnings.append(f"Weights do not sum to 100 (sum={total:.1f}%).")
    return ParseResult(
        dues=dues,
        weights=weights,
        total_weight=total,
        weight_ok=ok,
        warnings=warnings,
        method="technique_1_strict_regex"
    )

# -----------------------------
# Technique 2: Looser regex
# -----------------------------

def _parse_dues_assignment_list(pages_text: List[str]) -> List[DueItem]:
    """Parse 'due date for each assignment is: January 30, February 13, March 6, March 20 and April 3'."""
    dues: List[DueItem] = []
    full = "\n".join(pages_text)
    for m in DUE_ASSIGNMENT_LIST_RE.finditer(full):
        after = full[m.end() : m.end() + 300]
        dates = DATE_OPTIONAL_YEAR_RE.findall(after)
        if not dates:
            continue
        # Limit to first 10 dates (avoid grabbing dates from next section)
        dates = list(dict.fromkeys(dates))[:10]
        for i, d in enumerate(dates):
            if not re.search(r"\d{4}", d):
                d = d + ", 2026"
            page = 1
            for pi, pt in enumerate(pages_text):
                if m.group(0) in pt or d in pt:
                    page = pi + 1
                    break
            dues.append(DueItem(kind="Assignment", number=str(i + 1), due_date_raw=d.strip(), due_time_raw="", page=page))
        break  # only first match
    return dues

def _parse_dues_hash(pages_text: List[str]) -> List[DueItem]:
    """Parse '#1 : January 29' and '#1 Case Proposal: February 5' formats."""
    dues: List[DueItem] = []
    seen: set[Tuple[str, str, str]] = set()
    for i, txt in enumerate(pages_text):
        # Determine section per match: use last section header before each match
        def section_at(pos: int) -> str:
            before = txt[:pos].lower()
            ind = before.rfind("individual assignment")
            team = before.rfind("team activit")
            if ind > team:
                return "Assignment"
            if team > ind:
                return "Team"
            return "Assignment"  # default
        for m in DUE_HASH_RE.finditer(txt):
            if m.group(1):  # "#1 : January 29" format
                num = m.group(1)
                date_raw = m.group(2).strip()
                kind = section_at(m.start())
            else:  # "#1 Case Proposal: February 5" format
                num = m.group(3)
                kind = (m.group(4) or "").strip()[:40]  # truncate long names
                date_raw = (m.group(5) or "").strip()
            if not kind or not num or not date_raw:
                continue
            # Add year if missing (e.g. "January 29" -> "January 29, 2026")
            if not re.search(r"\d{4}", date_raw):
                date_raw = date_raw + ", 2026"
            key = (kind.lower(), num, date_raw)
            if key not in seen:
                seen.add(key)
                dues.append(DueItem(kind=kind, number=num, due_date_raw=date_raw, due_time_raw="", page=i + 1))
    return dues

def _parse_dues_loose(pages_text: List[str]) -> List[DueItem]:
    dues: List[DueItem] = []
    seen: set[Tuple[str, str, str]] = set()
    for i, txt in enumerate(pages_text):
        for m in DUE_LOOSE_RE.finditer(txt):
            if m.group(1):  # Assignment/Lab first
                kind = (m.group(1) or "").strip()
                num = (m.group(2) or "").strip()
                date_raw = (m.group(3) or "").strip()
            else:  # Due first
                date_raw = (m.group(4) or "").strip()
                kind = (m.group(5) or "").strip()
                num = (m.group(6) or "").strip()
            if kind and num and date_raw:
                key = (kind.lower(), num, date_raw)
                if key not in seen:
                    seen.add(key)
                    dues.append(DueItem(kind=kind.title(), number=num, due_date_raw=date_raw, due_time_raw="", page=i + 1))
        for m in DUE_DATE_ONLY_RE.finditer(txt):
            kind = (m.group(1) or "").strip()
            num = (m.group(2) or "").strip()
            date_raw = (m.group(3) or "").strip()
            if kind and num and date_raw:
                key = (kind.lower(), num, date_raw)
                if key not in seen:
                    seen.add(key)
                    dues.append(DueItem(kind=kind.title(), number=num, due_date_raw=date_raw, due_time_raw="", page=i + 1))
    # Also parse "#1 : January 29" and "#1 Case Proposal: February 5" formats
    hash_dues = _parse_dues_hash(pages_text)
    for d in hash_dues:
        key = (d.kind.lower(), d.number, d.due_date_raw)
        if key not in seen:
            seen.add(key)
            dues.append(d)
    # Parse "due date for each assignment is: January 30, February 13, ..." format
    list_dues = _parse_dues_assignment_list(pages_text)
    for d in list_dues:
        key = (d.kind.lower(), d.number, d.due_date_raw)
        if key not in seen:
            seen.add(key)
            dues.append(d)
    return dues

def _reject_false_positive_weight(raw: str, comp: str) -> bool:
    """Reject matches like '40%). There will be no timed-quizzes' - 'no' negates the component."""
    r = raw.lower()
    if "quiz" in comp.lower() and re.search(r"\bno\b.{0,30}(?:timed[- ]?)?quiz", r):
        return True
    if "exam" in comp.lower() and re.search(r"\bno\b.{0,30}exam", r):
        return True
    return False

def _parse_weights_loose(pages_text: List[str]) -> List[WeightItem]:
    weights: List[WeightItem] = []
    for i, txt in enumerate(pages_text):
        for m in WEIGHT_LOOSE_RE.finditer(txt):
            if m.group(1):  # % first: "30% - Assignments"
                w = float(m.group(1))
                comp = normalize_component(m.group(2) or "")
            else:  # component first: "Assignments (30%)"
                comp = normalize_component(m.group(3) or "")
                w = float(m.group(4) or "0")
            if comp and 0 < w <= 100 and not _reject_false_positive_weight(m.group(0).strip(), comp):
                weights.append(WeightItem(component=comp, weight=w, page=i + 1, raw=m.group(0).strip()))
    return weights

def _parse_weights_near(pages_text: List[str]) -> List[WeightItem]:
    """Catch X% within 50 chars of component keywords (odd layouts)."""
    weights: List[WeightItem] = []
    comp_map = {"assignments": "Assignments", "assignment": "Assignment", "labs": "Labs", "lab": "Lab",
                "quiz": "Quiz", "quizzes": "Quizzes", "midterm": "Midterm", "final exam": "Final Exam",
                "project": "Project", "participation": "Participation", "attendance": "Attendance", "reports": "Reports",
                "progress": "Course Progress", "checks": "Course Progress", "case": "Case Proposal", "proposal": "Case Proposal",
                "video": "Video Lesson", "lesson": "Video Lesson", "reflection": "Reflection", "team": "Team"}
    for i, txt in enumerate(pages_text):
        for m in WEIGHT_NEAR_RE.finditer(txt):
            w = float(m.group(1) or m.group(2) or "0")
            full = m.group(0).lower()
            raw_str = m.group(0).strip()[:80]
            comp = "Component"
            for k, v in comp_map.items():
                if k in full:
                    comp = v
                    break
            if comp and 0 < w <= 100 and not _reject_false_positive_weight(raw_str, comp):
                weights.append(WeightItem(component=comp, weight=w, page=i + 1, raw=raw_str))
    return weights

def technique_2_loose_regex(pdf_path: str, full_text: str, pages_text: List[str]) -> ParseResult:
    dues = _parse_dues_loose(pages_text)
    weights = dedupe_weights(_parse_weights_loose(pages_text))
    total, ok = validate_total(weights)
    warnings = []
    if not dues:
        warnings.append("No due dates found (loose regex).")
    if not weights:
        warnings.append("No weights found (loose regex).")
    if weights and not ok:
        warnings.append(f"Weights do not sum to 100 (sum={total:.1f}%).")
    return ParseResult(
        dues=dues,
        weights=weights,
        total_weight=total,
        weight_ok=ok,
        warnings=warnings,
        method="technique_2_loose_regex"
    )

# -----------------------------
# Technique 3: Table extraction
# -----------------------------

def _parse_weights_from_structured_tables(pdf_path: str) -> List[WeightItem]:
    """Parse tables with 'Component' and 'Weight' columns (e.g. grading scheme tables)."""
    weights: List[WeightItem] = []
    component_keywords = ("quiz", "exam", "midterm", "final", "project", "assignment", "lab", "participation", "attendance", "report", "progress", "checks", "case", "proposal", "video", "lesson", "reflection", "team")
    with pdfplumber.open(pdf_path) as pdf:
        for page_num, page in enumerate(pdf.pages):
            tables = page.extract_tables()
            for table in tables or []:
                rows = [r for r in (table or []) if r]
                if len(rows) < 2:
                    continue
                header = [str(c or "").lower().strip() for c in rows[0]]
                # Find weight column (has "weight" or "%" in header, or last column with %)
                weight_col = -1
                comp_col = 0
                for i, h in enumerate(header):
                    if "weight" in h or "%" in h:
                        weight_col = i
                        break
                if weight_col < 0:
                    # No explicit weight header - find column with % values
                    for row in rows[1:]:
                        for i, cell in enumerate(row or []):
                            if re.search(r"\d+\s*%", str(cell or "")):
                                weight_col = i
                                break
                        if weight_col >= 0:
                            break
                if weight_col < 0:
                    continue
                # Parse data rows
                for row in rows[1:]:
                    cells = [str(c or "").strip() for c in (row or [])]
                    if len(cells) <= max(comp_col, weight_col):
                        continue
                    comp_cell = cells[comp_col]
                    weight_cell = cells[weight_col] if weight_col < len(cells) else ""
                    if not comp_cell or not any(kw in comp_cell.lower() for kw in component_keywords):
                        continue
                    m = re.search(r"(\d{1,3}(?:\.\d+)?)\s*%", weight_cell)
                    if m:
                        w = float(m.group(1))
                        if 0 < w <= 100:
                            weights.append(WeightItem(
                                component=normalize_component(comp_cell),
                                weight=w,
                                page=page_num + 1,
                                raw=f"{comp_cell} {weight_cell}"[:80]
                            ))
    return weights

def _parse_weights_from_tables(pdf_path: str) -> List[WeightItem]:
    """Table extraction: structured tables first, then cell-level fallback."""
    weights = _parse_weights_from_structured_tables(pdf_path)
    if weights:
        return weights
    # Fallback: scan cells for "Component X%" or "X% Component"
    component_keywords = ("quiz", "exam", "midterm", "final", "project", "assignment", "lab", "participation", "attendance", "report")
    with pdfplumber.open(pdf_path) as pdf:
        for page_num, page in enumerate(pdf.pages):
            tables = page.extract_tables()
            for table in tables or []:
                for row in table or []:
                    row_cells = [str(c or "").strip() for c in (row or [])]
                    for cell_str in row_cells:
                        for m in re.finditer(
                            r"\b(Quiz(?:\s*\d+)?|Final\s*Exam|Midterm(?:\s*\d+)?|Project|Assignments?|Labs?|Participation|Attendance|Reports?)\s*[\(\[]?\s*(\d{1,3}(?:\.\d+)?)\s*%\s*[\)\]]?|(\d{1,3}(?:\.\d+)?)\s*%\s*(?:[-–—]\s*)?(Quiz(?:\s*\d+)?|Final\s*Exam|Midterm(?:\s*\d+)?|Project|Assignments?|Labs?|Participation|Attendance|Reports?)\b",
                            cell_str,
                            re.IGNORECASE
                        ):
                            if m.group(1):
                                comp, w = normalize_component(m.group(1)), float(m.group(2))
                            else:
                                w, comp = float(m.group(3)), normalize_component(m.group(4) or "")
                            if comp and 0 < w <= 100:
                                weights.append(WeightItem(component=comp, weight=w, page=page_num + 1, raw=cell_str[:80]))
                        if not re.search(r"(?:quiz|exam|midterm|final|project|assignment|lab|participation|attendance|report)", cell_str, re.I):
                            for m in re.finditer(r"\b(\d{1,3}(?:\.\d+)?)\s*%\b", cell_str):
                                w = float(m.group(1))
                                if 0 < w <= 100:
                                    comp = "Component"
                                    for neighbor in row_cells:
                                        if neighbor != cell_str and any(kw in neighbor.lower() for kw in component_keywords):
                                            comp = normalize_component(neighbor)
                                            break
                                    weights.append(WeightItem(component=comp, weight=w, page=page_num + 1, raw=cell_str[:80]))
    return weights

def technique_3_tables(pdf_path: str, full_text: str, pages_text: List[str]) -> ParseResult:
    weights = dedupe_weights(_parse_weights_from_tables(pdf_path))
    total, ok = validate_total(weights)
    dues = _parse_dues_loose(pages_text)  # still use text for dues
    warnings = []
    if not dues:
        warnings.append("No due dates found (table extraction).")
    if not weights:
        warnings.append("No weights found in tables.")
    if weights and not ok:
        warnings.append(f"Weights do not sum to 100 (sum={total:.1f}%).")
    return ParseResult(
        dues=dues,
        weights=weights,
        total_weight=total,
        weight_ok=ok,
        warnings=warnings,
        method="technique_3_tables"
    )

# -----------------------------
# Technique 4: Merge all techniques
# -----------------------------

def technique_4_merge(pdf_path: str, full_text: str, pages_text: List[str]) -> ParseResult:
    """Run all extractors and merge weights. Same component -> keep best match."""
    all_weights: List[List[WeightItem]] = [
        _parse_weights_strict(pages_text),
        _parse_weights_loose(pages_text),
        _parse_weights_near(pages_text),
        _parse_weights_from_tables(pdf_path),
    ]
    merged = merge_weights_by_component(all_weights)
    weights = dedupe_weights(merged)
    total, ok = validate_total(weights)
    dues = _parse_dues_loose(pages_text)
    if not dues:
        dues = _parse_dues_strict(pages_text)
    warnings = []
    if not dues:
        warnings.append("No due dates found.")
    if not weights:
        warnings.append("No weights found.")
    if weights and not ok:
        warnings.append(f"Weights do not sum to 100 (sum={total:.1f}%).")
    return ParseResult(
        dues=dues,
        weights=weights,
        total_weight=total,
        weight_ok=ok,
        warnings=warnings,
        method="technique_4_merge"
    )

# -----------------------------
# Main entry: try techniques until results found
# -----------------------------

def parse_outline(pdf_path: str) -> ParseResult:
    """
    Workflow:
      1. Grab entire PDF first (full text + per-page)
      2. Find coursework, dates, weights; add weights to 100
      3. If not good enough, try next technique
      4. Repeat until results found or all techniques exhausted
    """
    full_text, pages_text = extract_full_pdf(pdf_path)

    # Try table extraction first (most reliable for grading schemes)
    techniques: List[Callable[..., ParseResult]] = [
        technique_3_tables,
        technique_1_strict_regex,
        technique_2_loose_regex,
        technique_4_merge,
    ]

    best: Optional[ParseResult] = None
    for tech in techniques:
        try:
            r = tech(pdf_path, full_text, pages_text)
        except Exception:
            continue
        # Success: weights sum to 100 and we have data
        if r.weight_ok and (r.dues or r.weights):
            enrich_component_dates(r, full_text)
            return r
        # Track best so far
        if best is None or result_score(r) > result_score(best):
            best = r

    if best is not None:
        enrich_component_dates(best, full_text)
        return best
    return ParseResult(
        dues=[],
        weights=[],
        total_weight=0.0,
        weight_ok=False,
        warnings=["All techniques exhausted. No coursework/dates/weights found."],
        method="exhausted",
        component_dates={},
    )
