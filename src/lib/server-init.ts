// lib/initServer.ts
import { copyToMediaFolder } from "../lib/actions";
import { getLogger } from "./logger";
import os from "os";
import { promises as fs } from "fs";

import { execAsync } from "./server-utils";
import { initLocalization } from "./localization";

const loadJson = async (filePath: string) => {
  const contents = await fs.readFile(filePath, "utf-8");
  return JSON.parse(contents);
};

const logger = getLogger("initServer");
let initialized = false;

async function logSystemInfo(): Promise<void> {
  try {
    const platform = os.platform();
    const release = os.release();
    const version = os.version();
    const data = await loadJson("./package.json");
    const nodeVersion = process.version;

    logger.info("=== System Information ===");
    logger.info(`wifi-heatmapper: ${data.version}`);
    logger.info(`Node version: ${nodeVersion}`);
    logger.info(`OS: ${platform}`);
    logger.info(`OS Version: ${release}`);
    logger.info(`OS Details: ${version}`);

    try {
      const { stdout } = await execAsync("iperf3 --version");
      logger.info(`iperf3 version: ${stdout.trim()}`);
    } catch (error) {
      logger.warn("Could not determine iperf3 version:", error);
    }
    logger.info("");
    logger.info("=== End System Information ===");
    logger.info("");
  } catch (error) {
    logger.error("Error collecting system information:", error);
  }
}

/**
 * initServer() - a grab-bag of stuff to initialize on the server
 * - Logging system information
 * - Copying the default background image to /media/ folder
 */
export async function initServer() {
  if (initialized) return;
  try {
    await logSystemInfo();
    await copyToMediaFolder("EmptyFloorPlan.png"); // seed with empty image
    await initLocalization(); // load up the localization files
    initialized = true;
  } catch (error) {
    logger.error("Server initialization failed:", error);
  }
}
