# LLM Testing Platform - Full Stack

A complete full-stack application for testing and interacting with tuned Language Learning Models (LLMs). This platform supports both admin and user roles with comprehensive chat functionality, user management, and LLM configuration.

## 🏗️ Architecture

- **Frontend**: React 18 + TypeScript + Material-UI
- **Backend**: Node.js + Express + TypeScript
- **Database**: PostgreSQL
- **Authentication**: JWT tokens
- **Containerization**: Docker & Docker Compose
- **LLM Support**: OpenAI API & Ollama

## 🚀 Quick Start

### Prerequisites
- Docker and Docker Compose
- Node.js 18+ (for development)

### 1. Clone and Setup
```bash
git clone <repository-url>
cd llm-testing-platform
```

### 2. Environment Configuration
```bash
# Backend environment
cp backend/.env.example backend/.env
# Edit backend/.env with your settings

# Frontend environment  
cp .env.example .env
# Edit .env with your API URL
```

### 3. Start with Docker (Recommended)
```bash
# Start all services (PostgreSQL + Backend + Frontend)
docker-compose up -d

# Check services are running
docker-compose ps
```

### 4. Manual Setup (Development)

**Start PostgreSQL:**
```bash
docker-compose up -d postgres
```

**Backend:**
```bash
cd backend
npm install
cp .env.example .env
# Edit .env file
npm run dev
```

**Frontend:**
```bash
npm install
npm start
```

## 🔐 Default Credentials

- **Admin**: `admin` / `password`
- **User**: `user` / `password`

## 📡 API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user
- `GET /api/auth/users` - Get all users (admin)
- `POST /api/auth/users` - Create user (admin)
- `PUT /api/auth/users/:id` - Update user (admin)
- `DELETE /api/auth/users/:id` - Delete user (admin)

### Chat
- `POST /api/chat/message` - Send message to AI
- `GET /api/chat/sessions` - Get user chat sessions
- `GET /api/chat/sessions/:id/messages` - Get session messages

### Configuration
- `GET /api/config` - Get all LLM configs (admin)
- `GET /api/config/active` - Get active configuration
- `POST /api/config` - Create LLM config (admin)
- `PUT /api/config/:id` - Update LLM config (admin)
- `PUT /api/config/:id/activate` - Set active config (admin)
- `DELETE /api/config/:id` - Delete LLM config (admin)

## 🗄️ Database Schema

### Users
```sql
CREATE TABLE users (
    id UUID PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(10) CHECK (role IN ('admin', 'user')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP
);
```

### Chat Sessions
```sql
CREATE TABLE chat_sessions (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Chat Messages
```sql
CREATE TABLE chat_messages (
    id UUID PRIMARY KEY,
    session_id UUID REFERENCES chat_sessions(id),
    user_id UUID REFERENCES users(id),
    role VARCHAR(10) CHECK (role IN ('user', 'assistant')),
    content TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### LLM Configurations
```sql
CREATE TABLE llm_configs (
    id UUID PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    type VARCHAR(20) CHECK (type IN ('openai', 'ollama')),
    api_key TEXT,
    endpoint VARCHAR(255),
    model VARCHAR(100) NOT NULL,
    temperature DECIMAL(3,2) DEFAULT 0.7,
    max_tokens INTEGER DEFAULT 2048,
    is_active BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## ⚙️ Configuration

### Backend Environment Variables
```env
# Server
PORT=3001
NODE_ENV=development
FRONTEND_URL=http://localhost:3000

# Security
JWT_SECRET=your-super-secret-jwt-key

# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=llm_testing_platform
DB_USER=postgres
DB_PASSWORD=postgres

# LLM APIs (optional)
OPENAI_API_KEY=your-openai-key
OLLAMA_ENDPOINT=http://localhost:11434
```

### Frontend Environment Variables
```env
REACT_APP_API_URL=http://localhost:3001/api
```

## 🤖 LLM Integration

### OpenAI Setup
1. Get API key from OpenAI
2. In admin panel, create new configuration:
   - **Type**: OpenAI
   - **API Key**: Your OpenAI key
   - **Model**: gpt-4, gpt-3.5-turbo, etc.
   - **Temperature**: 0.0-2.0
   - **Max Tokens**: 1-4096+

### Ollama Setup
1. Start Ollama server locally or on server
2. Pull desired model: `ollama pull llama2`
3. In admin panel, create new configuration:
   - **Type**: Ollama
   - **Endpoint**: http://localhost:11434
   - **Model**: llama2, codellama, etc.

## 🐳 Docker Services

### Available Services
```yaml
services:
  postgres:    # PostgreSQL database
  backend:     # Node.js API server
  frontend:    # React application
  ollama:      # Ollama LLM server (optional)
```

### Docker Commands
```bash
# Start all services
docker-compose up -d

# Start with Ollama
docker-compose --profile ollama up -d

# View logs
docker-compose logs -f backend

# Rebuild services
docker-compose build --no-cache

# Stop all services
docker-compose down

# Reset database
docker-compose down -v
```

## 🔧 Development

### Backend Development
```bash
cd backend
npm run dev          # Start with hot reload
npm run build        # Build for production
npm run start        # Start production build
```

### Frontend Development
```bash
npm start            # Development server
npm run build        # Production build
npm run test         # Run tests
npm run lint         # Check code style
npm run typecheck    # TypeScript check
```

### Database Management
```bash
# Connect to database
docker exec -it llm-platform-db psql -U postgres -d llm_testing_platform

# Reset database
docker-compose down -v postgres
docker-compose up -d postgres
```

## 📊 Monitoring

### Health Checks
- Backend: `http://localhost:3001/health`
- Frontend: `http://localhost:3000`
- Database: `docker-compose ps postgres`

### Logs
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f backend
docker-compose logs -f postgres
```

## 🔒 Security Features

- **JWT Authentication**: Secure token-based auth
- **Password Hashing**: bcrypt with salt rounds
- **Role-Based Access**: Admin/User permissions
- **SQL Injection Prevention**: Parameterized queries
- **CORS Protection**: Configurable origins
- **Security Headers**: Helmet.js middleware
- **Input Validation**: Request validation
- **Error Handling**: Secure error responses

## 🚀 Production Deployment

### Environment Setup
1. Set strong `JWT_SECRET`
2. Configure production database
3. Set `NODE_ENV=production`
4. Configure proper CORS origins
5. Set up SSL/TLS certificates
6. Configure reverse proxy (nginx)

### Build for Production
```bash
# Backend
cd backend && npm run build

# Frontend
npm run build

# Docker
docker-compose -f docker-compose.prod.yml up -d
```

## 🧪 Testing

### Backend Tests
```bash
cd backend
npm test
```

### Frontend Tests
```bash
npm test
```

### API Testing
```bash
# Health check
curl http://localhost:3001/health

# Login
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"password"}'
```

## 📈 Performance

### Optimization Features
- **Database Indexing**: Optimized queries
- **Connection Pooling**: PostgreSQL pool
- **Gzip Compression**: nginx compression
- **Static Asset Caching**: Long-term caching
- **Code Splitting**: React lazy loading
- **TypeScript**: Better performance & DX

## 🤝 Contributing

1. Fork the repository
2. Create feature branch
3. Make changes with tests
4. Run linting and type checks
5. Submit pull request

## 📄 License

MIT License - see LICENSE file for details.

---

## 🆘 Troubleshooting

### Common Issues

**Database Connection Failed**
```bash
# Check if PostgreSQL is running
docker-compose ps postgres
# Restart database
docker-compose restart postgres
```

**Backend API Errors**
```bash
# Check backend logs
docker-compose logs backend
# Restart backend
docker-compose restart backend
```

**Frontend Can't Connect to API**
- Check `.env` file has correct `REACT_APP_API_URL`
- Verify backend is running on correct port
- Check CORS configuration in backend

**LLM Not Responding**
- Verify active configuration is set
- Check API keys are valid
- Ensure Ollama server is running (if using Ollama)
- Check backend logs for LLM API errors

For more help, check the logs or create an issue.