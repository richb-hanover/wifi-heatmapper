import {
  percentageToRssi,
  channelToBand,
  getDefaultWifiNetwork,
} from "../src/lib/utils";
import { WifiResults } from "@/lib/types";
import { initLocalization } from "../src/lib/localization";
// import { logSPResults } from "../src/lib/wifiScanner-macos";

const reverseLookupTable = await initLocalization(); // build the structure

export function parseNetshNetworks(text: string): WifiResults[] {
  const lines = text.split("\n");
  const results: WifiResults[] = [];

  let currentSSID = "";
  let currentBSSID = "";
  let wifiResult = getDefaultWifiNetwork();

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
    const translatedLabel = reverseLookupTable.get(rawLabel);
    // if (translatedLabel) {
    //   console.log(
    //     `translatedLabel: "${translatedLabel}" rawValue: "${rawValue}" `,
    //   );
    // }
    // Now have translatedLabel and its value
    // push out the collected data if currentSSID and currentBSSID are set
    if (translatedLabel == "ssid" || translatedLabel == "bssid") {
      if (currentSSID != "" && currentBSSID != "") {
        results.push(wifiResult);
        currentBSSID = ""; // reset the parameters
        // console.log(`***** wifiResult: ${JSON.stringify(wifiResult)}`);
        wifiResult = getDefaultWifiNetwork();
      }
    }

    if (translatedLabel == "ssid") {
      currentSSID = rawValue;
      continue;
    }

    if (translatedLabel == "bssid") {
      currentBSSID = rawValue;
      wifiResult.bssid = rawValue;
      wifiResult.ssid = currentSSID;
      continue;
    }

    if (translatedLabel == "signalStrength") {
      wifiResult.signalStrength = Number(rawValue.replace("%", "")); // remove any "%"
      wifiResult.rssi = percentageToRssi(wifiResult.signalStrength);
      continue;
    }

    if (translatedLabel == "phyMode") {
      wifiResult.phyMode = rawValue;
      continue;
    }

    if (translatedLabel == "channel") {
      wifiResult.channel = Number(rawValue);
      wifiResult.band = channelToBand(wifiResult.channel);
    }

    if (translatedLabel == "security") {
      wifiResult.security = rawValue;
    }
  }
  results.push(wifiResult); // push out the final one
  // logSPResults(results);

  return results;
}
//   let currentSSID = "";
//   let currentAuth = "";
//   let currentBSSID = "";

//   for (let i = 0; i < lines.length; i++) {
//     const rawLine = lines[i].trim();
//     const colonIndex = rawLine.indexOf(":");
//     if (colonIndex === -1) continue;

//     const rawLabel = rawLine
//       .slice(0, colonIndex)
//       .trim()
//       .replace(/\s*\d+$/, "");
//     const rawValue = rawLine.slice(colonIndex + 1).trim();

//     const label = await reverseLookup(rawLabel);
//     const value = rawValue;

//     switch (label) {
//       case "ssid":
//         currentSSID = value;
//         currentAuth = ""; // Reset for new SSID
//         break;
//       case "Authentication":
//         currentAuth = value;
//         break;
//       case "BSSID":
//         currentBSSID = value;

//         // Collect next few lines
//         const signal = lookup(lines[++i]?.split(":")[1]?.trim() ?? "");
//         const radioType = lookup(lines[++i]?.split(":")[1]?.trim() ?? "");
//         i++; // Skip Band
//         const channel = Number(lookup(lines[++i]?.split(":")[1]?.trim() ?? ""));

//         const signalStrength = Number(signal.slice(0, signal.length - 1));
//         results.push({
//           ssid: lookup(currentSSID),
//           security: lookup(currentAuth),
//           bssid: currentBSSID,
//           signalStrength: signalStrength,
//           rssi: percentageToRssi(signalStrength),
//           phyMode: radioType,
//           channel: channel,
//           band: channelToBand(channel),
//           channelWidth: 0,
//           txRate: 0,
//           active: false,
//         });
//         break;
//     }
//   }

//   return results;
// }

// const parsed = parseNetshBssid(input);
// console.log(JSON.stringify(parsed, null, 2));
