---
name: Lego / from-silence timing
about: from-silence 或 chunk 选区下 lego 任务的 repainting、audio_duration 或 Metas 异常
title: "[generation] "
labels: bug
---

## 现象

<!-- 例如：from silence + 短选区生成异常、服务端 Metas duration 为 0、噪声等 -->

## 期望行为

- **From silence**：`repainting_start=0`，`repainting_end=-1`，`audio_duration` = **选区/clip 秒数**（> 0）。
- **From context**：repaint 为时间轴上 clip 区间，`audio_duration` = 工程时间轴长度。

详见仓库内 `docs/release_task_lego_mapping.md`（「Timing fields」「Regression to avoid」）。

## 复现步骤

1.
2.

## 环境

- DAW 版本 / 分支：
- ACE-Step API 版本（如已知）：

## 请求片段（可打码）

<!-- 可选：贴 `/release_task` 中与 repainting、audio_duration 相关的 JSON 字段 -->
