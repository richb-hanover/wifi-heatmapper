import { HeatmapSettings, WifiNetwork } from "./types";
import { execAsync } from "./server-utils";
import { getLogger } from "./logger";
import { getDefaultWifiNetwork } from "./wifiScanner";
import { rssiToPercentage } from "./utils";
import { isValidMacAddress, normalizeMacAddress } from "./utils";
import { WifiInfo } from "./types";

const logger = getLogger("wifi-macOS");
const networkInfo = await getDefaultWifiNetwork();

export class MacOSSystemInfo implements WifiInfo {
  nameOfWifi: string = "";

  // return the wifi interface name (string)
  async findWifi(): Promise<string> {
    // Parse macOS output
    const { stdout } = await execAsync(
      'networksetup -listallhardwareports | grep -A 1 "Wi-Fi\\|Airport" | grep "Device" |  sed "s/Device: //"',
    );
    this.nameOfWifi = stdout;
    return stdout;
  }

  // turn wifi off, then on, to get best AP & SSID
  async restartWifi(settings: HeatmapSettings): Promise<void> {
    return;
    await execAsync(
      `networksetup -setairportpower ${settings.wifiInterface} off`,
    );
    await execAsync(
      `networksetup -setairportpower ${settings.wifiInterface} on`,
    );
  }

  //
  /**
   * scanWifi() scan the wifi to get the signal strength, etc.
   * @param settings - the full set of settings, including sudoerPassword
   * @returns a WiFiNetwork description to be added to the surveyPoints
   */
  async scanWifi(settings: HeatmapSettings): Promise<WifiNetwork> {
    const wdutilOutput = await execAsync(
      `echo ${settings.sudoerPassword} | sudo -S wdutil info`,
    );
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
    wdutilNetworkInfo.signalStrength = rssiToPercentage(wdutilNetworkInfo.rssi);
    console.log(`Wifi strength: ${wdutilNetworkInfo.signalStrength}`);
    return wdutilNetworkInfo;
  }
}
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
 * macos 12 gives "144 (40Mhz, DFS)" where the channel is 144
 * @param channelString - see the formats above
 * @returns band (2 or 5 GHz); channel, channelWidth
 */
const parseChannel = (channelString: string): number[] => {
  let bandStr = "0",
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
    bandStr = channelParts[0].match(/\d+/)?.[0] ?? "0";
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
  band = parseInt(bandStr);
  channel = parseInt(channelStr);
  channelWidth = parseInt(channelWidthStr);
  if (band == 0) {
    band = channel > 14 ? 5 : 2.4; // patch up the frequency band
  }
  return [band, channel, channelWidth];
};

export function parseWdutilOutput(output: string): WifiNetwork {
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
          networkInfo.ssid = value;
          break;
        case "BSSID":
          networkInfo.bssid = normalizeMacAddress(value);
          break;
        case "RSSI":
          networkInfo.rssi = parseInt(value.split(" ")[0]);
          break;
        case "Channel": {
          [networkInfo.band, networkInfo.channel, networkInfo.channelWidth] =
            parseChannel(value);
          break;
        }
        case "Tx Rate":
          networkInfo.txRate = parseFloat(value.split(" ")[0]);
          break;
        case "PHY Mode":
          networkInfo.phyMode = value;
          break;
        case "Security":
          networkInfo.security = value;
          break;
      }
    }
  });

  logger.trace("Final WiFi data:", networkInfo);
  return networkInfo;
}

/**
//  * blinkWifiMacOS - disassociate, then re-associate the Wi-Fi
//  */

// export async function blinkWifiMacOS(settings: HeatmapSettings): Promise<void> {
//   // toggle WiFi off and on to get fresh data
//   console.error("Toggling WiFi off ");
//   let offon = await execAsync(
//     `echo ${settings.sudoerPassword} | sudo -S networksetup -setnetworkserviceenabled "Wi-Fi" off`,
//   );
//   console.log(`Toggled off: ${JSON.stringify(offon.stdout)}`);
//   await delay(3000);
//   console.error(`Toggling WiFi on: ${JSON.stringify(offon.stdout)}`);
//   offon = await execAsync(
//     `echo ${settings.sudoerPassword} | sudo -S networksetup -setnetworkserviceenabled "Wi-Fi" on`,
//   );
//   console.log(`offOn: ${JSON.stringify(offon.stdout)}`);
//   await delay(3000);
// }
