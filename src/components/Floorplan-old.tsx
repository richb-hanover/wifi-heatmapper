import React from "react";
import { Loader } from "./Loader";
import PopupDetails from "./PopupDetails";
import { rssiToPercentage } from "../lib/utils";
import { useSettings } from "./GlobalSettings";
// import SurveyPointsTable from "./PointsTable";
import { SurveyPoint } from "../lib/types";
// interface ClickableFloorplanProps {

export const ClickableFloorplan = () =>
  // {
  // image,
  // points,
  // onPointClick,
  // dimensions,
  // setDimensions,
  // apMapping,
  // status,
  // onDelete,
  // updateDatapoint,
  // }
  {
    // const [imageLoaded, setImageLoaded] = useState(false);
    // const imageRef = useRef<HTMLImageElement | null>(null);
    // const canvasRef = useRef<HTMLCanvasElement>(null);
    // const containerRef = useRef<HTMLDivElement>(null);
    // const [selectedPoint, setSelectedPoint] = useState<SurveyPoint | null>(
    //   null,
    // );
    // const [popupPosition, setPopupPosition] = useState({ x: 0, y: 0 });
    // const [scale, setScale] = useState(1);
    const { settings, updateSettings } = useSettings();
    const dimensions = { width: 0, height: 0 };
    const imageLoaded = false;
    const imageRef: HTMLImageElement | null = null;

    // useEffect(() => {
    //   if (settings.floorplanImagePath != "") {
    //     const img = new Image();
    //     img.onload = () => {
    //       dimensions = { width: img.width, height: img.height };
    //       imageLoaded = true;
    //       imageRef = img;
    //     };
    //     img.src = settings.floorplanImagePath; // load the image from the path
    //   }
    // }, [image, setDimensions]);

    // useEffect(() => {
    //   if (imageLoaded && canvasRef.current) {
    //     const canvas = canvasRef.current;
    //     const containerWidth =
    //       containerRef.current?.clientWidth || canvas.width;
    //     const scaleX = containerWidth / dimensions.width;
    //     setScale(scaleX);
    //     canvas.style.width = "100%";
    //     canvas.style.height = "auto";
    //     drawCanvas();
    //   }
    // }, [imageLoaded, dimensions]);

    // Convert a number of bits (typically megabits) into a string
    // function megabits(value: number): string {
    //   return `${(value / 1000000).toFixed(0)}`;
    // }
    // Takes a percentage signal strength
    // returns a rgba() giving a color gradient between red (100%) and blue (0%)
    function getGradientColor(value: number): string {
      // Define key color points
      const colorStops: {
        value: number;
        color: [number, number, number, number];
      }[] = [
        { value: 100, color: [255, 0, 0, 1] }, // Red
        { value: 75, color: [255, 255, 0, 1] }, // Yellow
        { value: 50, color: [0, 255, 0, 1] }, // Green
        { value: 35, color: [0, 255, 255, 1] }, // Turquoise
        { value: 0, color: [0, 0, 255, 1] }, // Blue
        // Color experiment - Green is good, blue is OK, red and yellow are bad
        // the following values don't quite work...
        // { value: 100, color: [0, 255, 0, 1] }, // Green
        // { value: 75, color: [0, 255, 255, 1] }, // Turquoise
        // { value: 50, color: [0, 0, 255, 1] }, // Blue
        // { value: 45, color: [255, 255, 255, 1] }, // Grey
        // { value: 40, color: [255, 255, 0, 1] }, // Yellow
        // { value: 0, color: [255, 0, 0, 1] }, // Red
      ];

      // Handle out-of-range values
      value = Math.min(100, value);
      value = Math.max(0, value);

      // Find the two closest stops
      let lowerStop = colorStops[colorStops.length - 1];
      let upperStop = colorStops[0];

      for (let i = 0; i < colorStops.length - 1; i++) {
        if (value <= colorStops[i].value && value >= colorStops[i + 1].value) {
          lowerStop = colorStops[i + 1];
          upperStop = colorStops[i];
          break;
        }
      }

      // Normalize value to a range between 0 and 1
      const t = (value - lowerStop.value) / (upperStop.value - lowerStop.value);

      // Interpolate RGB values
      const r = Math.round(
        lowerStop.color[0] + t * (upperStop.color[0] - lowerStop.color[0]),
      );
      const g = Math.round(
        lowerStop.color[1] + t * (upperStop.color[1] - lowerStop.color[1]),
      );
      const b = Math.round(
        lowerStop.color[2] + t * (upperStop.color[2] - lowerStop.color[2]),
      );

      return `rgba(${r}, ${g}, ${b}, 1.0)`; // Always return full opacity
    }

    // Example usage
    // console.log(getGradientColor(100)); // [255, 0, 0, 1] (Red)
    // console.log(getGradientColor(75)); // [255, 255, 0, 1] (Yellow)
    // console.log(getGradientColor(50)); // [0, 255, 0, 1] (Green)
    // console.log(getGradientColor(-25)); // [0, 255, 255, 1] (Turquoise)
    // console.log(getGradientColor(0)); // [0, 0, 255, 1] (Blue)
    // console.log(getGradientColor(63)); // Interpolated color between Green and Yellow
    // console.log(getGradientColor(-10)); // Interpolated color between Turquoise and Blue

    const drawCanvas = () => {
      const canvas = canvasRef.current;
      if (canvas && imageRef.current) {
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(imageRef.current, 0, 0);

          drawPoints(ctx, points);
        }
      }
    };

    // useEffect(() => {
    //   let animationFrameId: number;

    //   const animate = () => {
    //     drawCanvas();
    //     animationFrameId = requestAnimationFrame(animate);
    //   };

    //   animate();

    //   return () => {
    //     cancelAnimationFrame(animationFrameId);
    //   };
    // }, [points, dimensions, apMapping]);

    const drawPoints = (ctx: any, points: SurveyPoint[]) => {
      points.forEach((point, index) => {
        const i = index;
        // Create a gradient for the point
        // const gradient = ctx.createRadialGradient(
        //   point.x,
        //   point.y,
        //   0,
        //   point.x,
        //   point.y,
        //   8,
        // );
        // gradient.addColorStop(
        //   0,
        //   point.isDisabled
        //     ? "rgba(156, 163, 175, 0.9)"
        //     : "rgba(59, 130, 246, 0.9)",
        // );
        // gradient.addColorStop(
        //   1,
        //   point.isDisabled
        //     ? "rgba(75, 85, 99, 0.9)"
        //     : "rgba(37, 99, 235, 0.9)",
        // );
        // Enhanced pulsing effect
        // const pulseMaxSize = 20; // Increased from 8
        // const pulseMinSize = 10; // New minimum size
        // const pulseSize =
        //   pulseMinSize +
        //   ((Math.sin(Date.now() * 0.001 + index) + 1) / 2) *
        //     (pulseMaxSize - pulseMinSize);

        // Draw outer pulse
        // ctx.beginPath();
        // ctx.arc(point.x, point.y, pulseSize, 0, 2 * Math.PI);
        // ctx.fillStyle = point.isDisabled
        //   ? `rgba(75, 85, 99, ${0.4 - ((pulseSize - pulseMinSize) / (pulseMaxSize - pulseMinSize)) * 0.3})`
        //   : `rgba(59, 130, 246, ${0.4 - ((pulseSize - pulseMinSize) / (pulseMaxSize - pulseMinSize)) * 0.3})`;
        // ctx.fill();

        if (point.wifiData) {
          const wifiInfo = point.wifiData;
          const iperfInfo = point.iperfResults;
          const frequencyBand = wifiInfo.channel > 14 ? "5GHz" : "2.4GHz";
          // const apLabel =
          //   apMapping.find((ap) => ap.macAddress === wifiInfo.bssid)
          //     ?.apName ?? wifiInfo.bssid + " " + wifiInfo.rssi;
          // const annotation = `${frequencyBand}\n${apLabel}`;

          // Draw the main point
          ctx.beginPath();
          ctx.arc(point.x, point.y, 8, 0, 2 * Math.PI);
          ctx.fillStyle = point.isDisabled
            ? "rgba(156, 163, 175, 0.9)"
            : getGradientColor(rssiToPercentage(wifiInfo.rssi));
          ctx.fill();

          // Draw a white border
          ctx.strokeStyle = "grey";
          ctx.lineWidth = 2;
          ctx.stroke();
          // const t = getGradientColor(rssiToPercentage(wifiInfo.rssi));

          const annotation = `${rssiToPercentage(wifiInfo.rssi)}%`;
          // These are no longer displayed
          // annotation += ` (${wifiInfo.rssi}dBm`;
          // annotation += ` ${frequencyBand})`;
          // annotation += `\n`;
          // annotation += `${megabits(iperfInfo.tcpDownload.bitsPerSecond)} / `;
          // annotation += `${megabits(iperfInfo.tcpUpload.bitsPerSecond)} `;
          // annotation += `Mbps`;
          // annotation += `\n${t}`;
          // annotation += `${megabits(iperfInfo.udpDownload.bitsPerSecond)} / `;
          // annotation += `${megabits(iperfInfo.udpUpload.bitsPerSecond)} `;

          ctx.font = "12px Arial";
          const lines = annotation.split("\n");
          const lineHeight = 14;
          const padding = 4;
          const boxWidth =
            Math.max(...lines.map((line) => ctx.measureText(line).width)) +
            padding * 2;
          const boxHeight = lines.length * lineHeight + padding * 2;

          // Draw shadow
          ctx.shadowColor = "rgba(0, 0, 0, 0.2)";
          ctx.shadowBlur = 4;
          ctx.shadowOffsetX = 2;
          ctx.shadowOffsetY = 2;

          // Draw bounding box with increased transparency
          ctx.fillStyle = "rgba(255, 255, 255, 0.6)";
          ctx.fillRect(
            point.x - boxWidth / 2,
            point.y + 15,
            boxWidth,
            boxHeight,
          );

          // Reset shadow for text
          ctx.shadowColor = "transparent";
          ctx.shadowBlur = 0;
          ctx.shadowOffsetX = 0;
          ctx.shadowOffsetY = 0;

          // Draw text
          ctx.fillStyle = "#1F2937";
          ctx.textAlign = "center";
          ctx.textBaseline = "top";

          // gradient.addColorStop(
          //   0,
          //   point.isDisabled
          //     ? "rgba(156, 163, 175, 0.9)"
          //     : getGradientColor(rssiToPercentage(wifiInfo.rssi)),
          // );

          // // Re-draw the main point
          // ctx.beginPath();
          // ctx.arc(point.x, point.y, 6, 0, 2 * Math.PI);
          // ctx.fillStyle = gradient;
          // ctx.fill();

          lines.forEach((line, index) => {
            ctx.fillText(
              line,
              point.x,
              point.y + 15 + padding + index * lineHeight,
            );
          });
        }
      });

      const handleCanvasClick = (
        event: React.MouseEvent<HTMLCanvasElement>,
      ) => {
        if (selectedPoint) {
          setSelectedPoint(null);
          return;
        }

        const canvas = event.currentTarget;
        const rect = canvas.getBoundingClientRect();
        const x = (event.clientX - rect.left) / scale;
        const y = (event.clientY - rect.top) / scale;

        const clickedPoint = points.find(
          (point) => Math.sqrt((point.x - x) ** 2 + (point.y - y) ** 2) < 10,
        );

        if (clickedPoint) {
          setSelectedPoint(selectedPoint == clickedPoint ? null : clickedPoint);
          setPopupPosition({
            x: clickedPoint.x * scale,
            y: clickedPoint.y * scale,
          });
        } else {
          setSelectedPoint(null);
          // if we don't round, everything breaks, as heatmap cannot handle floating point numbers
          // for coordinates
          onPointClick(Math.round(x), Math.round(y));
        }
      };

      if (!imageLoaded) {
        return (
          <div className="flex items-center justify-center h-64 bg-gray-100 rounded-lg">
            Loading...
          </div>
        );
      }

      return (
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-2xl font-semibold text-gray-800">
            Interactive Floorplan
          </h2>
          <div className="p-2 rounded-md text-sm">
            <p>Click on the plan to start a new measurement</p>
            <p>
              Click on existing points to see the measurement details. You need
              at least two active (not disabled) measurements.
            </p>
            <div className="space-y-2 flex flex-col">
              {points?.length > 0 && (
                <div>Total Measurements: {points.length}</div>
              )}
            </div>
          </div>
          <div className="relative" ref={containerRef}>
            <div
              className={`absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 rounded-lg ${
                status === "running" ? "" : "hidden"
              }`}
            >
              <div className="flex flex-col items-center">
                <Loader className="w-24 h-24 text-blue-500" />
                <p className="text-white text-lg font-medium">Running...</p>
              </div>
            </div>
            <canvas
              ref={canvasRef}
              width={dimensions.width}
              height={dimensions.height}
              onClick={handleCanvasClick}
              className="border border-gray-300 rounded-lg cursor-pointer"
            />
            {selectedPoint && (
              <div
                style={{
                  position: "absolute",
                  left: `${popupPosition.x}px`,
                  top: `${popupPosition.y}px`,
                  transform: "translate(10px, -50%)",
                }}
              >
                <PopupDetails
                  point={selectedPoint}
                  apMapping={apMapping}
                  onClose={() => setSelectedPoint(null)}
                  updateDatapoint={updateDatapoint}
                  onDelete={(ids) => {
                    onDelete(ids);
                    setSelectedPoint(null);
                  }}
                />
              </div>
            )}
          </div>
        </div>
      );
    };
  };
