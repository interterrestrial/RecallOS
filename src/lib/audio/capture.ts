export class AudioCapture {
  private localStream: MediaStream | null = null;
  private remoteStream: MediaStream | null = null;

  async getMicrophoneStream(): Promise<MediaStream> {
    if (!this.localStream) {
      this.localStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
    }
    return this.localStream;
  }

  async getDisplayStream(): Promise<MediaStream> {
    if (!this.remoteStream) {
      this.remoteStream = await navigator.mediaDevices.getDisplayMedia({
        video: true, // Video must be requested for getDisplayMedia, even if we only want audio
        audio: true,
      });
    }
    return this.remoteStream;
  }

  stopAllStreams(): void {
    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => track.stop());
      this.localStream = null;
    }
    if (this.remoteStream) {
      this.remoteStream.getTracks().forEach((track) => track.stop());
      this.remoteStream = null;
    }
  }
}
