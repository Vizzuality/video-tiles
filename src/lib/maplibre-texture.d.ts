/**
 * Re-export of MapLibre's internal Texture class.
 *
 * Importing directly from "maplibre-gl/src/render/texture" causes TypeScript
 * to type-check all of MapLibre's internal .ts sources (which fail under
 * strict mode). This .js + .d.ts pair lets Vite resolve the actual runtime
 * class while TypeScript uses only the declaration below.
 */
export declare class Texture {
  context: unknown;
  size: [number, number];
  texture: WebGLTexture;
  format: number;
  useMipmap: boolean;
  constructor(
    context: unknown,
    image: TexImageSource,
    format: number,
    options?: { premultiply?: boolean; useMipmap?: boolean } | null,
  );
  update(
    image: TexImageSource,
    options?: { premultiply?: boolean; useMipmap?: boolean } | null,
    position?: { x: number; y: number },
  ): void;
  bind(filter: number, wrap: number, minFilter?: number | null): void;
  isSizePowerOfTwo(): boolean;
  destroy(): void;
}
