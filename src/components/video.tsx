import { useMemo } from "react";
import Map, { useControl, type ViewState } from "react-map-gl/maplibre";
import { TileLayer, BitmapLayer, _Tileset2D } from "deck.gl";
import { MapboxOverlay, type MapboxOverlayProps } from "@deck.gl/mapbox";

import { FrameDecoder } from "../lib/decoder";
// import { load } from "@loaders.gl/core";
// import { VideoLoader } from "@loaders.gl/video";

function DeckGLOverlay(props: MapboxOverlayProps) {
  const overlay = useControl<MapboxOverlay>(() => new MapboxOverlay(props));
  overlay.setProps(props);
  return null;
}
const INITIAL_VIEW_STATE: ViewState = {
  longitude: -40,
  latitude: 20,
  zoom: 1,
  pitch: 0,
  bearing: 0,
  padding: { top: 0, bottom: 0, left: 0, right: 0 },
};

type TileData = {
  decoder: FrameDecoder;
};

// Custom refinement strategy that destroys decoders for non-visible tiles
const customRefinementStrategy = (tiles: _Tileset2D["tiles"]) => {
  for (const tile of tiles) {
    if (!tile.isVisible) {
      if (tile.data && "decoder" in tile.data) {
        const { decoder } = tile.data;
        decoder.destroy();
      }
    }
  }
};

type MapVideoContainerProps = {
  frame: number;
};

export const MapVideoContainer = ({ frame }: MapVideoContainerProps) => {
  const LAYERS = useMemo(() => {
    return [
      new TileLayer<TileData | undefined, { frame: number }>({
        id: "video-tiles",
        // data: "http://localhost:8000/video_tile/WebMercatorQuad/{z}/{x}/{y}.webm?url=https://atlantis-vis-o.s3-ext.jc.rl.ac.uk/nemotest101/T1d/sos_abs.zarr&variable=sos_abs&sel_method=nearest&colormap_name=jet&rescale=30,37&sel=time_counter=2000-01-01&sel=time_counter=2000-01-02&sel=time_counter=2000-01-03&sel=time_counter=2000-01-04&sel=time_counter=2000-01-05&sel=time_counter=2000-01-06&sel=time_counter=2000-01-07&sel=time_counter=2000-01-08&sel=time_counter=2000-01-09&sel=time_counter=2000-01-10&sel=time_counter=2000-01-11&sel=time_counter=2000-01-12&sel=time_counter=2000-01-13&sel=time_counter=2000-01-14&sel=time_counter=2000-01-15&sel=time_counter=2000-01-16&sel=time_counter=2000-01-17&sel=time_counter=2000-01-18&sel=time_counter=2000-01-19&sel=time_counter=2000-01-20&sel=time_counter=2000-01-21&sel=time_counter=2000-01-22&sel=time_counter=2000-01-23&sel=time_counter=2000-01-24&sel=time_counter=2000-01-25&sel=time_counter=2000-01-26&sel=time_counter=2000-01-27&sel=time_counter=2000-01-28&sel=time_counter=2000-01-29&sel=time_counter=2000-01-30&sel=time_counter=2000-01-31&sel=time_counter=2000-02-01&sel=time_counter=2000-02-02&sel=time_counter=2000-02-03&sel=time_counter=2000-02-04&sel=time_counter=2000-02-05&sel=time_counter=2000-02-06&sel=time_counter=2000-02-07&sel=time_counter=2000-02-08&sel=time_counter=2000-02-09&sel=time_counter=2000-02-10&sel=time_counter=2000-02-11&sel=time_counter=2000-02-12&sel=time_counter=2000-02-13&sel=time_counter=2000-02-14&sel=time_counter=2000-02-15&sel=time_counter=2000-02-16&sel=time_counter=2000-02-17&sel=time_counter=2000-02-18&sel=time_counter=2000-02-19&sel=time_counter=2000-02-20&sel=time_counter=2000-02-21&sel=time_counter=2000-02-22&sel=time_counter=2000-02-23&sel=time_counter=2000-02-24&sel=time_counter=2000-02-25&sel=time_counter=2000-02-26&sel=time_counter=2000-02-27&sel=time_counter=2000-02-28&sel=time_counter=2000-02-29&sel=time_counter=2000-03-01&sel=time_counter=2000-03-02&sel=time_counter=2000-03-03&sel=time_counter=2000-03-04&sel=time_counter=2000-03-05&sel=time_counter=2000-03-06&sel=time_counter=2000-03-07&sel=time_counter=2000-03-08&sel=time_counter=2000-03-09&sel=time_counter=2000-03-10&sel=time_counter=2000-03-11&sel=time_counter=2000-03-12&sel=time_counter=2000-03-13&sel=time_counter=2000-03-14&sel=time_counter=2000-03-15&sel=time_counter=2000-03-16&sel=time_counter=2000-03-17&sel=time_counter=2000-03-18&sel=time_counter=2000-03-19&sel=time_counter=2000-03-20&sel=time_counter=2000-03-21&sel=time_counter=2000-03-22&sel=time_counter=2000-03-23&sel=time_counter=2000-03-24&sel=time_counter=2000-03-25&sel=time_counter=2000-03-26&sel=time_counter=2000-03-27&sel=time_counter=2000-03-28&sel=time_counter=2000-03-29&sel=time_counter=2000-03-30&sel=time_counter=2000-03-31&sel=time_counter=2000-04-01&sel=time_counter=2000-04-02&sel=time_counter=2000-04-03&sel=time_counter=2000-04-04&sel=time_counter=2000-04-05&sel=time_counter=2000-04-06&sel=time_counter=2000-04-07&sel=time_counter=2000-04-08&sel=time_counter=2000-04-09",
        // data: "https://storage.googleapis.com/skydipper_materials/movie-tiles/EVI_TEST/{z}/{x}/{y}.mp4",
        data: "/sos_abs_webm/{z}/{x}/{y}.webm",
        tileSize: 512,
        minZoom: 0,
        maxZoom: 5,
        frame: frame,
        debounceTime: 200,
        maxCacheSize: 0, // Disable deck.gl tile cache
        refinementStrategy: customRefinementStrategy,
        getTileData: async (props) => {
          if (!props.url) return undefined;

          // const video = await load(props.url, VideoLoader);
          const frameDecoder = new FrameDecoder();
          await frameDecoder.init(props.url);

          return { decoder: frameDecoder };
        },
        onTileUnload: async (tile) => {
          if (!tile.data) return;

          if ("decoder" in tile.data) {
            const { decoder } = tile.data;
            decoder.destroy();
          }
        },

        renderSubLayers: (props) => {
          if (!props) return null;

          if (!props.visible) {
            return null;
          }

          const { boundingBox } = props.tile;
          const typedProps = props as typeof props & { frame: number };

          const tileData = props.data;
          if (!tileData) {
            console.log("No tile data yet");
            return null;
          }

          const { decoder } = tileData;

          // Create a new canvas for this frame to get a new object reference
          const canvas = document.createElement("canvas");
          canvas.width = props.tileSize ?? 256;
          canvas.height = props.tileSize ?? 256;
          const ctx = canvas.getContext("2d");

          if (!ctx) {
            console.log("No canvas context");
            return null;
          }

          // Draw the specific frame by index
          const drawn = decoder.drawFrameByIndex(
            typedProps.frame,
            ctx,
            canvas.width,
            canvas.height,
          );

          if (!drawn) {
            console.log("Failed to draw frame:", typedProps.frame);
            return null;
          }

          return new BitmapLayer({
            id: props.id,
            data: undefined,
            image: canvas,
            tileSize: 256,
            textureParameters: {
              minFilter: "nearest",
              magFilter: "nearest",
            },
            bounds: [
              boundingBox[0][0],
              boundingBox[0][1],
              boundingBox[1][0],
              boundingBox[1][1],
            ],
          });
        },
      }),
    ];
  }, [frame]);

  return (
    <Map
      id="map"
      initialViewState={INITIAL_VIEW_STATE}
      mapStyle="https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json"
    >
      <DeckGLOverlay layers={LAYERS} interleaved />
    </Map>
  );
};
