import { useState } from "react";
import { MapVideoMaplibre } from "./components/video-maplibre";
import { Slider } from "./components/ui/slider";
import { useInterval } from "usehooks-ts";

const TOTAL_FRAMES = 182;

function App() {
  const [frame, setFrame] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);

  useInterval(
    () => {
      setFrame((prevFrame) => (prevFrame + 1) % TOTAL_FRAMES);
    },
    isPlaying ? 50 : null,
  );

  const handleSliderChange = (values: number[]) => {
    setIsPlaying(false);
    setFrame(values[0]);
  };

  return (
    <div className="w-full h-full bg-gray-900 relative">
      <MapVideoMaplibre frame={frame} />

      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 w-96 bg-gray-800 p-4 rounded-lg shadow-lg">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className="text-white hover:text-gray-300 transition-colors"
            aria-label={isPlaying ? "Pause" : "Play"}
          >
            {isPlaying ? (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
              </svg>
            ) : (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M8 5v14l11-7z" />
              </svg>
            )}
          </button>
          <span className="text-white text-sm font-medium min-w-fit">
            Frame: {frame + 1}
          </span>
          <Slider
            value={[frame]}
            onValueChange={handleSliderChange}
            min={0}
            max={TOTAL_FRAMES - 1}
            step={1}
            className="flex-1"
          />
          <span className="text-white text-sm min-w-fit">{TOTAL_FRAMES}</span>
        </div>
      </div>
    </div>
  );
}

export default App;
