# Chatterbox TTS Multilingual - GPU Dockerfile
# For RunPod deployment with CUDA support

FROM nvidia/cuda:12.1.0-cudnn8-runtime-ubuntu22.04

# Set environment variables for Python, caching, and HuggingFace
ENV DEBIAN_FRONTEND=noninteractive \
    PYTHONUNBUFFERED=1 \
    DEVICE=cuda \
    CACHE_DIR=/tmp/tts_cache \
    MODEL_CACHE_DIR=/models \
    HF_HOME=/models/huggingface \
    HUGGINGFACE_HUB_CACHE=/models/huggingface/hub \
    TRANSFORMERS_CACHE=/models/huggingface/transformers \
    MAX_CHARS_PER_CHUNK=500 \
    DEFAULT_FORMAT=mp3 \
    HF_HUB_OFFLINE=0

# Install system dependencies and Python 3.11 from deadsnakes PPA
RUN apt-get update && \
    apt-get install -y software-properties-common && \
    add-apt-repository ppa:deadsnakes/ppa && \
    apt-get update && \
    apt-get install -y \
    python3.11 \
    python3.11-dev \
    python3.11-distutils \
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

# Clone and install Chatterbox from source (includes multilingual model)
RUN git clone --depth 1 https://github.com/resemble-ai/chatterbox.git /opt/chatterbox && \
    cd /opt/chatterbox && \
    pip install --no-cache-dir -e .

# Copy requirements and install
COPY services/chatterbox_tts_multilingual/requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir -r /app/requirements.txt

# Copy serverless handler and voice files
COPY services/chatterbox_tts_multilingual/rp_handler.py /rp_handler.py
COPY services/chatterbox_tts_multilingual/runpod /app/runpod

# Create cache directories
RUN mkdir -p /tmp/tts_cache /models/huggingface/hub /models/huggingface/transformers

# Pre-download model weights at build time (with proper HF cache)
RUN python3 -c "from chatterbox.mtl_tts import ChatterboxMultilingualTTS; model = ChatterboxMultilingualTTS.from_pretrained(device='cpu'); print('✅ Multilingual model cached')"

# Run serverless handler
CMD ["python3", "-u", "/rp_handler.py"]
