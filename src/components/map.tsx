import { useMemo, useState } from "react";
import Map, { useControl, type ViewState } from "react-map-gl/maplibre";
import { TileLayer, BitmapLayer } from "deck.gl";
import { MapboxOverlay, type MapboxOverlayProps } from "@deck.gl/mapbox";

import parseAPNG from "apng-js";
import { useInterval } from "usehooks-ts";

function DeckGLOverlay(props: MapboxOverlayProps) {
  const overlay = useControl<MapboxOverlay>(() => new MapboxOverlay(props));
  overlay.setProps(props);
  return null;
}
const INITIAL_VIEW_STATE: ViewState = {
  longitude: -40,
  latitude: 20,
  zoom: 3,
  pitch: 0,
  bearing: 0,
  padding: { top: 0, bottom: 0, left: 0, right: 0 },
};

export const MapContainer = () => {
  const [frame, setFrame] = useState(0);

  useInterval(() => {
    setFrame((prevFrame) => (prevFrame + 1) % 11);
  }, 100);

  const LAYERS = useMemo(() => {
    return [
      new TileLayer<HTMLCanvasElement[] | undefined, { frame: number }>({
        id: "apng-tiles",
        data: "http://localhost:8000/video_tile/WebMercatorQuad/{z}/{x}/{y}.png?url=https://atlantis-vis-o.s3-ext.jc.rl.ac.uk/nemotest101/T1d/sos_abs.zarr&variable=sos_abs&sel_method=nearest&colormap_name=jet&rescale=30,37&sel=time_counter=2000-01-01&sel=time_counter=2000-01-02&sel=time_counter=2000-01-03&sel=time_counter=2000-01-04&sel=time_counter=2000-01-05&sel=time_counter=2000-01-06&sel=time_counter=2000-01-07&sel=time_counter=2000-01-08&sel=time_counter=2000-01-09&sel=time_counter=2000-01-10&sel=time_counter=2000-01-11",
        tileSize: 256,
        minZoom: 0,
        maxZoom: 7,
        frame: frame,
        getTileData: async (props) => {
          if (!props.url) return undefined;

          const response = await fetch(props.url);
          const arrayBuffer = await response.arrayBuffer();
          const apng = parseAPNG(arrayBuffer);

          if (apng instanceof Error) {
            console.error("Failed to parse APNG:", apng);
            return undefined;
          }

          // Create full-sized canvases for each frame, compositing them sequentially
          const fullFrames: HTMLCanvasElement[] = [];
          let previousCanvas: HTMLCanvasElement | null = null;

          for (const frame of apng.frames) {
            const canvas = document.createElement("canvas");
            canvas.width = apng.width;
            canvas.height = apng.height;
            const ctx = canvas.getContext("2d");

            if (ctx) {
              // Copy previous frame if it exists (for frame composition)
              if (previousCanvas) {
                ctx.drawImage(previousCanvas, 0, 0);
              }

              // Create image from the current frame
              await frame.createImage();
              const img = frame.imageElement;

              if (img) {
                // Draw the frame at its proper position
                ctx.drawImage(img, frame.left, frame.top);
              }
            }

            fullFrames.push(canvas);
            previousCanvas = canvas;
          }

          return fullFrames;
        },

        renderSubLayers: (props) => {
          if (!props) return null;

          const { boundingBox } = props.tile;
          const typedProps = props as typeof props & { frame: number };

          if (!props.data || !props.data[typedProps.frame]) return null;

          const canvas = props.data[typedProps.frame];

          if (canvas) {
            return new BitmapLayer({
              id: props.id,
              data: undefined,
              image: canvas,
              tileSize: 256,
              bounds: [
                boundingBox[0][0],
                boundingBox[0][1],
                boundingBox[1][0],
                boundingBox[1][1],
              ],
            });
          }

          return null;
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
