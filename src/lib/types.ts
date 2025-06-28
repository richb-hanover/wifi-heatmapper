export interface IperfTestProperty {
  bitsPerSecond: number;
  retransmits?: number;
  jitterMs: number | null;
  lostPackets: number | null;
  packetsReceived: number | null;
  signalStrength: number;
}
/**
 * WifiResults - the results from a Wi-Fi test
 */
export interface WifiResults {
  ssid: string;
  bssid: string;
  rssi: number; // dBm value
  signalStrength: number; // percentage of signal strength
  channel: number;
  security: string;
  txRate: number;
  phyMode: string;
  channelWidth: number;
  band: number; // frequency band - 2GHz or 5GHz
}

/**
 * IperfResults - results from an iperf3 test
 */
export interface IperfResults {
  tcpDownload: IperfTestProperty;
  tcpUpload: IperfTestProperty;
  udpDownload: IperfTestProperty;
  udpUpload: IperfTestProperty;
}
type IperfTestProperties = {
  [K in keyof IperfTestProperty]: K;
};

export const testProperties: IperfTestProperties = {
  bitsPerSecond: "bitsPerSecond",
  jitterMs: "jitterMs",
  lostPackets: "lostPackets",
  retransmits: "retransmits",
  packetsReceived: "packetsReceived",
  // signalstrength is included so generateAllHeatmaps() has all the properties in one object
  signalStrength: "signalStrength",
} as const;

export type TestTypes = {
  [K in keyof IperfResults | "signalStrength"]: K;
};

export const testTypes: TestTypes = {
  signalStrength: "signalStrength",
  tcpDownload: "tcpDownload",
  tcpUpload: "tcpUpload",
  udpDownload: "udpDownload",
  udpUpload: "udpUpload",
} as const;

export type MeasurementTestType = keyof TestTypes;

export interface ApMapping {
  apName: string;
  macAddress: string;
}
export type RGB = { r: number; g: number; b: number; a: number };
export type Gradient = Record<number, string>; // Maps 0-1 values to colors

export type HeatmapConfig = {
  radius: number;
  maxOpacity: number;
  minOpacity: number;
  blur: number;
  gradient: Record<string, string>;
};

/**
 * The full set of data for a particular background image
 * This is "global" to the entire GUI, and passed down as needed
 */
export interface HeatmapSettings {
  surveyPoints: SurveyPoint[];
  floorplanImageName: string; // name of the floorplan-filename
  floorplanImagePath: string; // path to the /media/floorplan-filename
  iperfServerAdrs: string;
  testDuration: number;
  sudoerPassword: string; // passed around, removed before writing to file
  apMapping: ApMapping[];
  nextPointNum: number;
  dimensions: { width: number; height: number };
  radiusDivider: number | null; // null - use calculated value
  maxOpacity: number;
  minOpacity: number;
  blur: number;
  gradient: Gradient;
}

/**
 * Settings passed to iperfRunner.ts
 */
export interface PartialHeatmapSettings {
  iperfServerAdrs: string;
  testDuration: number;
  sudoerPassword: string;
}

/**
 * SurveyPoint - all the information we have about a particular point
 */
export interface SurveyPoint {
  x: number;
  y: number;
  wifiData: WifiResults;
  iperfData: IperfResults;
  timestamp: number;
  id: string;
  isEnabled: boolean;
}

/**
 * Results from runSurveyTests()
 */
export interface SurveyResults {
  wifiData: WifiResults;
  iperfData: IperfResults;
}

type TaskStatus = "pending" | "done" | "error";
export interface SurveyResult {
  state: TaskStatus; // mimics states of Promise()
  results?: SurveyResults; // if "done", has the wifiData and iperfData
  explanation?: string; // if "error", this is the string to display
}

export type ScannerSettings = {
  sudoerPassword: string | "";
  wlanInterfaceId: string | "";
};

export type OS = "macos" | "windows" | "linux";

export interface SurveyPointActions {
  add: (newPoint: SurveyPoint) => void;
  update: (point: SurveyPoint, updatedData: Partial<SurveyPoint>) => void;
  delete: (points: SurveyPoint[]) => void;
}

// functions that handle platform-specific work
// pass PartialHeatmapSettings for the essential parameters
export interface WifiActions {
  // findWifi(): Promise<string>; // return the interface name
  preflightSettings(settings: PartialHeatmapSettings): Promise<string>; // returns "" or error message
  restartWifi(settings: PartialHeatmapSettings): Promise<void>; // "blink" the wifi
  scanWifi(settings: PartialHeatmapSettings): Promise<WifiResults>; // get measurements
}
