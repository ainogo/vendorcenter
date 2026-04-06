# Use prebuilt llama.cpp release binary (CPU-only, Ubuntu x64)
# Avoids cmake build which can OOM/timeout on free-tier HF Spaces
FROM ubuntu:22.04

RUN apt-get update && \
    apt-get install -y --no-install-recommends ca-certificates curl libgomp1 && \
    apt-get clean && rm -rf /var/lib/apt/lists/*

# Download prebuilt llama-server from official GitHub releases
# Pin to a specific tag for reproducibility (repo moved to ggml-org)
# Extract entire tarball — backends are loaded as plugins from the same dir
ARG LLAMA_VERSION=b8565
RUN mkdir -p /opt/llama && \
        curl -fSL "https://github.com/ggml-org/llama.cpp/releases/download/${LLAMA_VERSION}/llama-${LLAMA_VERSION}-bin-ubuntu-x64.tar.gz" \
            -o /tmp/llama.tar.gz && \
        tar -xzf /tmp/llama.tar.gz -C /opt/llama --strip-components=1 && \
        chmod +x /opt/llama/llama-server && \
        rm -f /tmp/llama.tar.gz

# HF Spaces requires running as user ID 1000
RUN useradd -m -u 1000 user
USER user
ENV HOME=/home/user \
    PATH=/opt/llama:/home/user/.local/bin:$PATH \
    LD_LIBRARY_PATH="/opt/llama:/opt/llama/lib"

WORKDIR $HOME/app

# HuggingFace Spaces runs on port 7860
ENV PORT=7860

# llama-server downloads the GGUF from HF at startup via --hf-repo + --hf-file
ENV HF_REPO="timesprimeaj/vendorcenter-assistant-qwen25-gguf"
ENV HF_FILE="qwen2.5-3b-instruct.Q4_K_M.gguf"

EXPOSE ${PORT}

CMD ["sh", "-c", "llama-server --hf-repo ${HF_REPO} --hf-file ${HF_FILE} --host 0.0.0.0 --port ${PORT} -c 1024 -ngl 0 --chat-template chatml --alias vendorcenter-3b -t 4"]
