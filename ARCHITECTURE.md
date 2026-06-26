# RecallOS Architecture

This document outlines the technical architecture of **RecallOS**, the browser-native, offline AI meeting assistant. It includes the High-Level System Architecture, Class Diagram, and Entity-Relationship (ER) Diagram representing the internal data flow, as the system operates entirely client-side without a traditional database.

## 1. System Architecture (UML Component/Flow Diagram)

RecallOS follows a strict sequential execution pipeline to optimize for consumer hardware. The entire process—from audio capture to model inference—happens securely within the browser.

```mermaid
graph TD
    subgraph UI["User Interface (Main Thread)"]
        Controls["Start / Stop Controls"]
        Status["Status Indicators"]
    end

    subgraph CaptureLayer["1. Capture Layer"]
        Mic["Microphone (getUserMedia)"]
        Tab["System Audio (getDisplayMedia)"]
        Mixer["Audio Graph Mixer (Web Audio API)"]
        Recorder["MediaRecorder (16kHz Mono)"]
    end

    subgraph ASRPhase["2. ASR Phase (Web Worker)"]
        Worker["Transcription Worker"]
        Whisper["Whisper Model (Transformers.js)"]
        WebGPU1["WebGPU Acceleration"]
    end

    subgraph LLMPhase["3. LLM Synthesis Phase"]
        LLMEngine["LLM Engine (WebLLM / Transformers.js)"]
        WebGPU2["WebGPU Acceleration"]
        MoM["Meeting Minutes Generator"]
    end

    subgraph ExportPhase["4. Export Layer"]
        Exporter["Markdown Exporter"]
        Download["Local .md File Download"]
    end

    Controls -->|Initializes| Mic
    Controls -->|Initializes| Tab
    Mic -->|Local Stream| Mixer
    Tab -->|Remote Stream| Mixer
    Mixer -->|Mixed Stream| Recorder
    Recorder -->|Audio Blob| Worker
    
    Worker <--> WebGPU1
    Worker <--> Whisper
    Worker -->|Transcript Text| LLMEngine
    
    LLMEngine <--> WebGPU2
    LLMEngine -->|Analyzes Text| MoM
    MoM -->|Structured Data| Exporter
    Exporter -->|Triggers| Download
```

## 2. Class Diagram

The following class diagram models the core modules responsible for handling different phases of the RecallOS pipeline, based on the project structure (e.g., `lib/audio/capture.ts`, `lib/audio/mixer.ts`, `lib/worker/transcription.worker.ts`, `lib/synthesis/llm.ts`, `lib/utils/exporter.ts`).

```mermaid
classDiagram
    class Application {
        +startMeeting()
        +stopMeeting()
        -updateStatus()
    }

    class AudioCapture {
        -MediaStream localStream
        -MediaStream remoteStream
        +getMicrophoneStream() MediaStream
        +getDisplayStream() MediaStream
        +stopAllStreams()
    }

    class AudioMixer {
        -AudioContext context
        -MediaStreamDestinationNode destination
        +mixStreams(MediaStream local, MediaStream remote) MediaStream
        +getResampledMonoStream() MediaStream
    }

    class TranscriptionWorker {
        -Worker worker
        +initModel()
        +transcribe(Blob audioData) Promise~String~
        -disposeModel()
    }

    class LLMSynthesizer {
        -Model llmModel
        +loadModel()
        +generateMoM(String transcript) Promise~MeetingMinutes~
        +disposeModel()
    }

    class Exporter {
        +exportMarkdown(MeetingMinutes data) Blob
        +downloadFile(Blob file, String filename)
    }

    class MeetingMinutes {
        +String executiveSummary
        +List~String~ decisions
        +List~String~ actionItems
    }

    Application --> AudioCapture : uses
    Application --> AudioMixer : uses
    Application --> TranscriptionWorker : uses
    Application --> LLMSynthesizer : uses
    Application --> Exporter : uses

    LLMSynthesizer ..> MeetingMinutes : creates
    Exporter ..> MeetingMinutes : consumes
```

## 3. Entity Relationship (ER) Diagram

Although RecallOS operates entirely client-side without a backend or persistent database, we can represent the logical data entities that are created, transformed, and passed between modules during the meeting lifecycle.

```mermaid
erDiagram
    MEETING {
        string id
        datetime startTime
        datetime endTime
    }
    
    AUDIO_STREAM {
        blob rawAudioData
        int sampleRate
        int channels
        string format
    }
    
    TRANSCRIPT {
        string fullText
        datetime generatedAt
    }
    
    MEETING_MINUTES {
        string executiveSummary
        string decisionsMade
        string actionItems
    }
    
    EXPORTED_DOCUMENT {
        string filename
        string fileFormat
        string markdownContent
    }

    MEETING ||--|| AUDIO_STREAM : "records"
    AUDIO_STREAM ||--|| TRANSCRIPT : "transcribed into"
    TRANSCRIPT ||--|| MEETING_MINUTES : "synthesized into"
    MEETING_MINUTES ||--|| EXPORTED_DOCUMENT : "exported as"
```
