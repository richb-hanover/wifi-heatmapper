import {
  HeatmapSettings,
  PartialHeatmapSettings,
  WifiResults,
  WifiScanResults,
  WifiActions,
  SPAirPortRoot,
} from "./types";
import { execAsync } from "./server-utils";
import { getLogger } from "./logger";
import {
  getDefaultWifiNetwork,
  isValidMacAddress,
  normalizeMacAddress,
  percentageToRssi,
} from "./utils";
import { getReverseLookupMap } from "./localization";

const logger = getLogger("wifi-Windows");

export class WindowsWifiActions implements WifiActions {
  nameOfWifi: string = "";

  /**
   * preflightSettings - check whether the settings are "primed" to run a test
   * Tests:
   *   * iperfServerAdrs - non-empty
   *   * testDuration - greater than zero
   *   * sudoerPassword - non-empty and correct
   *
   * @param settings
   * @returns string - empty, or error message to display
   */
  async preflightSettings(
    settings: PartialHeatmapSettings,
  ): Promise<WifiScanResults> {
    const response: WifiScanResults = {
      SSIDs: [],
      reason: "",
    };
    let reason: string = "";
    // console.log(`partialSettings: ${JSON.stringify(settings)}`);
    // test duration must be > 0 - otherwise iperf3 runs forever
    if (settings.testDuration <= 0) {
      reason = "Test duration must be greater than zero.";
    }

    // iperfServerAddress must not be empty or ""
    else if (!settings.iperfServerAdrs) {
      reason = "Please set iperf3 server address";
    }

    // macOS requires a sudo password
    else if (!settings.sudoerPassword || settings.sudoerPassword == "") {
      reason = "Please set sudo password. It is required on macOS.";
    }

    // check that the sudo password is actually correct
    // execAsync() throws if there is an error
    else {
      try {
        await execAsync(`echo ${settings.sudoerPassword} | sudo -S ls`);
      } catch {
        reason = "Please enter a valid sudo password.";
      }
    }

    // fill in the reason and return it
    response.reason = reason;
    return response;
  }

  /**
   * checkIperfServer() - test if an iperf3 server is available at the address
   * @param settings includes the iperfServerAddress
   * @returns "" or error string
   */
  async checkIperfServer(
    settings: PartialHeatmapSettings,
  ): Promise<WifiScanResults> {
    const response: WifiScanResults = {
      SSIDs: [],
      reason: "",
    };
    let reason: string = "";
    // check that we can actually connect to the iperf3 server
    // command throws if there is an error
    try {
      await execAsync(`nc -vz ${settings.iperfServerAdrs} 5201`);
    } catch {
      reason = "Cannot connect to iperf3 server.";
    }
    response.reason = reason;
    return response;
  }

  /**
   * findWifi() - find the name of the wifi interface
   * save in an object variable
   * @returns name of (the first) wifi interface (string)
   */
  async findWifi(): Promise<string> {
    // logger.info(`Called findWifi():`);

    const { stdout } = await execAsync(
      'networksetup -listallhardwareports | grep -A 1 "Wi-Fi\\|Airport" | grep "Device" |  sed "s/Device: //"',
    );
    this.nameOfWifi = stdout;
    return stdout;
  }

  /**
   * findBestWifi() - return an array of available wifi SSIDs plus a reason string
   * These are sorted by the strongest RSSI
   */
  async findBestWifi(
    _settings: PartialHeatmapSettings,
  ): Promise<WifiScanResults> {
    const response: WifiScanResults = {
      SSIDs: [],
      reason: "",
    };
    // let stdout: string;
    let jsonResults: SPAirPortRoot;
    const currentIf = await this.findWifi();

    try {
      // Get the Wifi information from system_profiler
      const result = await execAsync(`system_profiler -json SPAirPortDataType`);
      jsonResults = JSON.parse(result.stdout);

      // jsonResults holds the Wifi environment from system_profiler
      // response.SSIDs = getCandidateSSIDs(jsonResults, currentIf);
      // console.log(`Local SSIDs: ${response.SSIDs.length}`);
      // console.log(`Local SSIDs: ${JSON.stringify(response.SSIDs, null, 2)}`);
    } catch (err) {
      response.reason = `Cannot get wifi info: ${err}"`;
    }
    // ======= FINALLY WE ARE DONE! =======
    return response;
  }

  /**
   * setWifi(settings, newSSID) - associate with the named SSID
   *
   * @param settings - same as always
   * @param wifiSettings - new SSID to associate with
   * @returns WifiScanResults - empty array of results, only the reason
   */
  async setWifi(
    settings: PartialHeatmapSettings,
    wifiSettings: WifiResults,
  ): Promise<WifiScanResults> {
    const response: WifiScanResults = {
      SSIDs: [],
      reason: "",
    };
    return response;
  }

  /**
   * getWifi - return the WifiResults for the currently-associated SSID
   * @param settings
   * @returns
   */
  async getWifi(settings: PartialHeatmapSettings): Promise<WifiScanResults> {
    const response: WifiScanResults = {
      SSIDs: [],
      reason: "",
    };

    return response;
  }
}
export async function blinkWifiWindows(
  settings: HeatmapSettings,
): Promise<void> {
  // toggle WiFi off and on to get fresh data
  console.error(`Toggling WiFi off & on - Windows ${settings.sudoerPassword}`);
}

/**
 * scanWifiWindows() scan the Wifi for Windows
 * @returns a WiFiNetwork description to be added to the surveyPoints
 */
export async function scanWifiWindows(): Promise<WifiResults> {
  const reverseLookupTable = await getReverseLookupMap();
  const command = "netsh wlan show interfaces";
  const { stdout } = await execAsync(command);
  logger.trace("NETSH output:", stdout);
  const parsed = parseNetshOutput(reverseLookupTable, stdout);
  logger.trace("Final WiFi data:", parsed);
  return parsed;
}

function assignWindowsNetworkInfoValue<K extends keyof WifiResults>(
  networkInfo: WifiResults,
  label: K,
  val: string,
) {
  const current = networkInfo[label];
  if (typeof current === "number") {
    networkInfo[label] = parseInt(val, 10) as any;
  } else {
    networkInfo[label] = val as any;
  }
}
/**
 * Parse the output of the `netsh wlan show interfaces` command.
 *
 * This code looks up the labels from the netsh... command
 * in a localization map that determines the proper label for the WifiNetwork
 */
export function parseNetshOutput(
  reverseLookupTable: Map<string, string>,
  output: string,
): WifiResults {
  const networkInfo = getDefaultWifiNetwork();
  const lines = output.split("\n");
  for (const line of lines) {
    const pos = line.indexOf(":");
    if (pos == -1) continue; // no ":"? Just ignore line
    const label = line.slice(0, pos - 1).trim(); // the label up to the ":"
    let val = line.slice(pos + 1).trim(); // string read from rest of the line
    const key = reverseLookupTable.get(label) ?? null; // key is the name of the property
    // console.log(`Looking up: ${label} ${key}`);
    if (key == "signalStrength") {
      val = val.replace("%", ""); // remove any "%"
    }
    if (key == "bssid") {
      val = normalizeMacAddress(val); // remove ":" or "-" to produce "############"
    }
    if (key != null) {
      // console.log(`Real label/val: ${key} ${val}`);
      assignWindowsNetworkInfoValue(networkInfo, key as keyof WifiResults, val);
    }
  }
  // Check to see if we got any of the important info
  // If not, ask if they could provide info...
  if (
    networkInfo.signalStrength == 0 ||
    networkInfo.channel == 0 ||
    networkInfo.txRate == 0
  ) {
    throw new Error(
      `Could not read Wi-Fi info. Perhaps wifi-heatmapper is not localized for your system. See https://github.com/hnykda/wifi-heatmapper/issues/26 for details.`,
    );
  }
  if (!isValidMacAddress(networkInfo.bssid)) {
    throw new Error(
      `Invalid BSSID when parsing netsh output: ${networkInfo.bssid}`,
    );
  }
  //update frequency band
  networkInfo.band = networkInfo.channel > 14 ? 5 : 2.4;
  networkInfo.rssi = percentageToRssi(networkInfo.signalStrength);

  return networkInfo;
}

const input = `...`; // place your multiline text here

interface BssidRecord {
  SSID: string;
  Authentication: string;
  BSSID: string;
  Signal: string;
  "Radio Type": string;
  Channel: string;
}

function parseNetshBssid(text: string): BssidRecord[] {
  const lines = text.split("\n");
  const results: BssidRecord[] = [];

  let currentSSID = "";
  let currentAuth = "";
  let currentBSSID = "";

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    const ssidMatch = line.match(/^SSID \d+ : (.+)$/);
    if (ssidMatch) {
      currentSSID = ssidMatch[1];
      currentAuth = ""; // Reset auth in case it's missing in next section
      continue;
    }

    const authMatch = line.match(/^Authentication\s+:\s+(.+)$/);
    if (authMatch) {
      currentAuth = authMatch[1];
      continue;
    }

    const bssidMatch = line.match(/^BSSID \d+\s+:\s+([0-9a-f:]+)$/i);
    if (bssidMatch) {
      currentBSSID = bssidMatch[1];

      const signal = lines[++i].trim().match(/^Signal\s+:\s+(.+)$/)?.[1] || "";
      const radio =
        lines[++i].trim().match(/^Radio type\s+:\s+(.+)$/)?.[1] || "";
      lines[++i]; // skip "Band"
      const channel =
        lines[++i].trim().match(/^Channel\s+:\s+(.+)$/)?.[1] || "";

      results.push({
        SSID: currentSSID,
        Authentication: currentAuth,
        BSSID: currentBSSID,
        Signal: signal,
        "Radio Type": radio,
        Channel: channel,
      });
    }
  }

  return results;
}

const parsed = parseNetshBssid(input);
console.log(JSON.stringify(parsed, null, 2));
