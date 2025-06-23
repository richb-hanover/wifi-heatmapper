"use server";
import {
  HeatmapSettings,
  IperfResults,
  IperfTestProperty,
  WifiResults,
} from "./types";
// import { scanWifi, blinkWifi } from "./wifiScanner";
import { execAsync } from "./server-utils";
import { getCancelFlag, sendSSEMessage } from "./server-globals";
import { percentageToRssi, toMbps } from "./utils";
import { SSEMessageType } from "@/app/api/events/route";
import { getLogger } from "./logger";
import { createWifiInfo } from "./wifiScanner";

const logger = getLogger("iperfRunner");
const wifiInfo = await createWifiInfo();

const validateWifiDataConsistency = (
  wifiDataBefore: WifiResults,
  wifiDataAfter: WifiResults,
) => {
  if (
    wifiDataBefore.bssid === wifiDataAfter.bssid &&
    wifiDataBefore.ssid === wifiDataAfter.ssid &&
    wifiDataBefore.band === wifiDataAfter.band &&
    wifiDataBefore.channel === wifiDataAfter.channel
  ) {
    return true;
  }
  const logString = `${JSON.stringify(wifiDataBefore.bssid)} ${JSON.stringify(wifiDataAfter.bssid)}`;
  logger.info(logString);
};

/**
 * startSurvey - kick off the entire process for surveying the clicked point
 * @returns void
 */
// export async function startSurvey(settings: HeatmapSettings): Promise<void> {
//   try {
//     const { iperfData, wifiData } = await runSurveyTests(settings);

//     // null indicates measurement was canceled
//     if (!iperfData || !wifiData) {
//       setSurveyResults({ error: "Measurement was cancelled", status: "error" });
//       return;
//     }

//     const results: SurveyResults = {
//       wifiData,
//       iperfData,
//     };
//     setSurveyResults({ point: results, status: "done" });
//     return;
//   } catch (error) {
//     console.log(`caught error in startSurvey(): ${error}`);
//     setSurveyResults({ status: "error", error: String(error) });
//     return;
//   }
// }

function arrayAverage(arr: number[]): number {
  if (arr.length === 0) return 0;
  const sum = arr.reduce((acc, val) => acc + val, 0);
  return Math.round(sum / arr.length);
}

const initialStates = {
  type: "update",
  header: "Measurement beginning",
  strength: "-",
  tcp: "-/- Mbps",
  udp: "-/- Mbps",
};

// The measurement process updates these variables
// which then are converted into update events
let displayStates = {
  type: "update",
  header: "In progress",
  strength: "-",
  tcp: "-/- Mbps",
  udp: "-/- Mbps",
};

/**
 * getUpdatedMessage - combine all the displayState values
 * @returns (SSEMessageType) - the message to send
 */
function getUpdatedMessage(): SSEMessageType {
  let strength = displayStates.strength;
  if (strength != "-") {
    strength += "%";
  }
  return {
    type: displayStates.type,
    header: displayStates.header,
    status: `Signal strength: ${strength}\nTCP: ${displayStates.tcp}\nUDP: ${displayStates.udp}`,
  };
}

function checkForCancel() {
  if (getCancelFlag()) throw new Error("cancelled");
}

/**
 * runSurveyTests() - get the WiFi and iperf readings
 * @param settings
 * @returns the WiFi and iperf results for this location
 */
export async function runSurveyTests(settings: HeatmapSettings): Promise<{
  iperfData: IperfResults | null;
  wifiData: WifiResults | null;
}> {
  const performIperfTest = settings.iperfServerAdrs != "localhost";
  try {
    const maxRetries = 1;
    let attempts = 0;
    let iperfData: IperfResults | null = null;
    let wifiData: WifiResults | null = null;

    // set the initial states, then send an event to the client
    displayStates = { ...displayStates, ...initialStates };
    sendSSEMessage(getUpdatedMessage()); // immediately send initial values
    displayStates.header = "Measurement in progress...";

    // check the settings - throw a non-"" error message
    console.log(`Checking the settings...`);
    const settingsStatus = await wifiInfo.checkSettings(settings);
    if (settingsStatus != "") throw `${settingsStatus}`;

    // "blink" the wifi to get best signal
    console.log(`Blinking Wifi in runIperfTest`);
    displayStates.header = "Seeking best Wi-Fi";
    sendSSEMessage(getUpdatedMessage());
    const startTime = Date.now();
    await wifiInfo.restartWifi(settings);

    displayStates.header = "Measuring Wi-Fi";
    sendSSEMessage(getUpdatedMessage());
    while (attempts < maxRetries && !iperfData) {
      try {
        const server = settings.iperfServerAdrs;
        const duration = settings.testDuration;
        const wifiStrengths: number[] = []; // percentages
        const emptyIperfTestProperty: IperfTestProperty = {
          bitsPerSecond: 0,
          retransmits: 0,
          jitterMs: 0,
          lostPackets: 0,
          packetsReceived: 0,
          signalStrength: 0,
        };

        let tcpDownload = emptyIperfTestProperty;
        let tcpUpload = emptyIperfTestProperty;
        let udpDownload = emptyIperfTestProperty;
        let udpUpload = emptyIperfTestProperty;

        const wifiDataBefore = await wifiInfo.scanWifi(settings);
        console.log(`Elapsed time for blinking: ${Date.now() - startTime}`);
        wifiStrengths.push(wifiDataBefore.signalStrength);
        displayStates.strength = arrayAverage(wifiStrengths).toString();
        checkForCancel();
        sendSSEMessage(getUpdatedMessage());

        // Run the TCP tests (last parameter = false)
        if (performIperfTest) {
          tcpDownload = await runSingleTest(server, duration, true, false);
          tcpUpload = await runSingleTest(server, duration, false, false);
          displayStates.tcp = `${toMbps(tcpDownload.bitsPerSecond)} / ${toMbps(tcpUpload.bitsPerSecond)} Mbps`;
        } else {
          displayStates.tcp = "Not performed";
        }
        checkForCancel();
        sendSSEMessage(getUpdatedMessage());

        const wifiDataMiddle = await wifiInfo.scanWifi(settings);
        wifiStrengths.push(wifiDataMiddle.signalStrength);
        displayStates.strength = arrayAverage(wifiStrengths).toString();
        checkForCancel();
        sendSSEMessage(getUpdatedMessage());

        // Run the UDP tests
        if (performIperfTest) {
          udpDownload = await runSingleTest(server, duration, true, true);
          udpUpload = await runSingleTest(server, duration, false, true);
          displayStates.udp = `${toMbps(udpDownload.bitsPerSecond)} / ${toMbps(udpUpload.bitsPerSecond)} Mbps`;
        } else {
          displayStates.udp = "Not performed";
        }
        checkForCancel();
        sendSSEMessage(getUpdatedMessage());

        const wifiDataAfter = await wifiInfo.scanWifi(settings);
        wifiStrengths.push(wifiDataAfter.signalStrength);
        displayStates.strength = arrayAverage(wifiStrengths).toString();
        checkForCancel();
        console.log(`wifiStrengths: ${wifiStrengths}`);

        // Send the final update - type is "done"
        displayStates.type = "done";
        displayStates.header = "Measurement complete";
        sendSSEMessage(getUpdatedMessage());

        if (!validateWifiDataConsistency(wifiDataBefore, wifiDataAfter)) {
          throw new Error(
            "Wifi configuration changed between scans! Cancelling instead of giving wrong results.",
          );
        }

        iperfData = {
          tcpDownload,
          tcpUpload,
          udpDownload,
          udpUpload,
        };

        const strength = parseInt(displayStates.strength);
        wifiData = {
          ...wifiDataBefore,
          signalStrength: strength, // use the average signalStrength
          rssi: percentageToRssi(strength), // set corresponding RSSI
        };
      } catch (error: any) {
        if (error.message == "cancelled") {
          return { iperfData: null, wifiData: null };
        }
        logger.error(`Attempt ${attempts + 1} failed:`, error);
        attempts++;
        if (attempts >= maxRetries) {
          throw error;
        }
        // wait 2 secs to recover
        // await delay(2000);
      }
    }

    // return the values ("!" asserts that the values are non-null)
    return { iperfData: iperfData!, wifiData: wifiData! };
  } catch (error) {
    logger.error("Error running measurement tests:", error);
    sendSSEMessage({
      type: "done",
      status: "Error taking measurements",
      header: "Error",
    });

    throw error;
  }
}

async function runSingleTest(
  server: string,
  duration: number,
  isDownload: boolean,
  isUdp: boolean,
): Promise<IperfTestProperty> {
  const logger = getLogger("runSingleTest");

  let port = "";
  if (server.includes(":")) {
    const [host, serverPort] = server.split(":");
    server = host;
    port = serverPort;
  }
  const command = `iperf3 -c ${server} ${
    port ? `-p ${port}` : ""
  } -t ${duration} ${isDownload ? "-R" : ""} ${isUdp ? "-u -b 0" : ""} -J`;
  const { stdout } = await execAsync(command);
  const result = JSON.parse(stdout);
  logger.trace("Iperf JSON-parsed result:", result);
  const extracted = extractIperfData(result, isUdp);
  logger.trace("Iperf extracted results:", extracted);
  return extracted;
}

export async function extractIperfData(
  result: {
    end: {
      sum_received?: { bits_per_second: number };
      sum_sent?: { retransmits?: number };
      sum?: {
        bits_per_second?: number;
        jitter_ms?: number;
        lost_packets?: number;
        packets?: number;
        lost_percent?: number;
        retransmits?: number;
      };
      streams?: Array<{
        udp?: {
          jitter_ms?: number;
          lost_packets?: number;
          packets?: number;
        };
      }>;
    };
    version?: string;
  },
  isUdp: boolean,
): Promise<IperfTestProperty> {
  const end = result.end;

  // Check if we're dealing with newer iPerf (Mac - v3.17+) or older iPerf (Ubuntu - v3.9)
  // Newer versions have sum_received and sum_sent, older versions only have sum
  const isNewVersion = !!end.sum_received;

  /**
   * In newer versions (Mac):
   * - TCP: sum_received contains download/upload bps, sum_sent contains retransmits
   * - UDP: sum_received contains actual received data (~51 Mbps),
   *        sum contains reported test bandwidth (~948 Mbps)
   *
   * In older versions (Ubuntu):
   * - TCP: sum contains both bps and retransmits
   * - UDP: sum contains all metrics (bps, jitter, packet loss)
   */

  // For UDP tests with newer iPerf (Mac), we want to use sum.bits_per_second
  // For TCP tests with newer iPerf, we want to use sum_received.bits_per_second
  // For all tests with older iPerf (Ubuntu), we want to use sum.bits_per_second
  const bitsPerSecond = isNewVersion
    ? isUdp
      ? end.sum?.bits_per_second || 0
      : end.sum_received!.bits_per_second
    : end.sum?.bits_per_second || 0;

  if (!bitsPerSecond) {
    throw new Error(
      "No bits per second found in iperf results. This is fatal.",
    );
  }

  const retransmits = isNewVersion
    ? end.sum_sent?.retransmits || 0
    : end.sum?.retransmits || 0;

  return {
    bitsPerSecond,
    retransmits,

    // UDP metrics - only relevant for UDP tests
    // These fields will be null for TCP tests
    jitterMs: isUdp ? end.sum?.jitter_ms || null : null,
    lostPackets: isUdp ? end.sum?.lost_packets || null : null,
    packetsReceived: isUdp ? end.sum?.packets || null : null,
    signalStrength: 0,
  };
}
