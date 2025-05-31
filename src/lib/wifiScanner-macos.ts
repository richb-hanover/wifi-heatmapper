import { HeatmapSettings, WifiNetwork } from "./types";
import { execAsync, delay } from "./server-utils";
import { getLogger } from "./logger";
import { rssiToPercentage } from "./utils";
import { isValidMacAddress, normalizeMacAddress } from "./utils";
import { WifiInfo } from "./types";

const logger = getLogger("wifi-macOS");

export class MacOSSystemInfo implements WifiInfo {
  nameOfWifi: string = "";

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
   * restartWifi - turn wifi off then on, wait 'til it reassociates
   * (presumably on the strongest signal)
   * @param settings
   */
  async restartWifi(settings: HeatmapSettings): Promise<void> {
    // logger.info(`Called restartWifi():`);

    // await delay(20000);
    if (!this.nameOfWifi) {
      logger.info(`re-retrieving wifi interface name:`);
      this.nameOfWifi = await this.findWifi();
    }

    // console.log(`turned off:`);
    await loopUntilCondition(
      // until an error (no ipconfig for the wifi)
      `networksetup -setairportpower ${this.nameOfWifi} off`,
      1,
      5,
    );

    // console.log(`turn it back on:`);
    await loopUntilCondition(
      `networksetup -setairportpower ${this.nameOfWifi} on`,
      0,
      8,
    );
    // console.log(`turned back on:`);
  }

  //
  /**
   * scanWifi() scan the wifi to get the signal strength, etc.
   * @param settings - the full set of settings, including sudoerPassword
   * @returns a WiFiNetwork description to be added to the surveyPoints
   */
  async scanWifi(settings: HeatmapSettings): Promise<WifiNetwork> {
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

/**
 * parseWdutilOutput - parses the string from `wdutil` into a WifiNetwork object
 */
export function parseWdutilOutput(output: string): WifiNetwork {
  const partialNetworkInfo: Partial<WifiNetwork> = {};
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
          console.log(`RSSI: ${line} ${partialNetworkInfo.rssi}`);
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
          console.log(`tx rate: ${line} ${partialNetworkInfo.txRate}`);
          break;
        case "PHY Mode":
          partialNetworkInfo.phyMode = value;
          break;
        case "Security":
          partialNetworkInfo.security = value;
          break;
      }
    }
  });
  if (
    partialNetworkInfo.ssid &&
    partialNetworkInfo.bssid &&
    partialNetworkInfo.rssi &&
    partialNetworkInfo.signalStrength &&
    partialNetworkInfo.band &&
    partialNetworkInfo.channel &&
    partialNetworkInfo.channelWidth &&
    partialNetworkInfo.txRate &&
    partialNetworkInfo.phyMode &&
    partialNetworkInfo.security
  ) {
    const networkInfo: WifiNetwork = partialNetworkInfo as WifiNetwork;
    // logger.info("Final WiFi data:", partialNetworkInfo);
    return networkInfo;
  } else {
    throw new Error(
      `Incomplete NetworkInfo data found in wifiScanner: ${JSON.stringify(partialNetworkInfo)}`,
    );
  }
}

/**
 * loopUntilCondition - execute the command continually
 *    (every `interval` msec) and exit when the commands return code
 *    matches the condition
 * @param cmd - string to be executed
 * @param condition - 0 - loop until no error; 1 - loop until error
 * @param timeout - number of seconds
 */
async function loopUntilCondition(
  cmd: string,
  condition: number, // 0 = loop until no error; 1 = loop until error
  timeout: number, // seconds
) {
  // console.log(`loopUntilCondition: ${cmd} ${condition} ${timeout}`);

  const interval = 200; // msec
  const count = (timeout * 1000) / interval;
  let i;
  for (i = 0; i < count; i++) {
    let exit = "";
    try {
      const resp = await execAsync(`${cmd}`);
      exit = resp.stdout;
      // console.log(`"cmd" is OK: ${i} ${Date.now()} "${exit}"`);
      // no error on the command: if we were waiting for it,  exit
      if (condition != 0) {
        break;
      }
    } catch (error) {
      // console.log(`"cmd" gives error: ${i} ${Date.now()} "${error}"`);
      // caught an error: if we were waiting for it,  exit
      if (condition == 0) {
        break;
      }
    }
    // and delay before checking again
    await delay(interval);
  }
  if (i == count) {
    console.log(`loopUntilCondition timed out: ${cmd} ${condition} ${timeout}`);
  }
}
