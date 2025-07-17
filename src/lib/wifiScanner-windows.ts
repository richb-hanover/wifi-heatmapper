import {
  PartialHeatmapSettings,
  WifiResults,
  WifiScanResults,
  WifiActions,
  SPAirPortRoot,
} from "./types";import { execAsync } from "./server-utils";
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
      response.SSIDs = getCandidateSSIDs(jsonResults, currentIf);
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
    let reason: string = "";
    let netInfo: WifiResults;

    if (!wifiSettings) {
      response.reason = `setWifi error: Empty SSID "${JSON.stringify(wifiSettings)}`;
      return response;
    }
    try {
      // save the global copy of the WifiResults
      setSSID(wifiSettings);

      console.log(
        `Setting Wifi SSID on interface ${this.nameOfWifi}: ${wifiSettings.ssid}`,
      );
      try {
        await execAsync(
          `networksetup -setairportnetwork ${this.nameOfWifi} ${wifiSettings.ssid}`,
        );
      } catch (err) {
        setSSID(null);
        response.reason = `Cannot connect to SSID ${wifiSettings.ssid}: ${err}`;
        // console.log(`${response.reason}`);
        return response;
      }
      const start = Date.now();
      const timeDelay = 20000; // 20 seconds
      while (start + timeDelay > Date.now()) {
        netInfo = await this.getWdutilResults(settings);
        // console.log(`wdutil results: txRate is ${netInfo.txRate}`);
        if (netInfo.txRate != 0) {
          response.SSIDs.push(netInfo);
          break;
        }
        await delay(200);
      }
      if (Date.now() >= start + timeDelay) {
        reason = `Timed out attempting to set Wifi to ${wifiSettings}`;
      }
    } catch (err) {
      reason = `Can't set wifi to ${wifiSettings}: ${err}`;
    }
    response.reason = reason;
    // console.log(`setWifi return: ${JSON.stringify(response)}`);
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
    try {
      const netInfo: WifiResults = await this.getWdutilResults(settings);
      const wifiResults = getSSID(); // SSID we tried to set
      // if the returned SSID contains "redacted" use the "global SSID"
      if (wifiResults != null && netInfo.ssid.includes("redacted")) {
        netInfo.ssid = wifiResults.ssid;
      }
      response.SSIDs.push(netInfo);
    } catch (err) {
      response.reason = `Can't getWifi: ${err}`;
    }
    return response;
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
