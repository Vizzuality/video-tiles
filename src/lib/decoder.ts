import { EncodedPacketSink, Input, ALL_FORMATS, UrlSource } from "mediabunny";

export class FrameDecoder {
  private encodedChunks: EncodedVideoChunk[] = [];
  private frameBuffer: Map<number, VideoFrame> = new Map();
  private decoderQueue: Map<number, PromiseWithResolvers<void>> = new Map();
  private decoder: VideoDecoder | null = null;

  private onError?: WebCodecsErrorCallback;
  private loading: boolean = false;

  private canvas: OffscreenCanvas | null = null;
  private ctx: OffscreenCanvasRenderingContext2D | null = null;

  /**
   * Draw a specific frame by index
   * @param frameIndex - The index of the frame to draw (0-based)
   * @param ctx - The canvas context to draw to
   * @param width - The width to draw
   * @param height - The height to draw
   */
  public drawFrameByIndex(
    frameIndex: number,
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
  ): boolean {
    if (!this.canvas || !this.ctx) return false;
    if (this.frameBuffer.size === 0) return false;

    // Get all frames sorted by timestamp
    const frames = Array.from(this.frameBuffer.entries()).sort(
      (a, b) => a[0] - b[0],
    );

    if (frameIndex < 0 || frameIndex >= frames.length) return false;

    const [, frame] = frames[frameIndex];

    // Draw to internal canvas
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.ctx.drawImage(frame, 0, 0, this.canvas.width, this.canvas.height);

    // Draw to target canvas
    ctx.drawImage(this.canvas, 0, 0, width, height);

    return true;
  }

  /**
   * Clean up resources and close the decoder
   */
  public destroy(): void {
    this.frameBuffer.forEach((frame) => frame.close());
    this.frameBuffer.clear();
    this.encodedChunks = [];
    this.decoderQueue.clear();
    this.decoder?.close();
    this.decoder = null;
  }

  private decodeChunkAt(index: number) {
    // Clamp the index to the valid range
    index = Math.min(Math.max(0, index), this.encodedChunks.length - 1);
    const chunk = this.encodedChunks[index];

    // add the chunk to the queue
    this.decoderQueue.set(chunk.timestamp, Promise.withResolvers<void>());
    this.decoder?.decode(chunk);
  }

  private frameCallback(frame: VideoFrame): void {
    this.decoderQueue.get(frame.timestamp)?.resolve();
    this.decoderQueue.delete(frame.timestamp);

    // Add frame to buffer
    if (!this.frameBuffer.has(frame.timestamp)) {
      this.frameBuffer.set(frame.timestamp, frame);
    } else {
      frame.close();
    }
  }

  /**
   * Initialize the decoder and demux the video
   * @param url - The URL of the video to decode
   */
  public async init(url: string) {
    if (this.loading) return;
    this.loading = true;

    const decoder = new VideoDecoder({
      output: this.frameCallback.bind(this),
      error: (error) => {
        console.error("VideoDecoder error:", error);
        this.onError?.(error);
      },
    });

    const input = new Input({
      source: new UrlSource(url),
      formats: ALL_FORMATS,
    });

    const videoTrack = await input.getPrimaryVideoTrack();
    if (!videoTrack) throw new Error("No video track found");

    this.canvas = new OffscreenCanvas(
      videoTrack.codedWidth,
      videoTrack.codedHeight,
    );
    this.ctx = this.canvas.getContext("2d")!;

    const config = await videoTrack.getDecoderConfig();
    if (!config) throw new Error("Failed to get decoder config");

    decoder.configure(config);

    this.encodedChunks = [];
    this.decoder = decoder;

    const sink = new EncodedPacketSink(videoTrack);

    for await (const packet of sink.packets()) {
      const chunk = packet.toEncodedVideoChunk();
      this.encodedChunks.push(chunk);
    }

    // Decode all frames
    for (let i = 0; i < this.encodedChunks.length; i++) {
      this.decodeChunkAt(i);
    }

    // // Flush the decoder to process all queued frames
    await decoder.flush();

    this.loading = false;
  }
}
