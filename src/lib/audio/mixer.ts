export class AudioMixer {
  private context: AudioContext;
  private destination: MediaStreamAudioDestinationNode;
  private sources: MediaStreamAudioSourceNode[] = [];

  constructor() {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    this.context = new AudioContext({ sampleRate: 16000 }); // Target sample rate for Whisper
    this.destination = this.context.createMediaStreamDestination();
    // Ensure we are downmixing to mono
    this.destination.channelCount = 1;
  }

  mixStreams(local: MediaStream, remote: MediaStream): MediaStream {
    if (this.context.state === "suspended") {
      this.context.resume();
    }

    if (local.getAudioTracks().length > 0) {
      const localSource = this.context.createMediaStreamSource(local);
      localSource.connect(this.destination);
      this.sources.push(localSource);
    }

    if (remote.getAudioTracks().length > 0) {
      const remoteSource = this.context.createMediaStreamSource(remote);
      remoteSource.connect(this.destination);
      this.sources.push(remoteSource);
    }

    return this.destination.stream;
  }

  getResampledMonoStream(): MediaStream {
    return this.destination.stream;
  }

  close() {
    this.sources.forEach(source => source.disconnect());
    this.sources = [];
    if (this.context.state !== "closed") {
      this.context.close();
    }
  }
}
