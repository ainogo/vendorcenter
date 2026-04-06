---
title: VendorCenter AI Assistant
emoji: 🔧
colorFrom: blue
colorTo: green
sdk: docker
pinned: false
license: apache-2.0
app_port: 7860
---

# VendorCenter AI Assistant

Fine-tuned Qwen2.5-3B-Instruct model (QLoRA → GGUF Q4_K_M) for local service vendor discovery and booking assistance.

## API

This Space exposes an OpenAI-compatible API at `/v1/chat/completions`.

### Example

```bash
curl -X POST https://YOUR-SPACE.hf.space/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "vendorcenter-3b",
    "messages": [
      {"role": "system", "content": "You are VendorCenter AI, a helpful assistant for a local services marketplace in India."},
      {"role": "user", "content": "I need a plumber near me"}
    ],
    "max_tokens": 256,
    "temperature": 0.1
  }'
```

## Setup

1. Fine-tune with the Colab notebook (`model/notebooks/finetune_vendorcenter.ipynb`)
2. Upload GGUF to HuggingFace Hub (`timesprimeaj/vendorcenter-assistant-qwen25-gguf`)
3. Create a new HF Space with Docker SDK and push the files in `model/hf-space/`
4. Set `SELF_HOSTED_LLM_URL=https://YOUR-SPACE.hf.space` on Railway backend
