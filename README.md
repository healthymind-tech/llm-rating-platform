# LLM Testing Platform - Full Stack

A complete full-stack application for testing and interacting with tuned Language Learning Models (LLMs). This platform supports both admin and user roles with comprehensive chat functionality, user management, and LLM configuration.

## 🏗️ Architecture

- **Frontend**: React 18 + TypeScript + Material-UI
- **Backend**: Node.js + Express + TypeScript
- **Database**: PostgreSQL
- **Storage**: MinIO (S3-compatible object storage)
- **Reverse Proxy**: Nginx
- **Authentication**: JWT tokens
- **Containerization**: Docker & Docker Compose
- **LLM Support**: OpenAI API & Ollama with Vision capabilities

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
cd frontend
cp .env.example .env
# Edit frontend/.env with your API URL
cd ..
```

### 3. Start with Docker (Recommended)
```bash
# Start all services (PostgreSQL + Backend + Frontend)
docker compose up -d

# Check services are running
docker compose ps
```

### 4. Manual Setup (Development)

**Start PostgreSQL:**
```bash
docker compose up -d postgres
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
cd frontend
npm install
npm start
```

## 🔐 Default Credentials

- Login uses `email` and `password` (not username).
- **Admin**: email `admin@healthymind-tech.com` / password `admin`
- **User**: email `user@healthymind-tech.com` / password `user`

## 📡 API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user
- `GET /api/auth/users` - Get all users (admin)
- `POST /api/auth/users` - Create user (admin)
- `PUT /api/auth/users/:id` - Update user (admin)
- `DELETE /api/auth/users/:id` - Delete user (admin)

### Chat
- `POST /api/chat/message` - Send message to AI (supports images)
- `POST /api/chat/message/stream` - Send message with streaming response
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
    images TEXT[], -- Array of image URLs for vision-enabled chat
    input_tokens INTEGER DEFAULT 0,
    output_tokens INTEGER DEFAULT 0,
    model_id UUID,
    model_name VARCHAR(100),
    model_type VARCHAR(20),
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
    system_prompt TEXT,
    repetition_penalty DECIMAL(3,2),
    supports_vision BOOLEAN DEFAULT false,
    is_enabled BOOLEAN DEFAULT true,
    is_default BOOLEAN DEFAULT false,
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
FRONTEND_URL=http://localhost

# Security
JWT_SECRET=your-super-secret-jwt-key

# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=llm_testing_platform
DB_USER=postgres
DB_PASSWORD=postgres

# MinIO Object Storage
MINIO_ENDPOINT=minio
MINIO_PORT=9000
MINIO_USE_SSL=false
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
MINIO_BUCKET=chat-uploads
MINIO_PUBLIC_BASE_URL=http://localhost/minio

# LLM APIs (optional)
OPENAI_API_KEY=your-openai-key
OLLAMA_ENDPOINT=http://localhost:11434
```

### Frontend Environment Variables
```env
REACT_APP_API_URL=http://localhost:3001/api
```

## 📸 Vision & Image Upload

The platform supports image uploads and vision-enabled AI models for multimodal conversations.

### Image Upload Features
- **Multiple Formats**: Support for JPG, PNG, WebP, and other common image formats
- **Drag & Drop**: Intuitive drag-and-drop interface for easy image uploads
- **Copy & Paste**: Paste images directly from clipboard
- **File Selection**: Traditional file picker with multi-select support
- **Image Preview**: Thumbnail previews with removal options
- **Large File Support**: Handles images up to 50MB via nginx proxy
- **Secure Storage**: Images stored in MinIO with proper access controls

### Vision-Enabled Chat
- **OpenAI Vision**: Full support for GPT-4V and other vision models
- **Base64 Conversion**: Automatic conversion of stored images to base64 for API compatibility
- **Message History**: Images preserved in chat history with proper URLs
- **Modal View**: Click images to view in full-screen lightbox
- **Responsive Display**: Optimized image display across devices

### Technical Implementation
- **MinIO Storage**: S3-compatible object storage for scalable image handling
- **Nginx Proxy**: Proper routing and caching for image assets
- **Database Integration**: Image URLs stored as arrays in message records
- **API Compatibility**: Automatic format conversion for different LLM providers

## ⭐ Message Rating System

The platform includes a comprehensive message rating system that allows users to provide feedback on AI responses:

### Rating Features
- **Like/Dislike**: Users can rate messages with thumbs up/down
- **Detailed Feedback**: Optional reason selection with predefined categories:
  - Incorrect or false information
  - Not relevant to question
  - Unclear or confusing
  - Incomplete response
  - Too generic
  - Inappropriate content
  - Custom reason (free text)
- **Real-time Updates**: Instant visual feedback with state persistence
- **Admin Analytics**: Comprehensive rating analytics and filtering

### Rating Analytics
- **System Metrics**: Overall rating statistics and trends
- **Message Filtering**: Filter by rating, user, date range, content
- **Performance Insights**: Track model performance over time
- **Detailed Reports**: Export chat history with ratings

## 🤖 LLM Integration"}

### OpenAI Setup
1. Get API key from OpenAI
2. In admin panel, create new configuration:
   - **Type**: OpenAI
   - **API Key**: Your OpenAI key
   - **Model**: gpt-4, gpt-4-vision-preview, gpt-3.5-turbo, etc.
   - **Temperature**: 0.0-2.0
   - **Max Tokens**: 1-4096+
   - **Supports Vision**: Enable for GPT-4V and other vision models
   - **System Prompt**: Custom instructions for the AI

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
  postgres:      # PostgreSQL database
  backend:       # Node.js API server
  frontend:      # React application
  nginx:         # Reverse proxy and load balancer
  minio:         # S3-compatible object storage
  minio-setup:   # MinIO bucket initialization
  ollama:        # Ollama LLM server (optional)
```

### Docker Commands
```bash
# Start all services
docker compose up -d

# Start with Ollama
docker compose --profile ollama up -d

# View logs
docker compose logs -f backend

# Rebuild services
docker compose build --no-cache

# Stop all services
docker compose down

# Reset database
docker compose down -v
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
docker exec -it llm-platform-db psql -U postgres -d llm_rating_platform

# Reset database
docker compose down -v postgres
docker compose up -d postgres
```

## 📊 Monitoring

### Service Endpoints
- **Frontend**: `http://localhost` (via nginx)
- **Backend API**: `http://localhost/api` (via nginx)
- **MinIO Console**: `http://localhost/minio-console` (admin: minioadmin/minioadmin)
- **Direct Backend**: `http://localhost:3001` (development only)
- **Direct MinIO**: `http://localhost:9000` (development only)

### Health Checks
- Backend: `http://localhost/api/health`
- Frontend: `http://localhost`
- Database: `docker compose ps postgres`
- MinIO: `docker compose ps minio`

### Logs
```bash
# All services
docker compose logs -f

# Specific service
docker compose logs -f backend
docker compose logs -f postgres
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
docker compose -f docker-compose.prod.yml up -d
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

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🆘 Troubleshooting

### Common Issues

**Database Connection Failed**
```bash
# Check if PostgreSQL is running
docker compose ps postgres
# Restart database
docker compose restart postgres
```

**Backend API Errors**
```bash
# Check backend logs
docker compose logs backend
# Restart backend
docker compose restart backend
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

**Image Upload Issues**
- Check if MinIO container is running: `docker compose ps minio`
- Verify MinIO console access: `http://localhost/minio-console`
- Check nginx upload limits (should be 50MB for API, 1GB for MinIO)
- Review MinIO logs: `docker compose logs minio`
- Ensure bucket exists and has proper permissions

**413 Request Entity Too Large**
- Increase nginx `client_max_body_size` in `nginx.conf`
- Restart nginx: `docker compose restart nginx`
- Check image file size (current limit: 50MB via API)

**Images Not Loading**
- Check MinIO container status and logs
- Verify image URLs in database point to correct nginx proxy path
- Ensure MinIO bucket has public read access
- Check nginx proxy configuration for `/minio/` path

For more help, check the logs or create an issue.
