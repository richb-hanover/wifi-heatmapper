"use server";
import { WifiNetwork } from "./types";
import { getLogger } from "./logger";
import os from "os";
import { WifiInfo } from "./types";
import { MacOSSystemInfo } from "./wifiScanner-macos";
// import { WindowsSystemInfo } from "./windows";
// import { LinuxSystemInfo } from "./linux";

/**
 * wifiScanner.ts is a factory module that returns the proper set of
 * functions for the underlying OS
 * */

const logger = getLogger("wifiScanner");

export async function createWifiInfo(): Promise<WifiInfo> {
  const platform = os.platform();
  switch (platform) {
    case "darwin":
      return new MacOSSystemInfo();
    // case "win32":
    //   return new WindowsSystemInfo();
    // case "linux":
    //   return new LinuxSystemInfo();
    default:
      throw new Error(`Unsupported platform: ${platform}`);
  }
}

export const getDefaultWifiNetwork = async (): Promise<WifiNetwork> => {
  return {
    ssid: "",
    bssid: "",
    rssi: 0,
    signalStrength: 0,
    channel: 0,
    band: 0, // frequency band will be either 2.4 or 5 (GHz)
    channelWidth: 0,
    txRate: 0,
    phyMode: "",
    security: "",
  };
};

const hasValidData = (wifiData: WifiNetwork): boolean => {
  // if (!isValidMacAddress(wifiData.ssid)) {
  //   logger.warn("Invalid SSID (we were not able to get it):", wifiData.ssid);
  // }
  if (!isValidMacAddress(wifiData.bssid)) {
    logger.warn("Invalid BSSID (we were not able to get it):", wifiData.bssid);
  }

  return (
    // we also used to check for ssid and bssid, but at least on MacOS 15.3.1
    // these are not present in the output of any of the known OS commands
    // either rssi or signalStrength must be non-zero
    wifiData.rssi !== 0 || wifiData.signalStrength !== 0
  );
};
