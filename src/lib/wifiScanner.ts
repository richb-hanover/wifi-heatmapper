"use server";
import os from "os";
import { WifiInfo } from "./types";
import { MacOSSystemInfo } from "./wifiScanner-macos";
import { execAsync, delay, runDetached } from "./server-utils";

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
  testcmd: string,
  condition: number, // 0 = loop until no error; 1 = loop until error
  timeout: number, // seconds
) {
  console.log(`loopUntilCondition: ${cmd} ${testcmd} ${condition} ${timeout}`);

  const interval = 200; // msec
  const count = (timeout * 1000) / interval;
  let i;

  runDetached(cmd); // issue the specified command "detached"

  // Start to loop on testcmd until the desired condition
  for (i = 0; i < count; i++) {
    // const exit = "";
    let outcome;
    try {
      const resp = await execAsync(`${testcmd}`); // run the testcmd
      const exit = resp.stdout;
      console.log(`${testcmd} is OK: ${i} ${Date.now()} "${exit}"`);
      outcome = 0; // no error
      // } catch {
    } catch (error) {
      console.log(`${testcmd} gives error: ${i} ${Date.now()} "${error}"`);
      outcome = 1; // some kind of error that caused the catch()
    }
    if (outcome == condition) break; // we got the result we were looking for
    await delay(interval);
  }
  if (i == count) {
    console.log(`loopUntilCondition timed out: ${cmd} ${condition} ${timeout}`);
  }
}
