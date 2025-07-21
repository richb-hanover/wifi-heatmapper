import { percentageToRssi, channelToBand } from "../src/lib/utils";
import { WifiResults } from "@/lib/types";
import { initLocalization } from "../src/lib/localization";

const reverseLookupTable = await initLocalization(); // build the structure

// Dummy lookup function for illustration
function lookup(label: string): string {
  return label.trim(); // Replace with your real lookup logic
}
export function parseNetshNetworks(text: string): WifiResults[] {
  const lines = text.split("\n");
  const results: WifiResults[] = [];

  let currentSSID = "";
  let currentAuth = "";
  let currentBSSID = "";

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i].trim();
    const colonIndex = rawLine.indexOf(":");
    if (colonIndex === -1) continue;

    const rawLabel = rawLine
      .slice(0, colonIndex)
      .trim()
      .replace(/\s*\d+$/, "");
    const rawValue = rawLine.slice(colonIndex + 1).trim();

    const label = rawLabel;
    const value = lookup(rawValue);

    switch (label) {
      case "SSID":
        currentSSID = value;
        currentAuth = ""; // Reset for new SSID
        break;
      case "Authentication":
        currentAuth = value;
        break;
      case "BSSID":
        currentBSSID = value;

        // Collect next few lines
        const signal = lookup(lines[++i]?.split(":")[1]?.trim() ?? "");
        const radioType = lookup(lines[++i]?.split(":")[1]?.trim() ?? "");
        i++; // Skip Band
        const channel = Number(lookup(lines[++i]?.split(":")[1]?.trim() ?? ""));

        const signalStrength = Number(signal.slice(0, signal.length - 1));
        results.push({
          ssid: lookup(currentSSID),
          security: lookup(currentAuth),
          bssid: currentBSSID,
          signalStrength: signalStrength,
          rssi: percentageToRssi(signalStrength),
          phyMode: radioType,
          channel: channel,
          band: channelToBand(channel),
          channelWidth: 0,
          txRate: 0,
          active: false,
        });
        break;
    }
  }

  return results;
}

// const parsed = parseNetshBssid(input);
// console.log(JSON.stringify(parsed, null, 2));
