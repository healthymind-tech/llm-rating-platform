FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies (use install to allow lock regeneration when deps change)
RUN npm install --omit=dev

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S backend -u 1001

# Change ownership of the app directory
RUN chown -R backend:nodejs /app
USER backend

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=10s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "require('http').request('http://localhost:3001/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) }).end()"

# Start the application
CMD ["npm", "start"]
