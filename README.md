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

   c) Start the development server
      npm run dev

4. Verify everything works
   1. Open http://localhost:5173 in your browser
   2. Register/login with Supabase
   3. Add a course and paste a course outline
   4. Click Parse Outline
   5. You should see the list of items appear below the form



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
- File Upload: Import course outlines from PDF and Word documents

## Tech Stack

- React + Vite (Frontend)
- Flask (Backend API)
- Supabase (PostgreSQL, Auth)
- OpenAI GPT (AI parsing)
- React Query (Data fetching)
- Chart.js (Data visualization)

## Getting Started

1. Clone the repo:
   ```bash
   git clone https://github.com/your-username/study-planner.git
   cd study-planner
   ```

2. Set up Supabase:
   - Create a new Supabase project
   - Set up database tables (see Database Setup below)
   - Enable Row Level Security (RLS) on all tables
   - Get your project URL and anon key

3. Configure environment variables:
   Create `.env` file in the `front-end` directory:
   ```bash
   VITE_SUPABASE_URL=https://<your-supabase-project>.supabase.co
   VITE_SUPABASE_ANON_KEY=<your-anon-public-key>
   ```

4. Start the backend:
   ```bash
   cd backend
   pip install -r requirements.txt
   python run.py
   ```

5. Start the frontend (in a new terminal):
   ```bash
   cd front-end
   npm install
   npm run dev
   ```

6. Access the application:
   Open http://localhost:5173 in your browser

## Database Setup

Run these SQL commands in your Supabase SQL Editor:

```sql
-- Create profiles table
CREATE TABLE profiles (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    is_admin BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create courses table
CREATE TABLE courses (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    color TEXT DEFAULT '#3B82F6',
    inserted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create events table
CREATE TABLE events (
    id SERIAL PRIMARY KEY,
    course_id INTEGER REFERENCES courses(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    date DATE NOT NULL,
    percent DECIMAL(5,2),
    score_received DECIMAL(5,2),
    score_total DECIMAL(5,2),
    included BOOLEAN DEFAULT TRUE,
    inserted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create todos table
CREATE TABLE todos (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    completed BOOLEAN DEFAULT FALSE,
    inserted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE todos ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own courses" ON courses FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own courses" ON courses FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own courses" ON courses FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own courses" ON courses FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own events" ON events FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own events" ON events FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own events" ON events FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own events" ON events FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own todos" ON todos FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own todos" ON todos FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own todos" ON todos FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own todos" ON todos FOR DELETE USING (auth.uid() = user_id);
```

## Project Structure

```
StudyPlanner/
├── backend/                 # Flask backend
│   ├── app/
│   │   ├── __init__.py     # Flask app factory
│   │   └── services/
│   │       └── gpt_client.py
│   ├── requirements.txt    # Python dependencies
│   └── run.py             # Server entry point
├── front-end/              # React frontend
│   ├── src/
│   │   ├── components/     # React components
│   │   ├── context/        # React context providers
│   │   ├── lib/            # Utility libraries
│   │   ├── services/       # API services
│   │   └── main.jsx        # App entry point
│   ├── package.json        # Node dependencies
│   └── vite.config.js      # Vite configuration
└── README.md               # This file
```

## Contributing

1. Fork the repo
2. Create a branch: `git checkout -b feature/your-feature`
3. Commit changes: `git commit -m "feat: add feature"`
4. Push: `git push origin feature/your-feature`
5. Open a pull request

## License

MIT © Fateh Ali