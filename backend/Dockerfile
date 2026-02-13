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

# Create a virtual environment for Python to avoid permission issues
ENV VIRTUAL_ENV=/opt/venv
RUN python3 -m venv $VIRTUAL_ENV
ENV PATH="$VIRTUAL_ENV/bin:$PATH"

# Install Python dependencies
# torch --extra-index-url specific for CPU version to default to smaller build if possible, 
# but simply pip installing easyocr usually pulls in torch. 
# We explicitly install easyocr and opencv-python-headless.
RUN pip3 install --no-cache-dir easyocr opencv-python-headless

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
