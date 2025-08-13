# TalkyAI Studio — Local & Cloud AI Assistant

## Next-Gen AI Orchestration Platform

TalkyAI Studio is a unified desktop application for seamless AI workflow management across cloud APIs and local LLM servers. Switch between providers instantly and save configurations as reusable projects.

> **Cross-Platform** • **Privacy-First** • **Developer-Friendly**  
> Supports Windows, macOS & Linux. All data and keys stored locally.

![TalkyAI Studio Interface](public/screen1.png)  
![TalkyAI Studio Interface](public/screen2.png)

## ✨ Key Features

### 🚀 Multi-Provider Support
- **Cloud APIs**:
    - DeepSeek API (default endpoint included)
    - OpenAI-compatible services
- **Local Inference**:
    - llama.cpp (CPU/GPU optimized)
    - Ollama (automatic model management)

### ⚡ One-Click Local Server Management
- Binary validation for your system (CPU/ARM/CUDA/HIP/Vulkan)
- In-app downloads with OS detection
- Status monitoring: Download → Extract → Ready
- Automatic Ollama model fetching

### 🧠 Advanced Model Control
- **For Ollama**:
    - Local model browser
    - Pull progress tracking
    - Custom chat parameters via JSON
- **For llama.cpp**:
    - GGUF repository configuration
    - Server port customization
    - Generation fine-tuning

### 💼 Project Workspaces
- Save complete configurations (model, provider, server settings)
- One-click activation
- Project-specific chat histories

## 🖥️ System Dashboard
Real-time monitoring widget shows:
- CPU/RAM usage
- Server status
- Active project

## 🌍 Internationalization
- Languages: English | Русский
- Themes: Light/Dark mode
- All preferences saved locally

## 🚀 Quick Start Guide

```mermaid
graph TD
    A[Launch App] --> B{Choose Mode}
    B -->|Cloud| C[Configure API]
    B -->|Local| D[Setup Server]
    C --> E[Enter Chat]
    D --> E
```

1. **Select Mode**:
    - Cloud: Configure API endpoints and keys
    - Local: Install required server components

2. **For Local Mode**:
   ```bash
   # Example Ollama setup
   ollama pull llama3
   ```

3. **Start Chatting**:
    - Access developer tools
    - Attach files/folders as context
    - Use template prompts

## 🔧 Advanced Configuration

### Generation Parameters
| Parameter      | Description                          | Default |
|---------------|--------------------------------------|---------|
| `temperature` | Creativity control                   | 0.7     |
| `top_k`       | Token selection breadth              | 40      |
| `max_tokens`  | Response length limit (-1=unlimited) | -1      |

### Ollama JSON API Example
```json
{
  "options": {
    "num_ctx": 4096,
    "seed": 42,
    "stop": ["</s>"]
  }
```

## 🔒 Privacy & Security
- Zero telemetry
- Local encryption for sensitive data
- Secure credential storage using OS keychains

## 📦 System Requirements
- **Minimum**:
    - 8GB RAM
    - 2GB disk space
- **Recommended for Local Models**:
    - 16GB+ RAM
    - NVIDIA/AMD GPU with 8GB+ VRAM

## 📜 License
Currently unlicensed - [Contact us](mailto:ctapu4ok91@gmail.com) for licensing options.

---

### Why Choose TalkyAI Studio?
✅ **Unified Interface** - Manage all your AI workflows in one place  
✅ **Portable** - No cloud dependencies for local mode  
✅ **Extensible** - Plugin system coming soon

---