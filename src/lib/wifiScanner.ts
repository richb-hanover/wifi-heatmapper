"use server";
import os from "os";
import { WifiInfo } from "./types";
import { MacOSSystemInfo } from "./wifiScanner-macos";
// import { WindowsSystemInfo } from "./windows";
// import { LinuxSystemInfo } from "./linux";

/**
 * wifiScanner.ts is a factory module that returns the proper set of
 * functions for the underlying OS
 */

// const logger = getLogger("wifiScanner");

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

/**
 * loopUntilCondition - execute the command every `interval` msec
 *    and exit when the command's return code matches the condition
 * @param cmd - string to be executed
 * @param condition
 *   - 0 means "loop until success" (noErr returned)
 *   - 1 means "loop until failure" (error condition returned)
 * @param timeout - number of seconds
 */
export async function loopUntilCondition(
  cmd: string,
  condition: number, // 0 = loop until no error; 1 = loop until error
  timeout: number, // seconds
) {
  // console.log(`loopUntilCondition: ${cmd} ${condition} ${timeout}`);

  const interval = 200; // msec
  const count = (timeout * 1000) / interval;
  let i;
  for (i = 0; i < count; i++) {
    // let exit = "";
    try {
      await execAsync(`${cmd}`);
      // exit = resp.stdout;
      // console.log(`"cmd" is OK: ${i} ${Date.now()} "${exit}"`);
      // no error on the command: if we were waiting for it,  exit
      if (condition != 0) {
        break;
      }
    } catch {
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
