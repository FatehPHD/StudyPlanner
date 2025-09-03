# Study Planner Frontend ⚛️

Modern React application for the Study Planner, featuring AI-powered course management, grade tracking, and interactive calendar views.

## 🚀 Quick Start

### Prerequisites
- **Node.js 16+** installed
- **npm** package manager

### Installation
```bash
cd front-end
npm install
```

### Development Server
```bash
npm run dev
```

The application will start on `http://localhost:5173`

## 📋 Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## 🏗️ Project Structure

```
front-end/
├── src/
│   ├── components/          # React components
│   │   ├── AddPage.jsx     # Course/event addition
│   │   ├── AdminDashboard.jsx # Admin interface
│   │   ├── CalendarPage.jsx # Calendar view
│   │   ├── CoursePage.jsx  # Course management
│   │   ├── EventForm.jsx   # Event creation form
│   │   ├── Home.jsx        # Main dashboard
│   │   ├── Layout.jsx      # App layout wrapper
│   │   ├── LoginPage.jsx   # Authentication
│   │   ├── PlannerForm.jsx # Course outline parser
│   │   ├── ProtectedRoute.jsx # Route protection
│   │   ├── Sidebar.jsx     # Navigation sidebar
│   │   └── TodosPage.jsx   # Todo management
│   ├── context/            # React context providers
│   │   ├── AuthContext.jsx # Authentication state
│   │   └── ThemeContext.jsx # Dark/light theme
│   ├── lib/                # Utility libraries
│   │   └── supabaseClient.js # Supabase configuration
│   ├── services/           # API services
│   │   ├── eventApi.js     # Event management API
│   │   ├── outlineApi.js   # Course outline parsing
│   │   └── todoApi.js      # Todo management API
│   ├── App.jsx             # Main app component
│   ├── main.jsx            # App entry point
│   ├── App.css             # Global styles
│   └── index.css           # Base styles
├── public/                 # Static assets
├── package.json            # Dependencies
├── vite.config.js          # Vite configuration
└── index.html              # HTML template
```

## 🛠️ Key Features

### 🔐 Authentication
- **Supabase Auth** integration
- **Protected routes** for authenticated users
- **User profile management**

### 📋 Course Management
- **Add courses** with custom colors
- **Course outline parsing** with AI
- **File upload** support (PDF, Word documents)

### 📊 Grade Tracking
- **Assignment tracking** with dates and weightings
- **Grade visualization** with charts
- **Progress forecasting** calculations

### 📅 Calendar Integration
- **Interactive calendar** view
- **Event synchronization** with courses
- **Deadline management**

### 🌙 Theme System
- **Dark/light mode** toggle
- **CSS variables** for theming
- **Responsive design**

## 🔧 Configuration

### Environment Variables

Create a `.env` file in the `front-end` directory:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### Vite Configuration

The app is configured with:
- **React plugin** for JSX support
- **API proxy** to backend (`/api` → `http://localhost:5000`)
- **Host binding** to `0.0.0.0` for network access

## 📦 Dependencies

### Core
- **React 19** - UI library
- **React Router DOM** - Client-side routing
- **React Query** - Data fetching and caching

### UI & Styling
- **Chart.js** - Data visualization
- **React Calendar** - Calendar component
- **React Hot Toast** - Notifications

### Backend Integration
- **Axios** - HTTP client
- **Supabase JS** - Database and auth client

### Development
- **Vite** - Build tool and dev server
- **ESLint** - Code linting

## 🎨 Styling

The application uses:
- **Utility-first CSS** classes
- **CSS variables** for theming
- **Responsive design** principles
- **Modern CSS** features

## 🔒 Security

- **Row Level Security** (RLS) enabled
- **User data isolation** in database
- **Protected routes** for authenticated access
- **Secure API communication**

## 🚀 Deployment

### Vercel
1. Connect your GitHub repository
2. Set environment variables
3. Deploy automatically

### Netlify
1. Build command: `npm run build`
2. Publish directory: `dist`
3. Set environment variables

### Manual Build
```bash
npm run build
# Deploy the `dist` folder to your hosting provider
```

## 🧪 Testing

### Manual Testing Checklist
- [ ] User registration and login
- [ ] Course creation and management
- [ ] Course outline parsing
- [ ] Grade tracking and visualization
- [ ] Calendar functionality
- [ ] Dark/light theme toggle
- [ ] Mobile responsiveness
- [ ] File upload functionality

## 🔍 Troubleshooting

### Common Issues

1. **Port Already in Use**
   ```bash
   # Find process using port 5173
   netstat -ano | findstr :5173
   # Kill the process
   taskkill /PID <process_id> /F
   ```

2. **Missing Dependencies**
   ```bash
   npm install
   ```

3. **Environment Variables**
   - Ensure `.env` file exists
   - Check Supabase URL and key are correct
   - Restart dev server after changes

4. **Backend Connection**
   - Verify backend is running on port 5000
   - Check API proxy configuration in `vite.config.js`

## 📝 License

This project is licensed under the MIT License.