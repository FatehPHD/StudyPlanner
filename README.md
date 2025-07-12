Setup & Run Instructions

Use this guide when you clone the repo onto a new machine.

1. Prerequisites
   • Python 3.8 or newer on your system PATH
   • Node.js v16 or newer and npm on your system PATH

2. Backend (Flask)
   a) Change into the backend folder
      cd backend

   b) Install Python packages
      pip install -r requirements.txt
      pip install pdfminer.six python-docx


   c) (Optional) Set your OpenAI key for real GPT calls
      – macOS/Linux: export OPENAI_API_KEY="sk-..."
      – Windows CMD:  set OPENAI_API_KEY=sk-...

   d) Start the Flask server
      python run.py

3. Front-end (Vite + React)
   a) In a new terminal, go to the front-end folder
      cd front-end

   b) Install node modules
      npm install
      npm install react-router-dom
      npm install react-calendar
      npm install @supabase/supabase-js
      npm install react-hot-toast
      npm install @tanstack/react-query
      npm install react-error-boundary
      npm install chart.js react-chartjs-2

      
   c) Start the development server
      npm run dev

4. Verify everything works
   1. Open http://localhost:5173 in your browser
   2. Paste a course outline into the text box
   3. Click Parse Outline
   4. You should see the list of items appear below the form



# Study Planner

Study Planner is a personal study management web application that allows students to:

- Register & Log In via Supabase Auth
- Add Courses & Outlines: Paste course outlines, AI-parse assignment names, dates, and weightings
- Track Grades: Enter scores per assessment and view overall and per-assignment percentages
- Visualize Progress: Sparkline chart of cumulative grade over time
- Forecast Target Grade: What-if calculator showing required future performance
- Calendar View: Sync deadlines into an interactive calendar
- Dark Mode & Theming: Light/dark toggle and CSS variables
- Responsive Design: Utility-based CSS for a clean, mobile-friendly UI

## Tech Stack

- React + Vite
- Plain CSS with utility classes and CSS variables
- Supabase (PostgreSQL, Auth)
- React Query
- Chart.js via react-chartjs-2
- Custom AI parsing service powered by GPT

## Getting Started

1. Clone the repo:
   ```bash
   git clone https://github.com/your-username/study-planner.git
   cd study-planner
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file with:
   ```bash
   VITE_SUPABASE_URL=https://<your-supabase-project>.supabase.co
   VITE_SUPABASE_ANON_KEY=<your-anon-public-key>
   ```
4. Set up the database tables in Supabase:
   - `courses` (id, user_id, title, color, inserted_at)
   - `events` (id, course_id, user_id, name, date, percent, score_received, score_total, inserted_at)
5. Start the development server:
   ```bash
   npm run dev
   ```

## Project Structure

```
/
├── public/
├── src/
│   ├── components/
│   ├── context/
│   ├── lib/
│   ├── services/
│   ├── App.jsx
│   ├── main.jsx
│   └── App.css
├── .env
├── package.json
└── README.md
```

## Contributing

1. Fork the repo
2. Create a branch: `git checkout -b feature/your-feature`
3. Commit changes: `git commit -m "feat: add feature"`
4. Push: `git push origin feature/your-feature`
5. Open a pull request

## License

MIT © Fateh Ali
