# Use Node.js 18 as the base image
FROM node:18-slim

# Install Python 3 and system dependencies for OpenCV/EasyOCR
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    python3-venv \
    libgl1-mesa-glx \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies globally
# We use --break-system-packages because in Docker it is fine (isolated env)
RUN pip3 install --no-cache-dir --break-system-packages easyocr opencv-python-headless

# Create App Directory
WORKDIR /app

# Install Node Dependencies
COPY package*.json ./
RUN npm install

# Copy source code
COPY . .

# Build TypeScript
RUN npm run build

# Expose Port
EXPOSE 10000

# Start command
CMD ["npm", "start"]
