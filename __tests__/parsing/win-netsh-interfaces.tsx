/**
 * Test parsing for Windows of the `netsh wlan show interfaces` in
 *   several localized languages
 */

import { expect, test, describe, it, beforeAll } from "vitest";
import fs from "fs";
import path from "path";
import { parseNetshOutput } from "../../src/lib/wifiScanner-windows";
import { initLocalization } from "../../src/lib/localization";

let reverseLookupTable: Map<string, string>;

beforeAll(async () => {
  reverseLookupTable = await initLocalization(); // build the structure
});

describe("Checking localization code", () => {
  it("should use the preloaded structure", () => {
    expect(reverseLookupTable).toBeDefined();
  });
});

test("parsing netsh output where no labels match", () => {
  const netsh_output = fs.readFileSync(
    path.join(__dirname, "../data/win-netsh-interfaces-no-match.txt"),
    "utf-8",
  );

  expect(() => parseNetshOutput(reverseLookupTable, netsh_output)).toThrow(
    `Could not read Wi-Fi info. Perhaps wifi-heatmapper is not localized for your system. See https://github.com/hnykda/wifi-heatmapper/issues/26 for details.`,
  );
});

test("parsing english netsh output", () => {
  const netsh_output = fs.readFileSync(
    path.join(__dirname, "../data/win-netsh-interfaces-en.txt"),
    "utf-8",
  );
  const output = parseNetshOutput(reverseLookupTable, netsh_output);
  expect(output).toStrictEqual({
    ssid: "SomeSSID",
    bssid: "1234567890ac",
    rssi: -75,
    signalStrength: 42,
    channel: 44,
    band: 5, // 5GHz since channel is > 14
    channelWidth: 0, // Windows doesn't provide this info
    txRate: 103,
    phyMode: "802.11ax",
    security: "WPA2-Personal",
    active: false,
  });
});

test("parsing italian netsh output", () => {
  const netsh_output = fs.readFileSync(
    path.join(__dirname, "../data/win-netsh-interfaces-it.txt"),
    "utf-8",
  );
  const output = parseNetshOutput(reverseLookupTable, netsh_output);
  expect(output).toStrictEqual({
    ssid: "SomeSSID",
    bssid: "12345610f7a8",
    rssi: -49,
    signalStrength: 85,
    channel: 4,
    band: 2.4, // 2.4GHz since channel is <= 14
    channelWidth: 0, // Windows doesn't provide this info
    txRate: 130,
    phyMode: "802.11n",
    security: "WPA2-Personal",
    active: false,
  });
});

test("parsing German netsh output", () => {
  const netsh_output = fs.readFileSync(
    path.join(__dirname, "../data/win-netsh-interfaces-de.txt"),
    "utf-8",
  );
  const output = parseNetshOutput(reverseLookupTable, netsh_output);
  expect(output).toStrictEqual({
    ssid: "SomeSSID",
    bssid: "1234567890ab",
    rssi: -74,
    signalStrength: 43,
    channel: 116,
    band: 5, // 2.4GHz since channel is <= 14
    channelWidth: 0, // Windows doesn't provide this info
    txRate: 300,
    phyMode: "802.11ac",
    security: "WPA2-Enterprise",
    active: false,
  });
});

test("parsing French netsh output", () => {
  const netsh_output = fs.readFileSync(
    path.join(__dirname, "../data/win-netsh-interfaces-fr.txt"),
    "utf-8",
  );
  const output = parseNetshOutput(reverseLookupTable, netsh_output);
  expect(output).toStrictEqual({
    ssid: "SomeSSID",
    bssid: "1234567890ab",
    rssi: -61,
    signalStrength: 65,
    channel: 144,
    band: 5, // 2.4GHz since channel is <= 14
    channelWidth: 0, // Windows doesn't provide this info
    txRate: 310,
    phyMode: "802.11ax",
    security: "WPA2 - Personnel",
    active: false,
  });
});
