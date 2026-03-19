# ACE-Step 1.5 API Integration Research

> **Date:** 2026-03-18  
> **Issue:** #114  
> **Status:** Research complete

---

## 1. Repository & Version Overview

ACE-Step 1.5 is a **separate repository** from the original ACE-Step v1:

| Version | Repo | Status |
|---------|------|--------|
| v1.0 | `github.com/ace-step/ACE-Step` | Original, Gradio-only UI |
| **v1.5** | `github.com/ace-step/ACE-Step-1.5` | **Current — has dedicated REST API server** |

**Key v1.5 improvements over v1.0:**
- Dedicated `acestep-api` REST API server (not just Gradio)
- Hybrid LM + DiT architecture (Language Model plans, DiT generates)
- Multiple DiT models: `acestep-v15-base`, `acestep-v15-sft`, `acestep-v15-turbo`
- Multiple LM models: `acestep-5Hz-lm-0.6B`, `1.7B`, `4B`
- Cover generation, repainting, multi-track "lego", vocal2BGM
- <4GB VRAM, supports Mac/AMD/Intel/CUDA
- Under 2s per full song on A100

---

## 2. Starting the Model Server

### Quick Start

```bash
# Install
git clone https://github.com/ACE-Step/ACE-Step-1.5.git
cd ACE-Step-1.5
uv sync                        # or: pip install -e .

# Launch REST API server (what our DAW connects to)
uv run acestep-api             # → http://localhost:8001

# Alternative: Gradio UI (not needed for DAW integration)
uv run acestep                 # → http://localhost:7860
```

### Direct Python Launch

```bash
python acestep/api_server.py                     # REST API
python acestep/acestep_v15_pipeline.py           # Gradio UI
```

### Platform Launch Scripts

| Platform | API Script |
|----------|-----------|
| Windows | `start_api_server.bat` |
| Linux | `start_api_server.sh` |
| macOS (Apple Silicon) | `start_api_server_macos.sh` |

macOS scripts auto-set `ACESTEP_LM_BACKEND=mlx` for Apple Silicon.

### Models Auto-Download

Models download automatically on first run to `~/.cache/ace-step/checkpoints` (or custom path).

---

## 3. API Endpoints

**Base URL:** `http://localhost:8001` (configurable via `ACESTEP_API_PORT`)

### Core Workflow

1. `POST /release_task` → submit generation task → get `task_id`
2. `POST /query_result` → poll task status until `status=1` (done) or `2` (failed)
3. `GET /v1/audio?path=...` → download generated audio

### All Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/health` | Health check |
| `GET` | `/v1/models` | List available DiT models |
| `GET` | `/v1/model_inventory` | Extended model list (includes LM models) |
| `GET` | `/v1/stats` | Server statistics (queue, job counts) |
| `GET` | `/v1/audio?path=<path>` | Download generated audio file |
| `POST` | `/release_task` | Submit generation task |
| `POST` | `/query_result` | Batch query task results |
| `POST` | `/format_input` | LM-enhanced caption/lyrics formatting |
| `POST` | `/create_random_sample` | Get random sample parameters |
| `POST` | `/v1/init` | Initialize/switch model (DAW uses this) |

### Response Envelope

All responses use a unified wrapper:

```json
{
  "data": { ... },
  "code": 200,
  "error": null,
  "timestamp": 1700000000000,
  "extra": null
}
```

---

## 4. Key Parameters for `/release_task`

### Content-Type Support
- `application/json` — text params + server-side audio paths
- `multipart/form-data` — file uploads (our DAW uses this for `src_audio`)

### Task Types

| `task_type` | Description | Requires `src_audio`? |
|------------|-------------|----------------------|
| `text2music` | Generate from prompt/lyrics | No |
| `cover` | Style transfer on existing audio | Yes |
| `repaint` | Partially regenerate a section | Yes |
| `lego` | Multi-track layer generation | Yes (or `src_audio_path`) |
| `extract` | Extract features from audio | Yes |
| `complete` | Complete/extend audio | Yes |

### Essential Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `prompt` / `caption` | string | `""` | Music style/genre description |
| `lyrics` | string | `""` | Lyrics with structure tags |
| `thinking` | bool | `false` | Use LM for enhanced generation (recommended `true`) |
| `model` | string | null | DiT model name (e.g., `"acestep-v15-turbo"`) |
| `audio_duration` | float | null | Duration in seconds (10–600) |
| `inference_steps` | int | `8` | Turbo: 1–20 (rec. 8). Base: 1–200 (rec. 32–64) |
| `guidance_scale` | float | `7.0` | Prompt guidance (base model only) |
| `batch_size` | int | `2` | Number of variations (max 8) |
| `seed` | int | `-1` | Deterministic seed |
| `use_random_seed` | bool | `true` | Random seed per generation |
| `audio_format` | string | `"mp3"` | Output: mp3, wav, flac |

### Music Metadata

| Parameter | Type | Description |
|-----------|------|-------------|
| `bpm` | int | Tempo (30–300), null = auto |
| `key_scale` | string | Key (e.g., "C Major"), "" = auto |
| `time_signature` | string | "2", "3", "4", "6" for x/4 or 6/8 |
| `vocal_language` | string | Lyrics language code |

### Edit/Reference Audio

| Parameter | Type | Description |
|-----------|------|-------------|
| `src_audio_path` | string | Server-side source audio path |
| `reference_audio_path` | string | Reference audio for style transfer |
| `repainting_start` | float | Repaint start time (seconds) |
| `repainting_end` | float | Repaint end time (seconds) |
| `audio_cover_strength` | float | Cover strength (0.0–1.0) |

### File Upload Fields (multipart/form-data)

| Field | Description |
|-------|-------------|
| `src_audio` / `ctx_audio` | Source audio file |
| `reference_audio` / `ref_audio` | Reference audio file |

### LM Parameters (when `thinking=true`)

| Parameter | Default | Description |
|-----------|---------|-------------|
| `lm_model_path` | auto | LM checkpoint name |
| `lm_backend` | `"vllm"` | `vllm`, `pt`, or `mlx` |
| `lm_temperature` | `0.85` | Sampling temperature |
| `lm_cfg_scale` | `2.5` | CFG scale |
| `use_cot_caption` | `true` | LM rewrites/enhances caption |
| `use_cot_language` | `true` | LM detects vocal language |
| `use_format` | `false` | LM enhances caption + lyrics |
| `sample_mode` | `false` | Auto-generate everything from description |
| `sample_query` | `""` | Natural language description for sample mode |

---

## 5. Model Switching

### Available DiT Models

| Model | Steps | CFG | Quality | Speed |
|-------|-------|-----|---------|-------|
| `acestep-v15-turbo` | 8 | No | Very High | Fastest |
| `acestep-v15-sft` | 50 | Yes | High | Medium |
| `acestep-v15-base` | 50 | Yes | Medium | Medium |

### Available LM Models

| Model | Based On | VRAM | Capability |
|-------|----------|------|------------|
| `acestep-5Hz-lm-0.6B` | Qwen3-0.6B | 6–8GB | Basic |
| `acestep-5Hz-lm-1.7B` | Qwen3-1.7B | 8–16GB | Medium |
| `acestep-5Hz-lm-4B` | Qwen3-4B | ≥24GB | Best quality |

### How to Switch Models

**Per-request:** Include `"model": "acestep-v15-turbo"` in `/release_task` body.

**At startup via env vars:**

```bash
ACESTEP_CONFIG_PATH=acestep-v15-turbo      # Primary DiT
ACESTEP_CONFIG_PATH2=acestep-v15-sft       # Secondary DiT (optional)
ACESTEP_LM_MODEL_PATH=acestep-5Hz-lm-1.7B # LM model
```

**Via `/v1/init` endpoint** (what our DAW's `initModel()` calls):

```json
POST /v1/init
{
  "model": "acestep-v15-turbo",
  "init_llm": true,
  "lm_model_path": "acestep-5Hz-lm-1.7B"
}
```

**List available models:**

```bash
GET /v1/models
GET /v1/model_inventory   # includes LM models
```

---

## 6. Environment Variables

### Server Config

| Variable | Default | Description |
|----------|---------|-------------|
| `ACESTEP_API_HOST` | `127.0.0.1` | Bind host |
| `ACESTEP_API_PORT` | `8001` | Bind port |
| `ACESTEP_API_KEY` | (empty) | API key (empty = no auth) |

### Model Config

| Variable | Default | Description |
|----------|---------|-------------|
| `ACESTEP_CONFIG_PATH` | `acestep-v15-turbo` | Primary DiT model |
| `ACESTEP_DEVICE` | `auto` | Device (cuda, mps, cpu) |
| `ACESTEP_OFFLOAD_TO_CPU` | `false` | CPU offload for low VRAM |
| `ACESTEP_INIT_LLM` | `auto` | Initialize LM at startup |
| `ACESTEP_LM_MODEL_PATH` | `acestep-5Hz-lm-0.6B` | LM model |
| `ACESTEP_LM_BACKEND` | `vllm` | LM backend (vllm/pt/mlx) |

### Recommended `.env` File

```bash
ACESTEP_CONFIG_PATH=acestep-v15-turbo
ACESTEP_LM_MODEL_PATH=acestep-5Hz-lm-1.7B
PORT=8001
```

---

## 7. DAW API Client Alignment

Our DAW's `aceStepApi.ts` is **well-aligned** with ACE-Step 1.5's API. Key mappings:

| DAW Function | API Endpoint | Status |
|-------------|-------------|--------|
| `healthCheck()` | `GET /health` | ✅ Aligned |
| `listModels()` | `GET /v1/model_inventory` → fallback `/v1/models` | ✅ Aligned |
| `initModel()` | `POST /v1/init` | ✅ Aligned |
| `getStats()` | `GET /v1/stats` | ✅ Aligned |
| `releaseLegoTask()` | `POST /release_task` (multipart) | ✅ Aligned |
| `queryResult()` | `POST /query_result` | ✅ Aligned |
| `downloadAudio()` | `GET /v1/audio?path=...` | ✅ Aligned |

### DAW Type Alignment

| DAW Type | API Mapping | Notes |
|----------|------------|-------|
| `LegoTaskParams` | `task_type: "lego"` | Multi-track generation |
| `CoverTaskParams` | `task_type: "cover"` | Style transfer |
| `RepaintTaskParams` | `task_type: "repaint"` | Section regeneration |

### Minor Gaps / Considerations

1. **`thinking` parameter:** DAW types include `thinking: boolean` — maps to v1.5's LM-enhanced mode. Should default to `true` for best quality.
2. **`sample_mode` / `sample_query`:** v1.5 supports description-driven generation where LM auto-generates everything. DAW could add a "Simple Mode" that leverages this.
3. **`use_format`:** v1.5 can LM-enhance user captions/lyrics. Could be exposed as a DAW toggle.
4. **`audio_format`:** DAW hardcodes `"wav"`, but v1.5 also supports `mp3` and `flac`.
5. **`reference_audio`:** v1.5 supports reference audio for style guidance — DAW could add this for better cover/lego results.
6. **Authentication:** v1.5 supports `ACESTEP_API_KEY` — DAW's backend URL setting could include optional API key.
7. **`text2music` task type:** DAW doesn't currently have a pure text2music flow (always uses lego/cover/repaint). Could add basic generation.

---

## 8. Hardware Requirements

| GPU VRAM | Recommended Config |
|----------|-------------------|
| ≤6GB | DiT only, no LM, INT8 quantization |
| 6–8GB | `acestep-5Hz-lm-0.6B` + `pt` backend |
| 8–16GB | `acestep-5Hz-lm-0.6B` or `1.7B` + `vllm` |
| 16–24GB | `acestep-5Hz-lm-1.7B` + `vllm` |
| ≥24GB | `acestep-5Hz-lm-4B` + `vllm` |

### macOS (Apple Silicon)

- Use `--backend mlx` or `ACESTEP_LM_BACKEND=mlx`
- M2 Max: ~26s for 1 min audio (27 steps), faster with turbo (8 steps)
- Use `--bf16 false` on macOS

---

## 9. Task Status Codes

| Code | Meaning |
|------|---------|
| `0` | Queued / Running |
| `1` | Succeeded |
| `2` | Failed |

These match our DAW's `TaskResultEntry.status` type exactly.

---

## 10. Summary & Next Steps

**The DAW's API layer is already well-designed for ACE-Step 1.5 integration.** The main work for Issue #114 is:

1. **Startup guide:** Document how to start `acestep-api` locally and configure it
2. **Connection flow:** Ensure the DAW's Settings panel can configure the backend URL (already exists via `BACKEND_URL_KEY`)
3. **Health check on load:** DAW should check `/health` on startup and show connection status
4. **Model discovery:** Use `/v1/model_inventory` to populate model selectors
5. **Consider adding:**
   - Simple text2music mode (not just lego/cover/repaint)
   - `use_format` toggle for LM-enhanced prompts
   - `sample_mode` for description-driven generation
   - Reference audio upload for style guidance
