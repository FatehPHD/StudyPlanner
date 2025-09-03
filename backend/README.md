# Study Planner Backend 🐍

Flask-based backend API for the Study Planner application, providing AI-powered course outline parsing, file processing, and database management.

## 🚀 Quick Start

### Prerequisites
- **Python 3.8+** installed
- **pip** package manager

### Installation
```bash
cd backend
pip install -r requirements.txt
```

### Running the Server
```bash
python run.py
```

The server will start on `http://localhost:5000`

## 📋 API Endpoints

### Core Endpoints

#### `GET /`
- **Description**: Root endpoint with server status
- **Response**: Server information and available endpoints

#### `GET /api/test`
- **Description**: Health check endpoint
- **Response**: `{"message": "Server is working!", "status": "success"}`

### Course Outline Parsing

#### `POST /api/parse-outline`
- **Description**: Parse course outline text using AI
- **Body**: `{"outlineText": "your course outline text"}`
- **Response**: Array of parsed assignments with dates and weightings

#### `POST /api/upload-outline`
- **Description**: Upload and parse a text file
- **Body**: Form data with `file` field
- **Response**: Array of parsed assignments

#### `POST /api/extract-outline`
- **Description**: Extract text from PDF or Word documents
- **Body**: Form data with `file` field (PDF/DOC/DOCX)
- **Response**: `{"text": "extracted text content"}`

### Admin Endpoints (Require Admin Authentication)

#### `GET /api/admin/users`
- **Description**: List all users
- **Headers**: `X-User-Id: <admin_user_id>`
- **Response**: Array of user profiles

#### `PATCH /api/admin/users/<user_id>`
- **Description**: Update user admin status
- **Body**: `{"is_admin": true/false}`
- **Response**: Updated user profile

#### `DELETE /api/admin/users/<user_id>`
- **Description**: Delete a user
- **Response**: `{"status": "deleted"}`

#### `GET /api/admin/courses`
- **Description**: List all courses
- **Response**: Array of all courses

#### `PATCH /api/admin/courses/<course_id>`
- **Description**: Update course details
- **Body**: `{"title": "new title"}`
- **Response**: Updated course

#### `DELETE /api/admin/courses/<course_id>`
- **Description**: Delete a course
- **Response**: `{"status": "deleted"}`

#### `GET /api/admin/analytics`
- **Description**: Get system analytics
- **Response**: `{"users": count, "courses": count, "todos": count}`

### User Profile

#### `GET /api/profiles/<user_id>`
- **Description**: Get user profile
- **Response**: User profile data

## 🔧 Configuration

### Environment Variables

#### Required
- `DATABASE_URL` - Supabase PostgreSQL connection string

#### Optional
- `OPENAI_API_KEY` - OpenAI API key for AI parsing (if not set, uses mock data)

### Setting OpenAI API Key
```bash
# Windows
set OPENAI_API_KEY=sk-your-key-here

# macOS/Linux
export OPENAI_API_KEY=sk-your-key-here
```

## 🛠️ Dependencies

### Core Dependencies
- **Flask** - Web framework
- **Flask-CORS** - Cross-origin resource sharing
- **python-dotenv** - Environment variable management

### AI & File Processing
- **openai** - OpenAI GPT API client
- **pdfminer.six** - PDF text extraction
- **python-docx** - Word document processing

### Database
- **psycopg2-binary** - PostgreSQL adapter

## 📁 Project Structure

```
backend/
├── app/
│   ├── __init__.py          # Flask app factory
│   └── services/
│       └── gpt_client.py    # OpenAI GPT integration
├── requirements.txt         # Python dependencies
└── run.py                  # Server entry point
```

## 🔒 Security Features

- **CORS Configuration** - Configured for frontend integration
- **Row Level Security** - Database-level user data isolation
- **Admin Authentication** - Admin-only endpoints with user verification

## 🚀 Deployment

### Railway
1. Connect your GitHub repository
2. Set environment variables:
   - `DATABASE_URL`
   - `OPENAI_API_KEY` (optional)
3. Deploy

### Heroku
1. Create a new Heroku app
2. Set environment variables
3. Deploy using Git:
   ```bash
   heroku git:remote -a your-app-name
   git push heroku main
   ```

### Docker
```dockerfile
FROM python:3.9-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY . .
EXPOSE 5000
CMD ["python", "run.py"]
```

## 🧪 Testing

### Manual Testing
```bash
# Test server health
curl http://localhost:5000/api/test

# Test outline parsing
curl -X POST http://localhost:5000/api/parse-outline \
  -H "Content-Type: application/json" \
  -d '{"outlineText": "Assignment 1: Due Jan 15, 20%"}'
```

## 🔍 Troubleshooting

### Common Issues

1. **Port Already in Use**
   ```bash
   # Find process using port 5000
   netstat -ano | findstr :5000
   # Kill the process
   taskkill /PID <process_id> /F
   ```

2. **Missing Dependencies**
   ```bash
   pip install -r requirements.txt
   ```

3. **OpenAI API Errors**
   - Check your API key is correct
   - Verify you have sufficient credits
   - Check API rate limits

## 📝 License

This project is licensed under the MIT License.
