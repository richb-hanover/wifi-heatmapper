/**
 * Test conversion from `netsh wlan show interfaces mode=bssid`
 * to WifiResults
 */
import { expect, test } from "vitest";
import fs from "fs";
import path from "path";
import { parseNetshNetworks } from "../../experiments/parseNetshNetworks";
import { WifiResults } from "../../src/lib/types";
// import { initLocalization } from "../../src/lib/localization";

function checkEachItem(item: WifiResults) {
  // console.log(`checkEachItem: ${JSON.stringify(item)}`);
  expect(item.rssi).not.toBe("");
  expect(item.signalStrength).not.toBe("");
  expect(item.channelWidth).not.toBe("");
  expect(item.ssid).toContain("SSID-");
}

// ========= Win11 'netsh wlan show networks mode=bssid' ===============

test("Parsing Win11 'netsh ... networks'", () => {
  const netsh_output = fs.readFileSync(
    path.join(__dirname, "../data/win-netsh-networks-hbtl.txt"),
    "utf-8",
  );
  const results = parseNetshNetworks(netsh_output);

  console.log(`Test routine shows: ${JSON.stringify(results, null, 2)}`);

  expect(results.length).toEqual(8);

  expect(results[0]).toStrictEqual({
    ssid: "SSID-1",
    bssid: "fe:dc:ba:09:87:01",
    channel: 1,
    phyMode: "802.11ax",
    security: "Open",
    rssi: -81,
    signalStrength: 31,
    band: 2.4,
    txRate: 0, // candidates don't give txRate
    channelWidth: 0,
    active: false, // not the one that's in service now
  });

  results.forEach(checkEachItem);
});
