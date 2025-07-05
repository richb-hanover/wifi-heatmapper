import {
  PartialHeatmapSettings,
  WifiResults,
  WifiScanResults,
  WifiActions,
  SPAirPortRoot,
} from "./types";
import { execAsync, delay } from "./server-utils";
import { getLogger } from "./logger";
import { rssiToPercentage } from "./utils";
import { isValidMacAddress, normalizeMacAddress } from "./utils";
import { loopUntilCondition } from "./wifiScanner";

const logger = getLogger("wifi-macOS");

export class MacOSSystemInfo implements WifiActions {
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
  async preflightSettings(settings: PartialHeatmapSettings): Promise<string> {
    // console.log(`partialSettings: ${JSON.stringify(settings)}`);
    // test duration must be > 0 - otherwise iperf3 runs forever
    if (settings.testDuration <= 0) {
      return "Test duration must be greater than zero.";
    }

    // iperfServerAddress must not be empty or ""
    if (!settings.iperfServerAdrs) {
      return "Please set iperf3 server address";
    }

    // macOS requires a sudo password
    if (!settings.sudoerPassword || settings.sudoerPassword == "") {
      return "Please set sudo password. It is required on macOS.";
    }

    // check that the sudo password is actually correct
    // execAsync() throws if there is an error
    try {
      await execAsync(`echo ${settings.sudoerPassword} | sudo -S ls`);
    } catch {
      return "Please enter a valid sudo password.";
    }

    // things look good - return ""
    return "";
  }

  /**
   * checkIperfServer() - test if an iperf3 server is available at the address
   * @param settings includes the iperfServerAddress
   * @returns "" or error string
   */
  async checkIperfServer(settings: PartialHeatmapSettings): Promise<string> {
    // check that we can actually connect to the iperf3 server
    // command throws if there is an error
    try {
      await execAsync(`nc -vz ${settings.iperfServerAdrs} 5201`);
    } catch {
      return "Cannot connect to iperf3 server.";
    }
    return "";
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

    // Get the Wifi information from system_profiler
    try {
      const result = await execAsync(`system_profiler -json SPAirPortDataType`);
      jsonResults = JSON.parse(result.stdout);
    } catch (err) {
      response.reason = `Cannot get wifi info: ${err}"`;
      return response;
    }

    // jsonResults holds the Wifi environment
    response.SSIDs = getCandidateSSIDs(jsonResults, currentIf);
    console.log(`Local SSIDs: ${JSON.stringify(response.SSIDs, null, 2)}`);

    // ======= FINALLY WE ARE DONE! =======
    return response;
  }

  /**
   * restartWifi - turn wifi off then on, wait 'til it reassociates
   * (presumably on the strongest signal)
   * @param settings
   *
   * NB: the "settings" parameter is unused,
   * so it is prefixed by "_" to avoid a Typescript warning
   */
  async restartWifi(_settings: PartialHeatmapSettings): Promise<void> {
    // logger.info(`Called restartWifi():`);

    this.nameOfWifi = await this.findWifi();

    // console.log(`turned off:`);
    await loopUntilCondition(
      // until an error (no ipconfig for the wifi)
      `networksetup -setairportpower ${this.nameOfWifi} off`,
      `ipconfig getifaddr ${this.nameOfWifi}`,
      1,
      5,
    );

    // console.log(`turn it back on:`);
    await loopUntilCondition(
      `networksetup -setairportpower ${this.nameOfWifi} on`,
      `ipconfig getifaddr ${this.nameOfWifi}`,
      0,
      20,
    );
  }

  /**
   * scanWifi() scan the wifi to get the signal strength, etc.
   * @param settings - the full set of settings, including sudoerPassword
   * @returns a WiFiResults description to be added to the surveyPoints
   *
   * After blinking the wifi, call `wdutil` multiple times
   * until the txRate is non-zero. Pause 200 msec before re-trying.
   * (Apparently, the wifi interface gets an address well before
   * all the rest of its settings (particularly txRate) are set.)
   */
  async scanWifi(settings: PartialHeatmapSettings): Promise<WifiResults> {
    let netInfo: WifiResults;
    // logger.info(`Called scanWifi():`);

    while (true) {
      netInfo = await this.getWdutilResults(settings);
      // console.log(`wdutil results: txRate is ${netInfo.txRate}`);
      if (netInfo.txRate != 0) {
        return netInfo;
      }
      await delay(200);
    }
  }

  /**
   * getWdutilResults() call `wdutil` to get the signal strength, etc.
   * This code simply parses the response, returning all the values it finds
   * (txRate may not be available right away, so the caller may re-try)
   * @param settings - the full set of settings, including sudoerPassword
   * @returns a WiFiResults description to be added to the surveyPoints
   */
  async getWdutilResults(
    settings: PartialHeatmapSettings,
  ): Promise<WifiResults> {
    // Issue the OS command
    const wdutilOutput = await execAsync(
      `echo ${settings.sudoerPassword} | sudo -S wdutil info`,
    );
    // parse that command into wdutilNetworkInfo
    const wdutilNetworkInfo = parseWdutilOutput(wdutilOutput.stdout);
    logger.trace("WDUTIL output:", wdutilNetworkInfo);

    if (!isValidMacAddress(wdutilNetworkInfo.ssid)) {
      logger.trace("Invalid SSID, getting it from ioreg");
      const ssidOutput = await getIoregSsid();
      if (isValidMacAddress(ssidOutput)) {
        wdutilNetworkInfo.ssid = ssidOutput;
      }
    }

    if (!isValidMacAddress(wdutilNetworkInfo.bssid)) {
      logger.trace("Invalid BSSID, getting it from ioreg");
      const bssidOutput = await getIoregBssid();
      if (isValidMacAddress(bssidOutput)) {
        wdutilNetworkInfo.bssid = bssidOutput;
      }
    }

    logger.trace("Final WiFi data:", wdutilNetworkInfo);
    // console.log(`Wifi strength: ${wdutilNetworkInfo.signalStrength}%`);
    return wdutilNetworkInfo;
  }
}
/**
 * parse `ioreg` commands (used if "wdutil" doesn't work)
 * @returns
 */
const getIoregSsid = async (): Promise<string> => {
  const { stdout } = await execAsync(
    "ioreg -l -n AirPortDriver | grep IO80211SSID | sed 's/^.*= \"\\(.*\\)\".*$/\\1/; s/ /_/g'",
  );
  return stdout.trim();
};

const getIoregBssid = async (): Promise<string> => {
  const { stdout } = await execAsync(
    "ioreg -l | grep \"IO80211BSSID\" | awk -F' = ' '{print $2}' | sed 's/[<>]//g'",
  );
  return stdout.trim();
};

/**
 * parseChannel
 * macos 15 gives "2g1/20" where the channel is "1"
 * macos 15 gives "5g144/40" where the channel is "144"
 * macos 12 gives "11 (20 MHz, Active)" where the channel is "11"
 * macos 12 gives "144 (40Mhz, DFS)" where the channel is "144"
 * @param channelString - see the formats above
 * @returns [ band (2.4 or 5 GHz), channel, channelWidth ]
 */
const parseChannel = (channelString: string): number[] => {
  let //bandStr,
    channelStr = "0",
    channelWidthStr = "0",
    band = 0,
    channel = 0,
    channelWidth = 0;

  // macOS 15 - "2g1/20" or "5g144/40"
  const channelParts = channelString.split("/");

  // macos 15 has a "/" - parse it
  if (channelParts.length == 2) {
    // leading digit is the band
    // bandStr = channelParts[0].match(/\d+/)?.[0] ?? "0";
    // channel number follows the "g"
    channelStr = channelParts[0].substring(2);
    if (channelParts[1]) {
      // the channel width follows the "/"
      channelWidthStr = channelParts[1];
    } else {
      channelWidthStr = "0";
    }
  }
  // macos 12 - "11 (20 MHz, Active)" or "144 (40Mhz, DFS)"
  else {
    const match = channelString.match(/(\d+).*?(\d+)\s*[Mm][Hh][Zz]/);
    if (match) {
      [, channelStr, channelWidthStr] = match;
    }
  }

  // 2.4GHz or 5GHz processing
  // band = parseInt(bandStr); // IGNORE THE PARSED-OUT "bandStr"
  channel = parseInt(channelStr);
  channelWidth = parseInt(channelWidthStr);
  band = channel > 14 ? 5 : 2.4; // patch up the frequency band

  return [band, channel, channelWidth];
};

/**
 * parseWdutilOutput - parses the string from `wdutil` into a WifiNetwork object
 */
export function parseWdutilOutput(output: string): WifiResults {
  const partialNetworkInfo: Partial<WifiResults> = {};
  const wifiSection = output.split("WIFI")[1].split("BLUETOOTH")[0];
  const lines = wifiSection.split("\n");
  logger.silly("WDUTIL lines:", lines);

  lines.forEach((line) => {
    if (line.includes(":")) {
      const colonIndex = line.indexOf(":");
      const key = line.substring(0, colonIndex).trim();
      const value = line.substring(colonIndex + 1).trim();
      switch (key) {
        case "SSID":
          partialNetworkInfo.ssid = value;
          break;
        case "BSSID":
          partialNetworkInfo.bssid = normalizeMacAddress(value);
          break;
        case "RSSI":
          partialNetworkInfo.rssi = parseInt(value.split(" ")[0]);
          // macOS returns dBm - convert to percentage
          partialNetworkInfo.signalStrength = rssiToPercentage(
            partialNetworkInfo.rssi,
          );
          break;
        case "Channel": {
          [
            partialNetworkInfo.band,
            partialNetworkInfo.channel,
            partialNetworkInfo.channelWidth,
          ] = parseChannel(value);
          break;
        }
        case "Tx Rate":
          partialNetworkInfo.txRate = parseFloat(value.split(" ")[0]);
          break;
        case "PHY Mode":
          partialNetworkInfo.phyMode = value;
          break;
        case "Security":
          partialNetworkInfo.security = value;
          break;
        // case "IPv4 Router":
        //   partialNetworkInfo.v4router = value;
        //   break;
        // case "IPv6 Router":
        //   partialNetworkInfo.v6router = value;
        //   break;
      }
    }
  });
  if (partialNetworkInfo.txRate != 0) {
    // logger.info(
    //   `RSSI: ${partialNetworkInfo.rssi} txRate: ${partialNetworkInfo.txRate}`,
    // );
  }

  const networkInfo: WifiResults = partialNetworkInfo as WifiResults;
  // logger.info(`Final WiFi data: ${JSON.stringify(networkInfo)}`);
  return networkInfo;
}

/**
 * getLocalCandidates(jsonResults) - pluck up the local SSIDs from the JSON
 * @param - Object that contains output of system_profiler for Wifi
 * @returns WifiResults[] sorted by signalStrength
 */

export const getCandidateSSIDs = (
  data: SPAirPortRoot,
  currentInterface: string,
): WifiResults[] => {
  function bySignalStrength(a: any, b: any): number {
    const parseSignal = (val: string | undefined): number | null => {
      const match = val?.match(/^(-?\d+)\s+dBm/);
      return match ? parseInt(match[1], 10) : null;
    };

    const signalA = parseSignal(a.spairport_signal_noise);
    const signalB = parseSignal(b.spairport_signal_noise);

    if (signalA === null && signalB === null) return 0;
    if (signalA === null) return 1; // move A to end
    if (signalB === null) return -1; // move B to end

    // Descending: stronger (less negative) signal first
    return signalB - signalA;
  }

  const candidates: WifiResults[] =
    data.SPAirPortDataType.flatMap(
      (entry) => entry.spairport_airport_interfaces || [],
    ).find((iface) => iface._name === currentInterface)
      ?.spairport_airport_other_local_wireless_networks ?? [];

  candidates.sort(bySignalStrength);

  // console.log(`Candidates: ${JSON.stringify(candidates, null, 2)}`);
  return candidates;
};

/**
 * getCurrentSSID(jsonResults) - get info about the current SSID
 * @param - Object that contains output of system_profiler for Wifi
 * @returns WifiResults[] sorted by signalStrength
 */

export const getCurrentSSID = (
  data: SPAirPortRoot,
  currentInterface: string,
): WifiResults[] => {
  const current = data.SPAirPortDataType.flatMap(
    (entry) => entry.spairport_airport_interfaces || [],
  ).find(
    (iface) => iface._name === currentInterface,
  )?.spairport_current_network_information;

  // console.log(`getCurrentSSID results: ${JSON.stringify(current)}`);
  if (!current) return [];

  console.log(`Current: ${JSON.stringify(current, null, 2)}`);
  const bobject = mapSPToWifiResult(current, spToWifiResultMap);
  return bobject;
};

/**
 * Map system_profiler values into a WifiResults object
 */
// type AObject = Record<string, any>;
type MappingSpec =
  | string
  | {
      key: string;
      transform?: (value: any) => string | Record<string, string>;
    };
type SPToWifiMap = Record<string, MappingSpec>;

// A map to convert from system_profiler property names to WifiResults property names
// This map uses the property's value unchanged,
//  or uses the transform to convert the value to the desired form
const spToWifiResultMap: SPToWifiMap = {
  _name: "ssid",
  spairport_network_phymode: "phyMode",
  spairport_network_rate: "txRate",
  spairport_network_channel: {
    key: "channel", // return channel and possibly channelWidth
    transform: (val: string) => parseChannelInfo(val), // e.g. "6" from "6 (2GHz, 20MHz)",
  },
  spairport_network_bssid: "bssid",
  spairport_security_mode: {
    key: "security",
    transform: (val: string) => SECURITY_LABELS[val] ?? "Unrecognized",
  },
  spairport_signal_noise: {
    key: "rssi",
    transform: (val: string) => parseRSSI(val), // e.g. "-56"
  },
  // spairport_network_mcs: 15,
  // spairport_network_type: "spairport_network_type_station",
};

//=====================

function mapSPToWifiResult(
  aObject: Record<string, any>,
  aToBMap: Record<string, MappingSpec>,
): Record<string, string> {
  const bObject: Record<string, string> = {};

  for (const [aKey, mapping] of Object.entries(aToBMap)) {
    let bKey: string;
    let transform: ((val: any) => string | Record<string, string>) | undefined;

    if (typeof mapping === "string") {
      bKey = mapping;
    } else {
      bKey = mapping.key;
      transform = mapping.transform;
    }

    const raw = aKey in aObject ? aObject[aKey] : undefined;

    if (raw === undefined) {
      bObject[bKey] = "";
      continue;
    }

    const result = transform ? transform(raw) : String(raw);

    if (typeof result === "string") {
      bObject[bKey] = result;
    } else {
      Object.assign(bObject, result);
    }
  }

  return bObject;
}

const SECURITY_LABELS: Record<string, string> = {
  spairport_security_mode_none: "None",
  spairport_security_mode_wep: "WEP",
  spairport_security_mode_wpa_personal: "WPA Personal",
  spairport_security_mode_wpa2_personal: "WPA2 Personal",
  spairport_security_mode_wpa3_personal: "WPA3 Personal",
  spairport_security_mode_wpa_enterprise: "WPA Enterprise",
  spairport_security_mode_wpa2_enterprise: "WPA2 Enterprise",
  spairport_security_mode_wpa3_enterprise: "WPA3 Enterprise",
  spairport_security_mode_unknown: "Unknown",
};

/**
 * parseChannelInfo - parse "6 (2GHz, 20MHz)", return "6" and "20"
 *  or parse "6" and return "6" and ""
 * @param input
 * @returns
 */
function parseChannelInfo(input: string): {
  channel: string;
  channelWidth: string;
  band: string;
} {
  if (typeof input === "number") {
    const bareChannel = input;
    return {
      channel: String(input),
      channelWidth: "",
      band: parseInt(bareChannel) < 14 ? "2.4" : "5",
    };
  }
  const match = input.match(/^(\d+)(?:\s+\([^(,]+,\s*(\d+)MHz\))?$/);
  const channel = match?.[1] ?? "";
  return {
    channel: channel,
    channelWidth: match?.[2] ?? "",
    band: parseInt(channel) < 14 ? "2.4" : "5",
  };
}

function parseRSSI(input: string): {
  rssi: string;
  signalStrength: string;
} {
  const rssi = parseInt(input.split(" ")[0]);
  return {
    rssi: String(rssi),
    signalStrength: String(rssiToPercentage(rssi)),
  };
}
