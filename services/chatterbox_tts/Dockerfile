# Chatterbox TTS - GPU Dockerfile
# For RunPod deployment with CUDA support

FROM nvidia/cuda:12.1.0-cudnn8-runtime-ubuntu22.04

# Set environment variables
ENV DEBIAN_FRONTEND=noninteractive \
    PYTHONUNBUFFERED=1 \
    DEVICE=cuda \
    CACHE_DIR=/tmp/tts_cache \
    MODEL_CACHE_DIR=/models \
    MAX_CHARS_PER_CHUNK=500 \
    DEFAULT_FORMAT=mp3

# Install system dependencies
RUN apt-get update && apt-get install -y \
    python3.11 \
    python3.11-dev \
    python3-pip \
    git \
    ffmpeg \
    libsndfile1 \
    libsndfile1-dev \
    wget \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Set Python 3.11 as default
RUN update-alternatives --install /usr/bin/python3 python3 /usr/bin/python3.11 1 && \
    update-alternatives --install /usr/bin/python python /usr/bin/python3.11 1

# Upgrade pip
RUN python3 -m pip install --no-cache-dir --upgrade pip setuptools wheel

# Create working directory
WORKDIR /app

# Install PyTorch with CUDA support (CUDA 12.1)
RUN pip install --no-cache-dir \
    torch==2.5.0 \
    torchaudio==2.5.0 \
    --index-url https://download.pytorch.org/whl/cu121

# Clone Chatterbox from GitHub
RUN git clone --depth 1 https://github.com/resemble-ai/chatterbox.git /opt/chatterbox && \
    ls -la /opt/chatterbox

# Install Chatterbox dependencies
RUN cd /opt/chatterbox && \
    pip install --no-cache-dir -e . --verbose

# Copy requirements and install
COPY services/chatterbox_tts/requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir -r /app/requirements.txt

# Copy application code
COPY services/chatterbox_tts/app /app/app

# Create cache directories
RUN mkdir -p /tmp/tts_cache /models

# Expose port
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=120s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

# Run FastAPI server
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "1"]
