import {
  PartialHeatmapSettings,
  WifiResults,
  WifiScanResults,
  WifiActions,
} from "./types";
import { execAsync } from "./server-utils";
import { getLogger } from "./logger";
import {
  getDefaultWifiNetwork,
  isValidMacAddress,
  normalizeMacAddress,
  percentageToRssi,
  channelToBand,
} from "./utils";
import { initLocalization, getReverseLookupMap } from "./localization";

const reverseLookupTable = await initLocalization(); // build the structure

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
    // else if (!settings.sudoerPassword || settings.sudoerPassword == "") {
    //   reason = "Please set sudo password. It is required on macOS.";
    // }

    // check that the sudo password is actually correct
    // execAsync() throws if there is an error
    // else {
    //   try {
    //     await execAsync(`echo ${settings.sudoerPassword} | sudo -S ls`);
    //   } catch {
    //     reason = "Please enter a valid sudo password.";
    //   }
    // }

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
    const cmd = `$r=[System.Net.Sockets.TcpClient]::new();$r.ConnectAsync(${settings.iperfServerAdrs},5201).Wait(100);$r.Close();$r.Connected`;
    // check that we can actually connect to the iperf3 server
    // command throws if there is an error
    try {
      await execAsync(cmd);
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
   * scanWifi() - return an array of available wifi SSIDs plus a reason string
   * These are sorted by the strongest RSSI
   */
  async scanWifi(_settings: PartialHeatmapSettings): Promise<WifiScanResults> {
    const response: WifiScanResults = {
      SSIDs: [],
      reason: "",
    };

    try {
      // Get the Wifi information from `netsh`
      const { stdout } = await execAsync(`netsh wlan show networks mode=bssid`);
      response.SSIDs = parseNetshNetworks(stdout);
      console.log(`Local SSIDs: ${JSON.stringify(response.SSIDs, null, 2)}`);
    } catch (err) {
      response.reason = `Cannot get wifi info: ${err}"`;
    }
    // ======= FINALLY WE ARE DONE! =======
    return response;
  }

  /**
   * setWifi(settings, newSSID) - associate with the named SSID
   * Use: netsh wlan connect name="YourSSID"
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
    const { stdout } = await execAsync(
      `netsh wlan connect name="${wifiSettings.ssid}`,
    );

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

/**
 * scanWifiWindows() scan the Wifi for Windows
 * @returns a WiFiNetwork description to be added to the surveyPoints
 */
export async function scanWifiWindows(): Promise<WifiResults> {
  const reverseLookupTable = await getReverseLookupMap();
  const command = "netsh wlan show interfaces";
  const { stdout } = await execAsync(command);
  logger.trace("NETSH output:", stdout);
  const parsed = parseNetshInterfaces(reverseLookupTable, stdout);
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
 * Note: parseNetshNetworks() and parseNetshInterfaces() both rely
 * on the same reverseTableLookup.get() function to handle
 * localized `netsh` output
 *
 * Their structure is rather different because they deal with somewhat
 * different commandline output formats.
 *
 * It seems possible that they could be factored to have a more
 * similar structure, however they DO seem to produce the proper results.
 */

/**
 * parseNetshNetworks() parses the `netsh wlan show networks mode=bssid`
 * @param string Output of the command
 * @returns array of WifiResults
 */
export function parseNetshNetworks(text: string): WifiResults[] {
  const results: WifiResults[] = [];

  let currentSSID = "";
  let currentBSSID = "";
  let currentSecurity = "";
  let wifiResult = getDefaultWifiNetwork();

  const lines = text.split("\n");
  console.log(`input text is ${lines.length} long`);
  for (const line of lines) {
    const rawLine = line.trim();
    const colonIndex = rawLine.indexOf(":");
    if (colonIndex === -1) continue;

    const rawLabel = rawLine
      .slice(0, colonIndex)
      .trim()
      .replace(/\s*\d+$/, "");
    const rawValue = rawLine.slice(colonIndex + 1).trim();
    // console.log(`rawLabel: "${rawLabel}" rawValue: "${rawValue}" `);
    const localizedLabel = reverseLookupTable.get(rawLabel);
    // if (translatedLabel) {
    //   console.log(
    //     `translatedLabel: "${translatedLabel}" rawValue: "${rawValue}" `,
    //   );
    // }

    // Now have translatedLabel and its value
    // push out the collected data if currentSSID and currentBSSID are set
    if (localizedLabel == "ssid" || localizedLabel == "bssid") {
      if (currentSSID != "" && currentBSSID != "") {
        results.push(wifiResult);
        currentBSSID = ""; // reset the parameters
        console.log(`***** wifiResult: ${JSON.stringify(wifiResult)}`);
        wifiResult = getDefaultWifiNetwork();
      }
    }

    // starts a new SSID: just remember its SSID
    if (localizedLabel == "ssid") {
      currentSSID = rawValue;
      continue;
    }

    // "security" follows the SSID line: remember it
    if (localizedLabel == "security") {
      currentSecurity = rawValue;
      continue;
    }

    // encountering "BSSID" starts a new WifiResult
    // record its ssid, bssid, security
    if (localizedLabel == "bssid") {
      currentBSSID = rawValue;
      wifiResult.ssid = currentSSID;
      wifiResult.bssid = currentBSSID;
      wifiResult.security = currentSecurity;
      continue;
    }

    if (localizedLabel == "signalStrength") {
      wifiResult.signalStrength = Number(rawValue.replace("%", "")); // remove any "%"
      wifiResult.rssi = percentageToRssi(wifiResult.signalStrength);
      continue;
    }

    if (localizedLabel == "phyMode") {
      wifiResult.phyMode = rawValue;
      continue;
    }

    if (localizedLabel == "channel") {
      wifiResult.channel = Number(rawValue);
      wifiResult.band = channelToBand(wifiResult.channel);
      continue;
    }
  }
  results.push(wifiResult); // push out the final one
  console.log(`***** wifiResult: ${JSON.stringify(wifiResult)}`);

  return results;
}

/**
 * Parse the output of the `netsh wlan show interfaces` command.
 *
 * This code looks up the labels from the netsh... command
 * in a localization map that determines the proper label for the WifiNetwork
 */
export function parseNetshInterfaces(
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
  //set frequency band and rssi
  networkInfo.band = channelToBand(networkInfo.channel);
  networkInfo.rssi = percentageToRssi(networkInfo.signalStrength);

  return networkInfo;
}

/**
 * getProfiles - issue `netsh wlan show profiles` and return an
 * array of profile names (string)
 */
async function getProfiles(): string[] {
  const { stdout } = await execAsync("netsh wlan show profiles");

  return [stdout];
}
