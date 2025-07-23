/**
 * Test conversion from `netsh wlan show interfaces mode=bssid`
 * to WifiResults
 */
import { expect, test } from "vitest";
import fs from "fs";
import path from "path";
import { parseNetshNetworks } from "../../src/lib/wifiScanner-windows";
import { WifiResults } from "../../src/lib/types";
// import { initLocalization } from "../../src/lib/localization";

function checkEachItem(item: WifiResults) {
  // console.log(`checkEachItem: ${JSON.stringify(item)}`);
  expect(item.rssi).toBeLessThan(0);
  expect(item.signalStrength).toBeGreaterThanOrEqual(0);
  expect(item.signalStrength).toBeLessThanOrEqual(100);
  expect(item.channelWidth).toBeGreaterThanOrEqual(0);
  expect(item.ssid).toContain("SSID-");
}

// ========= English Win11 'netsh wlan show networks mode=bssid' ===============

test("Parsing English Win11 'netsh ... networks'", () => {
  const netsh_output = fs.readFileSync(
    path.join(__dirname, "../data/win-netsh-networks-en.txt"),
    "utf-8",
  );
  const results = parseNetshNetworks(netsh_output);

  // console.log(`Test routine shows: ${JSON.stringify(results, null, 2)}`);

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

// ========= French Win11 'netsh wlan show networks mode=bssid' ===============

test("Parsing French Win11 'netsh ... networks'", () => {
  const netsh_output = fs.readFileSync(
    path.join(__dirname, "../data/win-netsh-networks-fr.txt"),
    "utf-8",
  );
  const results = parseNetshNetworks(netsh_output);

  // console.log(`Test routine shows: ${JSON.stringify(results, null, 2)}`);

  expect(results.length).toEqual(8);

  expect(results[0]).toStrictEqual({
    ssid: "SSID-1",
    bssid: "fe:dc:ba:09:87:01",
    channel: 149,
    phyMode: "802.11ax",
    security: "Ouvrir",
    rssi: -76,
    signalStrength: 40,
    band: 5,
    txRate: 0, // candidates don't give txRate
    channelWidth: 0,
    active: false, // not the one that's in service now
  });

  results.forEach(checkEachItem);
});

// ========= German Win11 'netsh wlan show networks mode=bssid' ===============

test("Parsing German Win11 'netsh ... networks'", () => {
  const netsh_output = fs.readFileSync(
    path.join(__dirname, "../data/win-netsh-networks-de.txt"),
    "utf-8",
  );
  const results = parseNetshNetworks(netsh_output);

  // console.log(`Test routine shows: ${JSON.stringify(results, null, 2)}`);

  expect(results.length).toEqual(9);

  expect(results[0]).toStrictEqual({
    ssid: "SSID-1",
    bssid: "fe:dc:ba:09:87:01",
    channel: 6,
    phyMode: "802.11n",
    security: "WPA2-Personal",
    rssi: -92,
    signalStrength: 13,
    band: 2.4,
    txRate: 0, // candidates don't give txRate
    channelWidth: 0,
    active: false, // not the one that's in service now
  });

  results.forEach(checkEachItem);
});

// // ========= Italian Win11 'netsh wlan show networks mode=bssid' ===============

// test("Parsing Italian Win11 'netsh ... networks'", () => {
//   const netsh_output = fs.readFileSync(
//     path.join(__dirname, "../data/win-netsh-networks-hbtl.txt"),
//     "utf-8",
//   );
//   const results = parseNetshNetworks(netsh_output);

//  // console.log(`Test routine shows: ${JSON.stringify(results, null, 2)}`);

//   expect(results.length).toEqual(8);

//   expect(results[0]).toStrictEqual({
//     ssid: "SSID-1",
//     bssid: "fe:dc:ba:09:87:01",
//     channel: 1,
//     phyMode: "802.11ax",
//     security: "Open",
//     rssi: -81,
//     signalStrength: 31,
//     band: 2.4,
//     txRate: 0, // candidates don't give txRate
//     channelWidth: 0,
//     active: false, // not the one that's in service now
//   });

//   results.forEach(checkEachItem);
// });
