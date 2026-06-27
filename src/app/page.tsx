"use client";

import { useState, useRef, useEffect } from "react";
import { AudioCapture } from "@/lib/audio/capture";
import { AudioMixer } from "@/lib/audio/mixer";
import { LLMSynthesizer } from "@/lib/synthesis/llm";
import { Exporter, MeetingMinutes } from "@/lib/utils/exporter";

export default function Home() {
  const [status, setStatus] = useState<"idle" | "recording" | "transcribing" | "synthesizing" | "done" | "error">("idle");
  const [progress, setProgress] = useState<string>("");
  const [transcript, setTranscript] = useState<string>("");
  const [mom, setMom] = useState<MeetingMinutes | null>(null);

  const captureRef = useRef<AudioCapture | null>(null);
  const mixerRef = useRef<AudioMixer | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  
  const workerRef = useRef<Worker | null>(null);
  const llmRef = useRef<LLMSynthesizer | null>(null);

  useEffect(() => {
    // Initialize Web Worker for Transcription
    workerRef.current = new Worker(new URL('../lib/worker/transcription.worker.ts', import.meta.url), { type: 'module' });
    
    workerRef.current.onmessage = (e) => {
      const { status, text, error } = e.data;
      if (status === 'loading') setProgress("Loading Whisper model...");
      else if (status === 'ready') setProgress("Whisper model ready");
      else if (status === 'transcribing') setProgress("Whisper is analyzing audio...");
      else if (status === 'error') {
        setStatus("error");
        setProgress(`Whisper Error: ${error}`);
      }
      else if (status === 'complete') {
        setTranscript(text);
        startLLMSynthesis(text);
      }
    };
    
    workerRef.current.postMessage({ type: 'load' });
    
    // Initialize LLM Synthesizer and eagerly load in background
    llmRef.current = new LLMSynthesizer();
    llmRef.current.loadModel().catch(console.error);
    
    return () => {
      if (workerRef.current) workerRef.current.terminate();
      if (llmRef.current) llmRef.current.disposeModel();
    };
  }, []);

  const startRecording = async () => {
    try {
      setStatus("recording");
      setTranscript("");
      setMom(null);
      audioChunksRef.current = [];

      captureRef.current = new AudioCapture();
      const local = await captureRef.current.getMicrophoneStream();
      const remote = await captureRef.current.getDisplayStream();

      mixerRef.current = new AudioMixer();
      const mixedStream = mixerRef.current.mixStreams(local, remote);

      recorderRef.current = new MediaRecorder(mixedStream, { mimeType: 'audio/webm' });
      
      recorderRef.current.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      recorderRef.current.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        await processAudio(audioBlob);
      };

      recorderRef.current.start();
    } catch (e: any) {
      setStatus("error");
      setProgress(e.message);
      stopAll();
    }
  };

  const stopRecording = () => {
    if (recorderRef.current && recorderRef.current.state === "recording") {
      recorderRef.current.stop();
    }
    stopAll();
  };

  const stopAll = () => {
    if (captureRef.current) {
      captureRef.current.stopAllStreams();
      captureRef.current = null;
    }
    if (mixerRef.current) {
      mixerRef.current.close();
      mixerRef.current = null;
    }
  };

  const processAudio = async (audioBlob: Blob) => {
    setStatus("transcribing");
    setProgress("Decoding audio...");
    try {
      // Decode webm to raw PCM audio using AudioContext
      const arrayBuffer = await audioBlob.arrayBuffer();
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      const audioCtx = new AudioContextClass({ sampleRate: 16000 });
      const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
      const OfflineAudioContextClass = window.OfflineAudioContext || (window as any).webkitOfflineAudioContext;
      const offlineCtx = new OfflineAudioContextClass(1, audioBuffer.length, 16000);
      const source = offlineCtx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(offlineCtx.destination);
      source.start();
      const renderedBuffer = await offlineCtx.startRendering();
      const float32Array = renderedBuffer.getChannelData(0);
      console.log(`[Main] Decoded audio length: ${float32Array.length} samples (${float32Array.length / 16000} seconds)`);
      setProgress("Running Whisper transcription...");
      console.log("[Main] Dispatching to worker...");
      
      if (!workerRef.current) {
        throw new Error("Worker is not initialized");
      }
      
      workerRef.current.postMessage({
        type: 'transcribe',
        audio: float32Array
      });
      console.log("[Main] Dispatch complete");
    } catch (e: any) {
      setStatus("error");
      setProgress(`Audio Processing Error: ${e.message}`);
    }
  };

  const startLLMSynthesis = async (text: string) => {
    if (!text.trim()) {
      setStatus("done");
      setProgress("No audio detected. Meeting minutes skipped.");
      return;
    }
    
    setStatus("synthesizing");
    setProgress("Preparing LLM for synthesis (if not already loaded)...");
    try {
      if (llmRef.current) {
        await llmRef.current.loadModel((report) => {
          setProgress(`Loading LLM: ${report.text}`);
        });
        setProgress("Generating Meeting Minutes...");
        const result = await llmRef.current.generateMoM(text);
        setMom(result);
        setStatus("done");
        setProgress("Meeting minutes generated successfully!");
      }
    } catch (e: any) {
      setStatus("error");
      setProgress(`LLM Error: ${e.message}`);
    }
  };

  const downloadNotes = () => {
    if (mom && transcript) {
      const blob = Exporter.exportMarkdown(mom, transcript);
      Exporter.downloadFile(blob, `meeting-notes-${new Date().toISOString().split('T')[0]}.md`);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-50 font-sans selection:bg-purple-500/30">
      <main className="max-w-4xl mx-auto px-6 py-12 flex flex-col gap-12">
        {/* Header */}
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-2">
              <span className="text-purple-500">🎙️</span> RecallOS
            </h1>
            <p className="text-zinc-400 mt-2">Browser-Native, Offline AI Meeting Assistant</p>
          </div>
          <div className="px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-full text-xs font-mono text-zinc-400">
            100% On-Device
          </div>
        </header>

        {/* Controls */}
        <section className="p-8 bg-zinc-900/50 border border-zinc-800/50 rounded-2xl flex flex-col items-center justify-center gap-6 shadow-2xl shadow-purple-900/10">
          <div className="flex items-center gap-4">
            {status === "idle" || status === "done" || status === "error" ? (
              <button 
                onClick={startRecording}
                className="px-8 py-4 bg-purple-600 hover:bg-purple-500 text-white rounded-full font-medium transition-all shadow-lg shadow-purple-500/25 active:scale-95"
              >
                Start Recording
              </button>
            ) : status === "recording" ? (
              <button 
                onClick={stopRecording}
                className="px-8 py-4 bg-red-500 hover:bg-red-400 text-white rounded-full font-medium transition-all shadow-lg shadow-red-500/25 active:scale-95 flex items-center gap-3"
              >
                <span className="w-3 h-3 bg-white rounded-full animate-pulse"></span>
                Stop Recording
              </button>
            ) : (
              <button 
                disabled
                className="px-8 py-4 bg-zinc-800 text-zinc-400 rounded-full font-medium cursor-not-allowed flex items-center gap-3"
              >
                <span className="w-5 h-5 border-2 border-zinc-400 border-t-transparent rounded-full animate-spin"></span>
                Processing...
              </button>
            )}
          </div>
          
          <div className="text-sm text-zinc-400 font-mono text-center">
            Status: <span className="text-purple-400">{status}</span> 
            {progress && <span className="ml-2 text-zinc-500 block mt-1">({progress})</span>}
          </div>
        </section>

        {/* Results */}
        {(transcript || mom || status === "transcribing" || status === "synthesizing") && (
          <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-zinc-900/50 border border-zinc-800/50 rounded-2xl p-6 flex flex-col gap-4">
              <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                📝 Transcript
              </h2>
              <div className="flex-1 bg-zinc-950 rounded-xl p-4 overflow-y-auto min-h-[300px] border border-zinc-800">
                <p className="text-sm text-zinc-300 leading-relaxed whitespace-pre-wrap">
                  {transcript || (status === "transcribing" ? "Transcribing audio..." : "")}
                </p>
              </div>
            </div>

            <div className="bg-zinc-900/50 border border-zinc-800/50 rounded-2xl p-6 flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                  🧠 AI Minutes
                </h2>
                {status === "done" && mom && (
                  <button 
                    onClick={downloadNotes}
                    className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg text-sm font-medium transition-colors"
                  >
                    Download .md
                  </button>
                )}
              </div>
              <div className="flex-1 bg-zinc-950 rounded-xl p-6 overflow-y-auto min-h-[300px] border border-zinc-800">
                {status === "synthesizing" ? (
                  <div className="text-sm text-zinc-400 animate-pulse">Synthesizing MoM...</div>
                ) : mom ? (
                  <div className="flex flex-col gap-6">
                    <div>
                      <h3 className="text-sm font-medium text-purple-400 uppercase tracking-wider mb-2">Executive Summary</h3>
                      <p className="text-sm text-zinc-300 leading-relaxed">{mom.executiveSummary}</p>
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-purple-400 uppercase tracking-wider mb-2">Decisions Made</h3>
                      <ul className="list-disc list-inside text-sm text-zinc-300 space-y-1">
                        {mom.decisions.map((d, i) => <li key={i}>{d}</li>)}
                      </ul>
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-purple-400 uppercase tracking-wider mb-2">Action Items</h3>
                      <ul className="list-disc list-inside text-sm text-zinc-300 space-y-1">
                        {mom.actionItems.map((a, i) => <li key={i}>{a}</li>)}
                      </ul>
                    </div>
                  </div>
                ) : (
                  <div className="text-sm text-zinc-600">Minutes will appear here after recording.</div>
                )}
              </div>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
