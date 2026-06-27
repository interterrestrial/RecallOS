// Polyfill for Next.js Turbopack worker environments
if (typeof process === 'undefined') {
  (globalThis as any).process = { env: {}, versions: {} };
} else {
  if (typeof (process as any).env === 'undefined') (process as any).env = {};
  if (typeof (process as any).versions === 'undefined') (process as any).versions = {};
}

// Prevent transformers.js from crashing when evaluating isEmpty(undefined)
const originalObjectKeys = Object.keys;
Object.keys = function(obj: any) {
  if (obj === undefined || obj === null) return [];
  return originalObjectKeys(obj);
};

let transcriber: any = null;

self.addEventListener('message', async (e: MessageEvent) => {
  const { type, audio } = e.data;
  console.log("[Worker] Received message:", type);
  
  if (type === 'load') {
    self.postMessage({ status: 'loading' });
    console.log("[Worker] Loading Whisper model...");
    try {
      const { pipeline, env } = await import('@xenova/transformers');
      
      env.allowLocalModels = false;
      env.useBrowserCache = true;
      // Ensure WASM files load correctly from CDN to prevent silent local 404 hangs
      env.backends.onnx.wasm.wasmPaths = 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.14.0/dist/';
      
      transcriber = await pipeline('automatic-speech-recognition', 'Xenova/whisper-tiny.en');
      console.log("[Worker] Whisper model loaded successfully");
      self.postMessage({ status: 'ready' });
    } catch (err: any) {
      console.error("[Worker] Error loading Whisper:", err);
      self.postMessage({ status: 'error', error: err.message });
    }
  } else if (type === 'transcribe') {
    console.log("[Worker] Transcribe requested. Transcriber exists?", !!transcriber);
    if (!transcriber) {
      self.postMessage({ status: 'error', error: 'Model not loaded' });
      return;
    }
    
    self.postMessage({ status: 'transcribing' });
    try {
      // audio should be a Float32Array
      const result = await transcriber(audio, {
        chunk_length_s: 30,
        stride_length_s: 5,
        return_timestamps: true,
      });
      
      self.postMessage({ status: 'complete', text: result.text });
    } catch (err: any) {
      self.postMessage({ status: 'error', error: err.message });
    }
  }
});
