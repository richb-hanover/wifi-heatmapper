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
  band: number; // frequency band - 2.4 or 5 (GHz)
  // frequency: number; // exact frequency (as number) - xxxx GHz
  // v4router: string; // v4router (and v6router) unlikely to be useful
  // v6router: string; // if there are extenders/dumb APs
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
  sudoerPassword: string; // kept in settings, removed before writing to file
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
 * SurveyResults - returned from runSurveyTests()
 */
export interface SurveyResults {
  wifiData: WifiResults;
  iperfData: IperfResults;
}

/**
 * WifiScanResults - array of available SSIDs, plus a reason
 */
export interface WifiScanResults {
  SSIDs: WifiResults[];
  reason: string;
}

/**
 * TaskStatus - status of the wifi survey process
 */
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
  checkIperfServer(settings: PartialHeatmapSettings): Promise<string>; // returns "" or an error message
  restartWifi(settings: PartialHeatmapSettings): Promise<void>; // "blink" the wifi
  scanWifi(settings: PartialHeatmapSettings): Promise<WifiResults>; // get measurements
}

/**
 * Definitions for SPAirPortDataType - ChatGPT derived the structure from the
 *    output of system_profiler -json SPAirPortDataType
 */

export interface AirportNetwork {
  _name: string;
  spairport_network_bssid: string;
  spairport_network_channel: number | string;
  spairport_network_country_code?: string;
  spairport_network_phymode: string;
  spairport_network_type: string;
  spairport_security_mode: string;
  spairport_signal_noise: string;
}

export interface AirportCurrentNetworkInformation extends AirportNetwork {
  spairport_network_mcs?: number;
  spairport_network_rate?: number;
}

export interface AirportInterface {
  _name: string;
  spairport_airdrop_channel?: number;
  spairport_airport_other_local_wireless_networks: AirportNetwork[];
  spairport_caps_airdrop?: string;
  spairport_caps_autounlock?: string;
  spairport_current_network_information?: AirportCurrentNetworkInformation;
  spairport_status_information?: string;
  spairport_supported_channels?: (number | string)[];
  spairport_supported_phymodes?: string;
  spairport_wireless_card_type?: string;
  spairport_wireless_country_code?: string;
  spairport_wireless_firmware_version?: string;
  spairport_wireless_locale?: string;
  spairport_wireless_mac_address?: string;
}

export interface SPAirPortSoftwareInformation {
  spairport_corewlan_version?: string;
  spairport_corewlankit_version?: string;
  spairport_diagnostics_version?: string;
  spairport_extra_version?: string;
  spairport_family_version?: string;
  spairport_profiler_version?: string;
  spairport_utility_version?: string;
}

export interface SPAirPortEntry {
  spairport_airport_interfaces: AirportInterface[];
  spairport_software_information?: SPAirPortSoftwareInformation;
}

export interface SPAirPortRoot {
  TestDescriptionDEADBEEF: string; // used to describe test conditions for this data
  SPAirPortDataType: SPAirPortEntry[];
}
