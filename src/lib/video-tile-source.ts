import { RasterTileSource } from "maplibre-gl";
import type { Source } from "maplibre-gl";
import { Texture } from "./maplibre-texture";
import { TileDecoder } from "./tile-decoder";


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

    tile.abortController = new AbortController();

    let decoder = this._decoders.get(canonicalKey);
    if (!decoder) {
      const url = tile.tileID.canonical.url(this.tiles, this.map.getPixelRatio(), this.scheme);
  
      decoder = new TileDecoder();
      decoder.init(url);
      this._decoders.set(canonicalKey, decoder);
    }

    try {
      await decoder.ready;

      if (tile.aborted || tile.abortController?.signal.aborted) return;
      if (decoder.failed) {
        tile.state = "errored";
        return;
      }

      const bitmap = decoder.getFrame(this._currentFrame);
      if (!bitmap) {
        tile.state = "errored";
        return;
      }

      const context = this.map.painter.context;
      const gl = context.gl;
      tile.texture = this.map.painter.getTileTexture(bitmap.width);
      if (tile.texture) {
        tile.texture.update(bitmap, { useMipmap: false });
      } else {
        tile.texture = new Texture(context, bitmap, gl.RGBA, { useMipmap: false });
      }
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

    for (const tile of this._loadedTiles) {
      if (!tile.texture) continue;

      const { z, x, y } = tile.tileID.canonical;
      const decoder = this._decoders.get(`${z}/${x}/${y}`);
      if (!decoder || decoder.failed) continue;
      const bitmap = decoder.getFrame(this._currentFrame);
      if (!bitmap) continue;

      tile.texture.update(bitmap, { useMipmap: false });
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

  onRemove(): void {
    super.onRemove();
    for (const decoder of this._decoders.values()) {
      decoder.destroy();
    }
    this._decoders.clear();
    this._loadedTiles.clear();
  }
}
