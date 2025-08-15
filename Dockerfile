FROM node:18-alpine

# Set working directory
WORKDIR /app

# Install curl for health checks
RUN apk add --no-cache curl

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production && npm cache clean --force

# Copy application code
COPY . .

# Create agents directory
RUN mkdir -p agents

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S aaab -u 1001

# Change ownership of the app directory
RUN chown -R aaab:nodejs /app
USER aaab

# Expose port
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:5000/health || exit 1

# Start application
CMD ["npm", "start"]
