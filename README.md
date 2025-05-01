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
      npm install react-router-dom
      npm install react-calendar
      
   c) Start the development server
      npm run dev

4. Verify everything works
   1. Open http://localhost:5173 in your browser
   2. Paste a course outline into the text box
   3. Click Parse Outline
   4. You should see the list of items appear below the form
