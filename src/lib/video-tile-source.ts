import { RasterTileSource } from "maplibre-gl";
import type { Source, Tile } from "maplibre-gl";
import { Texture } from "./maplibre-texture";
import { TileDecoder } from "./tile-decoder";
import { decodeQueue } from "./decode-queue";


function uploadVideoFrame(
  context: any,
  texture: Texture,
  frame: VideoFrame,
): void {
  const gl = context.gl as WebGL2RenderingContext;
  gl.bindTexture(gl.TEXTURE_2D, texture.texture);

  context.pixelStoreUnpackFlipY.set(false);
  context.pixelStoreUnpack.set(1);
  context.pixelStoreUnpackPremultiplyAlpha.set(true);

  const w = frame.displayWidth;
  const h = frame.displayHeight;
  const needsResize = !texture.size || texture.size[0] !== w || texture.size[1] !== h;

  if (needsResize) {
    texture.size = [w, h];
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, frame);
  } else {
    gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, gl.RGBA, gl.UNSIGNED_BYTE, frame);
  }

  context.pixelStoreUnpackFlipY.setDefault();
  context.pixelStoreUnpack.setDefault();
  context.pixelStoreUnpackPremultiplyAlpha.setDefault();
}

export class VideoTileSource extends RasterTileSource implements Source {
  private _currentFrame = 0;
  private _frameDirty = false;
  private _decoders = new Map<string, TileDecoder>();
  private _loadedTiles = new Set<any>();

  constructor(id: string, options: any, dispatcher: any, eventedParent: any) {
    super(id, options, dispatcher, eventedParent);
    (this as any).type = "video-tile";
  }

  async loadTile(tile: any): Promise<void> {
    const { z, x, y } = tile.tileID.canonical;
    const canonicalKey = `${z}/${x}/${y}`;

    let decoder = this._decoders.get(canonicalKey);
    if (!decoder) {
      const url = tile.tileID.canonical.url(this.tiles, this.map.getPixelRatio(), this.scheme);

      decoder = new TileDecoder();
      this._decoders.set(canonicalKey, decoder);

      await decodeQueue.enqueue(() => decoder!.init(url));
    }

    if (tile.aborted) {
      tile.state = "unloaded";
      return;
    }

    try {
      const frame = decoder.getFrame(this._currentFrame);
      if (!frame) {
        tile.state = "errored";
        return;
      }

      const context = this.map.painter.context;
      const gl = context.gl;
      tile.texture = this.map.painter.getTileTexture(frame.displayWidth);
      if (!tile.texture) {
        tile.texture = new Texture(
          context,
          { width: frame.displayWidth, height: frame.displayHeight, data: null } as any,
          gl.RGBA,
          { useMipmap: false },
        );
      }
      uploadVideoFrame(context, tile.texture, frame);

      // MapLibre's draw_raster always binds with LINEAR_MIPMAP_NEAREST, but
      // video textures never have mipmaps generated. Override bind to force
      // a non-mipmap min filter, preventing "incomplete texture" warnings.
      const origBind = tile.texture.bind;
      tile.texture.bind = function (f: number, w: number) {
        origBind.call(this, f, w);
      };

      tile.state = "loaded";
      this._loadedTiles.add(tile);
    } catch (err) {
      if (tile.aborted) return;
      tile.state = "errored";
      console.error(`Error loading tile ${canonicalKey}:`, err);
    }
  }

  /**
   * Called by MapLibre before each render. Uploads the current frame
   * bitmap to each tile's GPU texture.
   */
  prepare(): void {
    if (!this._frameDirty) return;

    const context = this.map.painter.context;
    for (const tile of this._loadedTiles) {
      if (!tile.texture) continue;

      const { z, x, y } = tile.tileID.canonical;
      const decoder = this._decoders.get(`${z}/${x}/${y}`);
      if (!decoder) continue;
      const frame = decoder.getFrame(this._currentFrame);
      if (!frame) continue;

      uploadVideoFrame(context, tile.texture, frame);
    }

    this._frameDirty = false;
  }

  setFrame(frame: number): void {
    if (this._currentFrame === frame) return;
    this._currentFrame = frame;
    this._frameDirty = true;
    this.map?.triggerRepaint();
  }

  async unloadTile(tile: any): Promise<void> {
    const { z, x, y } = tile.tileID.canonical;
    const canonicalKey = `${z}/${x}/${y}`;

    this._loadedTiles.delete(tile);
    const decoder = this._decoders.get(canonicalKey);
    if (decoder) {
      decoder.destroy();
      this._decoders.delete(canonicalKey);
    }

    super.unloadTile(tile);
  }

  async abortTile(tile: Tile): Promise<void> {
    const { z, x, y } = tile.tileID.canonical;
    const canonicalKey = `${z}/${x}/${y}`;
    
    this._loadedTiles.delete(tile);
    const decoder = this._decoders.get(canonicalKey);
    if (decoder) {
      decoder.destroy();
      this._decoders.delete(canonicalKey);
    }
  }

  onRemove(): void {
    super.onRemove();
    for (const decoder of this._decoders.values()) {
      decoder.destroy();
    }
    this._decoders.clear();
    this._loadedTiles.clear();
  }
}
