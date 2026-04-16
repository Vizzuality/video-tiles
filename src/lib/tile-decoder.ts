import { EncodedPacketSink, Input, ALL_FORMATS, UrlSource } from "mediabunny";

export class TileDecoder {
  private _frames: VideoFrame[] = [];
  private _initialized = false;
  private _failed = false;
  private _destroyed = false;
  private _abortController: AbortController | null = null;

  get failed(): boolean {
    return this._failed;
  }

  get frameCount(): number {
    return this._frames.length;
  }

  async init(url: string): Promise<void> {
    if (this._initialized || this._destroyed) return;
    this._initialized = true;
    await this._decode(url);
  }

  getFrame(index: number): VideoFrame | undefined {
    return this._frames[index];
  }

  destroy(): void {
    this._destroyed = true;
    this._abortController?.abort();
    for (const frame of this._frames) frame.close();
    this._frames = [];
  }

  private async _decode(url: string): Promise<void> {
    const abortController = new AbortController();
    this._abortController = abortController;
    const { signal } = abortController;

    const frames: VideoFrame[] = [];
    let decoderError: DOMException | null = null;

    const decoder = new VideoDecoder({
      output: (frame) => { frames.push(frame) },
      error: (e) => { decoderError = e },
    });

    const input = new Input({
      source: new UrlSource(url),
      formats: ALL_FORMATS,
    });

    try {
      const videoTrack = await input.getPrimaryVideoTrack();
      if (!videoTrack) throw new Error("No video track found");

      const config = await videoTrack.getDecoderConfig();
      if (!config) throw new Error("Failed to get decoder config");

      decoder.configure(config);
      const sink = new EncodedPacketSink(videoTrack);
      for await (const packet of sink.packets()) {
        signal.throwIfAborted();
        decoder.decode(packet.toEncodedVideoChunk());
      }

      await decoder.flush();
      if (decoderError) throw decoderError;
      signal.throwIfAborted();

      frames.sort((a, b) => a.timestamp - b.timestamp);
      this._frames = frames;
    } catch (err) {
      for (const frame of frames) frame.close();
      if (this._destroyed) return;

      console.error("Failed to decode:", err);
      this._failed = true;
    } finally {
      decoder.close();
    }
  }
}
