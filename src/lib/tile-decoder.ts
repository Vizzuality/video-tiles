import { EncodedPacketSink, Input, ALL_FORMATS, UrlSource } from "mediabunny";


export class TileDecoder {
  private _frames: VideoFrame[] = [];
  private _initPromise: Promise<void> | null = null;
  private _failed = false;

  get failed(): boolean {
    return this._failed;
  }

  get ready(): Promise<void> {
    return this._initPromise ?? Promise.resolve();
  }

  get frameCount(): number {
    return this._frames.length;
  }

  init(url: string): void {
    if (this._initPromise) return;
    this._initPromise = this._decode(url).catch((err) => {
      console.error("Failed to decode:", err);
      this._failed = true;
    });
  }

  getFrame(index: number): VideoFrame | undefined {
    return this._frames[index];
  }

  destroy(): void {
    for (const frame of this._frames) frame.close();
    this._frames = [];
  }

  private async _decode(url: string): Promise<void> {
    const frames: VideoFrame[] = [];
    const decoder = new VideoDecoder({
      output: (frame) => frames.push(frame),
      error: (e) => console.error("Decode error:", e),
    });

    const input = new Input({
      source: new UrlSource(url),
      formats: ALL_FORMATS,
    });

    const videoTrack = await input.getPrimaryVideoTrack();
    if (!videoTrack) throw new Error("No video track found");
    const config = await videoTrack.getDecoderConfig();
    if (!config) throw new Error("Failed to get decoder config");

    decoder.configure(config);

    const sink = new EncodedPacketSink(videoTrack);
    for await (const packet of sink.packets()) {
      decoder.decode(packet.toEncodedVideoChunk());
    }
    await decoder.flush();
    decoder.close();

    frames.sort((a, b) => a.timestamp - b.timestamp);

    this._frames = frames;
  }
}
