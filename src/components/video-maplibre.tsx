import { useEffect, useRef } from "react";
import Map, { useMap, type ViewState } from "react-map-gl/maplibre";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

import { VideoTileSource } from "../lib/video-tile-source";

try {
  maplibregl.addSourceType("video-tile", VideoTileSource);
} catch {
  // Already registered
}

const INITIAL_VIEW_STATE: ViewState = {
  longitude: -40,
  latitude: 20,
  zoom: 1,
  pitch: 0,
  bearing: 0,
  padding: { top: 0, bottom: 0, left: 0, right: 0 },
};

const SOURCE_ID = "video-tiles";
const LAYER_ID = "video-tile-layer";

function VideoFrameUpdater({
  frame,
}: {
  frame: number;
}) {
  const { current: map } = useMap();
  const sourceRef = useRef<VideoTileSource | null>(null);

  // Set up source + layer on map load
  useEffect(() => {
    if (!map) return;

    let cancelled = false;

    const setup = () => {
      if (cancelled) return;
      const m = map.getMap();

      if (m.getSource(SOURCE_ID)) return; // already added

      m.addSource(SOURCE_ID, {
        type: "video-tile",
        tiles: ["/sos_abs_webm/{z}/{x}/{y}.webm"],
        tileSize: 256,
        minzoom: 0,
        maxzoom: 5,
      } as any);

      m.addLayer({
        id: LAYER_ID,
        type: "raster",
        source: SOURCE_ID,
        paint: {
          "raster-opacity": 0.5,
          "raster-resampling": "nearest",
        },
      });

      sourceRef.current = m.getSource(SOURCE_ID) as VideoTileSource;
    };

    if (map.loaded()) {
      setup();
    } else {
      map.once("load", setup);
    }

    return () => {
      cancelled = true;
      sourceRef.current = null;
      const m = map.getMap();
      m.off("load", setup);
      if (m.getLayer(LAYER_ID)) m.removeLayer(LAYER_ID);
      if (m.getSource(SOURCE_ID)) m.removeSource(SOURCE_ID);
    };
  }, [map]);

  // Update frame
  useEffect(() => {
    sourceRef.current?.setFrame(frame);
  }, [frame]);

  return null;
}

type MapVideoMaplibreProps = {
  frame: number;
};

export const MapVideoMaplibre = ({ frame }: MapVideoMaplibreProps) => {
  return (
    <Map
      id="map"
      initialViewState={INITIAL_VIEW_STATE}
      mapStyle="https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json"
      projection="globe"
      maxTileCacheSize={0} 
    >
      <VideoFrameUpdater frame={frame} />
    </Map>
  );
};
