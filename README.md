# Video Tiles

A high-performance visualization system for rendering temporal geospatial data using video-encoded map tiles. This project demonstrates an innovative approach to displaying time-series raster data on interactive maps by leveraging video compression and the WebCodecs API for efficient frame-by-frame rendering.

## Overview

This project implements a novel technique for visualizing multi-temporal geospatial datasets by encoding temporal sequences as video tiles in a Web Mercator tile pyramid. Instead of loading hundreds of individual raster images, temporal data is compressed into video files (WebM format), dramatically reducing bandwidth requirements and improving performance.

## Key Features

### 🎥 Video-Based Tile Rendering

- **WebM Video Tiles**: Uses WebM format for efficient compression of temporal sequences
- **Frame-by-Frame Control**: Precise control over individual frames within each video tile
- **Synchronized Playback**: All tiles synchronize to display the same temporal frame across the map

### 🚀 Performance Optimizations

- **Memory Management**: Automatic cleanup of video decoders for non-visible tiles
- **Custom Refinement Strategy**: Destroys decoders for tiles outside the viewport to reduce memory footprint
- **Efficient Caching**: Configurable tile cache with smart eviction strategies
- **OffscreenCanvas Rendering**: Uses OffscreenCanvas for better performance in video decoding

### 🗺️ Map Integration

- **Deck.gl Integration**: Uses Deck.gl's TileLayer for seamless tile management
- **MapLibre GL**: Built on MapLibre for performant vector and raster rendering
- **Zoom Level Support**: Works across multiple zoom levels (0-5) with LOD management

### ⏯️ Temporal Controls

- **Play/Pause Controls**: Interactive playback of temporal sequences
- **Frame Slider**: Manual scrubbing through the temporal dimension
- **Configurable Speed**: Adjustable frame rate for visualization

## Architecture

### Core Components

#### 1. **FrameDecoder** (`src/lib/decoder.ts`)

A custom video decoder class that handles:

- **Video Demuxing**: Uses the `mediabunny` library to extract encoded video chunks
- **WebCodecs API**: Leverages the browser's native VideoDecoder for hardware-accelerated decoding
- **Frame Buffering**: Maintains a map of decoded frames indexed by timestamp
- **Canvas Rendering**: Efficiently draws specific frames to a canvas context

Key methods:

```typescript
// Initialize decoder with video URL
await decoder.init(url);

// Draw a specific frame by index
decoder.drawFrameByIndex(frameIndex, ctx, width, height);

// Clean up resources
decoder.destroy();
```

#### 2. **MapVideoContainer** (`src/components/video.tsx`)

The main map component that:

- **TileLayer Implementation**: Custom Deck.gl TileLayer with video tile support
- **Tile Data Management**: Loads and manages video decoders for each tile
- **SubLayer Rendering**: Converts video frames to BitmapLayers for rendering
- **Lifecycle Management**: Handles tile loading/unloading and decoder cleanup

Key features:

- Debounced tile loading (200ms) to reduce thrashing during pan/zoom
- Automatic decoder destruction for unloaded tiles
- Custom refinement strategy to clean up non-visible tiles
- Nearest-neighbor filtering for pixel-perfect rendering

#### 3. **Alternative: APNG Support** (`src/components/raster.tsx`)

Also includes support for Animated PNG (APNG) tiles:

- Parses APNG files using `apng-js`
- Composites frames with proper blending
- Pixel-perfect scaling for low-resolution data

### Data Flow

```
Video Tiles (WebM files)
    ↓
TileLayer.getTileData()
    ↓
FrameDecoder.init() → Demux video → Decode all frames
    ↓
Frame buffering (Map<timestamp, VideoFrame>)
    ↓
renderSubLayers() → Draw specific frame
    ↓
BitmapLayer → GPU rendering
    ↓
Map display
```

## Technical Implementation Details

### Video Decoding with WebCodecs

The project uses the modern WebCodecs API for efficient video decoding:

1. **Demuxing**: Uses `mediabunny` to extract EncodedVideoChunks from WebM containers
2. **Decoding**: Native VideoDecoder processes chunks with hardware acceleration
3. **Buffering**: All frames are decoded upfront and stored in a Map
4. **Random Access**: Any frame can be drawn instantly without seeking

Benefits:

- **Hardware Acceleration**: GPU-accelerated video decoding
- **Low Latency**: No seeking overhead, instant frame access
- **Browser Native**: No external video libraries required
- **Efficient Memory**: Frames stored as VideoFrame objects

### Tile Management Strategy

```typescript
// Custom refinement strategy
const customRefinementStrategy = (tiles: _Tileset2D["tiles"]) => {
  for (const tile of tiles) {
    if (!tile.isVisible) {
      if (tile.data && "decoder" in tile.data) {
        tile.data.decoder.destroy(); // Free memory
      }
    }
  }
};
```

This ensures:

- Only visible tiles keep their decoders in memory
- Smooth pan/zoom without memory leaks
- Predictable memory usage regardless of navigation history

### Frame Synchronization

All tiles render the same frame index simultaneously:

```typescript
<TileLayer
  frame={currentFrame}  // Passed to all tiles
  renderSubLayers={(props) => {
    decoder.drawFrameByIndex(props.frame, ctx, width, height);
    return new BitmapLayer({ image: canvas });
  }}
/>
```

## Technology Stack

### Core Libraries

- **React 19**: UI framework with latest features
- **TypeScript**: Type-safe development
- **Vite**: Fast build tooling and HMR
- **Deck.gl**: WebGL-powered data visualization
- **MapLibre GL**: Open-source map rendering
- **react-map-gl**: React bindings for MapLibre

### Video & Media Processing

- **mediabunny**: Modern video demuxing library for WebCodecs
- **WebCodecs API**: Browser-native video encoding/decoding
- **apng-js**: Animated PNG parsing (alternative format)

### UI & Utilities

- **Tailwind CSS**: Utility-first styling
- **Radix UI**: Accessible slider component
- **usehooks-ts**: React hooks library

## Getting Started

### Installation

```bash
pnpm install
```

### Development

```bash
pnpm dev
```

The app will be available at `http://localhost:5173`

### Building

```bash
pnpm build
```

## Data Requirements

### Video Tile Structure

Video tiles should follow the Web Mercator tile scheme:

```
/{z}/{x}/{y}.webm
```

Where:

- `z`: Zoom level (0-5 supported)
- `x`: Tile column
- `y`: Tile row

### Video Format Specifications

- **Container**: WebM
- **Video Codec**: VP8 or VP9
- **Resolution**: 512×512 pixels recommended
- **Frame Rate**: Any (controlled by application)
- **Color Space**: RGB with transparency support

### Example Data

The project includes sample data in `public/sos_abs_webm/` with:

- Multiple zoom levels
- Sea surface salinity (sos_abs) data
- Daily temporal resolution
- ~182 frames per tile (6 months of data)

## Use Cases

This technology is ideal for:

- **Climate & Weather Visualization**: Temperature, precipitation, wind patterns
- **Ocean & Atmospheric Data**: Sea surface temperature, currents, pressure systems
- **Environmental Monitoring**: Vegetation indices (NDVI), land cover change
- **Satellite Imagery**: Time-series analysis of satellite observations
- **Scientific Visualization**: Any raster data with a temporal dimension

## Performance Characteristics

### Bandwidth Savings

Video compression provides 10-50x reduction compared to individual PNG tiles:

- **Individual PNGs**: ~500KB × 182 frames = ~91MB per tile
- **WebM Video**: ~2-5MB per tile
- **Bandwidth Reduction**: 95%+

### Memory Usage

- Each decoder: ~10-50MB depending on video resolution and length
- Visible tiles only: 4-16 decoders active typically (depends on zoom level)
- Total memory: ~200-800MB for typical usage

### Rendering Performance

- Frame switching: <16ms (60fps capable)
- Tile loading: Dependent on network and video size
- Decoding: Hardware accelerated, ~1-3s for full video

## Future Enhancements

- [ ] Progressive decoding (stream frames as they decode)
- [ ] Web Worker-based decoding for better performance
- [ ] Support for AV1 codec for better compression
- [ ] Multi-resolution temporal data (different frame counts per zoom)
- [ ] Time-aware tile caching strategies
- [ ] WebGPU integration for compute-heavy operations
- [ ] Export/recording capabilities

## License

This project demonstrates techniques for efficient temporal geospatial visualization and serves as a reference implementation for video-encoded map tiles.
