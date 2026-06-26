# 🎙️ RecallOS

> **The Browser-Native, Offline AI Meeting Assistant. Built for 100%
> Privacy.**

RecallOS is an **on-device, zero-server meeting assistant** designed to
capture, transcribe, and synthesize virtual or physical conversations
directly within your browser.

By utilizing **WebGPU hardware acceleration**, RecallOS runs
state-of-the-art **Automatic Speech Recognition (ASR)** and **Large
Language Model (LLM)** inference entirely on your local machine.

Your audio **never leaves your device**, ensuring:

-   🔒 Complete Privacy
-   💰 Zero Per-Minute Billing
-   🌐 Offline Functionality (after model download)
-   🚀 No Backend Servers
-   🔑 No API Keys Required

------------------------------------------------------------------------

# 🔮 Core Modules & Features

## 🎧 Dual-Stream Audio Capture

Capture both:

-   Remote meeting audio using `getDisplayMedia()`
-   Local microphone using `getUserMedia()`

## 🎚️ Audio Graph Mixer

Uses the **Web Audio API** to:

-   Mix both audio streams
-   Convert to mono
-   Resample to **16kHz**
-   Produce a unified recording for Whisper

## 🗣️ WebGPU Speech-to-Text (STT)

Runs **Whisper** locally via:

-   Transformers.js
-   ONNX Runtime Web
-   WebGPU

Inference executes inside a **Web Worker** to keep the UI responsive.

## 🧠 In-Browser LLM Synthesis

Uses **WebLLM** or **Transformers.js** with lightweight quantized models
to generate structured Minutes of Meeting (MoM).

Outputs include:

-   Executive Summary
-   Decisions Made
-   Action Items

## 📄 Local File Exporter

Generates beautifully formatted **Markdown (.md)** meeting notes and
downloads them directly using browser-native APIs.

------------------------------------------------------------------------

# 🏗️ Technical Architecture

RecallOS follows a **strict sequential execution pipeline** optimized
for consumer hardware (including 8GB M-series Macs).

## 1. Capture Layer

-   Audio recording only
-   No AI models loaded

## 2. ASR Phase (Web Worker)

-   Load Whisper
-   Transcribe 16kHz mono audio
-   Return transcript
-   Dispose model and free GPU memory

## 3. LLM Phase

-   Load quantized LLM
-   Generate MoM
-   Trigger Markdown download
-   Dispose model

------------------------------------------------------------------------

# 🛠️ Tech Stack

  ------------------------------------------------------------------------------
  Layer         Technology          Language            Specifications
  ------------- ------------------- ------------------- ------------------------
  Frontend/UI   Vite, HTML5,        TypeScript          Strict client-side
                Tailwind CSS                            execution

  Capture &     Web Audio API,      TypeScript          Multi-source capture,
  Mixing        MediaRecorder                           16kHz mono

  ASR Engine    Transformers.js,    TypeScript/WebGPU   Whisper Tiny/Base
                ONNX Runtime Web                        

  LLM Engine    WebLLM,             TypeScript/WebGPU   Llama-3.2-1B /
                Transformers.js                         Qwen2.5-0.5B

  Hosting       GitHub Pages,       N/A                 HTTPS static hosting
                Vercel                                  
  ------------------------------------------------------------------------------

------------------------------------------------------------------------

# 📁 Project Structure

``` text
recallos/
├── package.json
├── vite.config.ts
├── tailwind.config.js
├── index.html
└── src/
    ├── style.css
    ├── main.ts
    ├── audio/
    │   ├── capture.ts
    │   └── mixer.ts
    ├── worker/
    │   └── transcription.worker.ts
    ├── synthesis/
    │   └── llm.ts
    └── utils/
        └── exporter.ts
```

------------------------------------------------------------------------

# 🏁 Getting Started

## Prerequisites

-   WebGPU-enabled browser (Chrome 113+, Edge 113+, supported Firefox
    builds)
-   HTTPS hosting environment (or localhost)

## Installation

### Clone the Repository

``` bash
git clone https://github.com/your-username/recallos.git
cd recallos
```

### Install Dependencies

``` bash
npm install
```

### Run Development Server

``` bash
npm run dev
```

### Build for Production

``` bash
npm run build
```

------------------------------------------------------------------------

# 🧠 Implementation Highlights

## Web Audio API Mixing Flow

RecallOS builds an internal routing graph by:

1.  Creating an `AudioContext`
2.  Creating media stream sources for:
    -   Meeting tab
    -   Microphone
3.  Mixing both streams
4.  Recording the merged output

## Web Worker Isolation

Whisper inference runs entirely inside a dedicated Web Worker.

Benefits include:

-   Responsive UI
-   Non-blocking inference
-   Efficient WebGPU execution
-   Timestamped transcript generation

------------------------------------------------------------------------

# ✨ Key Features

-   100% Client-Side
-   Offline AI Processing
-   No Backend
-   No Cloud Storage
-   No API Keys
-   WebGPU Accelerated
-   Privacy First
-   Automatic Minutes of Meeting
-   Markdown Export
-   Free Static Deployment
