/**
 * Test conversion from `system_profiler -json SPAirPortDeviceType`
 * to WifiResults
 */
import { expect, test } from "vitest";
import fs from "fs";
import path from "path";
import { getCandidateSSIDs } from "../../src/lib/wifiScanner-macos";

// ========= macOS 10.15.7 ===============

test("Parsing macOS 10.15.7 output", () => {
  const profiler_output = JSON.parse(
    fs.readFileSync(path.join(__dirname, "../data/sp_10.15.7.json"), "utf-8"),
  );
  const results = getCandidateSSIDs(profiler_output, "en1");

  expect(results.length).toEqual(17);

  expect(results[0]).toStrictEqual({
    ssid: "SSID-10",
    bssid: "fe:dc:ba:09:87:65",
    channel: 44,
    phyMode: "802.11n",
    security: "None",
    rssi: -51,
    signalStrength: 82,
    band: 5,
    txRate: 0, // candidates don't give txRate
    channelWidth: 0, // macOS 10.15.7 doesn't supply channel width
  });

  // const curSSID = getCurrentSSID(profiler_output, "en1");
  // expect(curSSID).toStrictEqual({
  //   ssid: "SSID-5",
  //   phyMode: "802.11n",
  //   txRate: 145,
  //   channel: 6,
  //   channelWidth: 0, // macOS 10.15.7 doesn't supply channel width
  //   band: 2.4,
  //   bssid: "fe:dc:ba:09:87:65",
  //   security: "None",
  //   rssi: -55,
  //   signalStrength: 75,
  // });
  // console.log(`Test routine shows: ${JSON.stringify(results, null, 2)}`);
});

// ========= macOS 15.5 ===============
test("Parsing macOS 15.5 output", () => {
  const profiler_output = JSON.parse(
    fs.readFileSync(path.join(__dirname, "../data/sp_15.5.json"), "utf-8"),
  );
  const results = getCandidateSSIDs(profiler_output, "en0");

  // console.log(`Test routine shows: ${JSON.stringify(results[0], null, 2)}`);

  expect(results.length).toEqual(1);

  expect(results[0]).toStrictEqual({
    band: 2.4,
    bssid: "",
    channel: 6,
    channelWidth: 20,
    phyMode: "802.11g/n",
    rssi: -39,
    security: "None",
    signalStrength: 100,
    ssid: "SSID-2",
    txRate: 0,
  });
  // console.log(`15.5.json: ${JSON.stringify(results[0])}`);

  // const curSSID = getCurrentSSID(profiler_output, "en0");
  // expect(curSSID).toStrictEqual({
  //   ssid: "SSID-2",
  //   phyMode: "802.11n",
  //   txRate: 144,
  //   channel: 6,
  //   channelWidth: 20,
  //   band: 2.4,
  //   bssid: "",
  //   security: "None",
  //   rssi: -40,
  //   signalStrength: 100,
  // });
  // console.log(`Test routine shows: ${JSON.stringify(curSSID, null, 2)}`);
});

// ========= macOS 15.5 - wifi disabled ===============
test("Parsing macOS 15.5 output with wifi disabled", () => {
  const profiler_output = JSON.parse(
    fs.readFileSync(
      path.join(__dirname, "../data/sp_15.5-wifi-disabled.json"),
      "utf-8",
    ),
  );
  const results = getCandidateSSIDs(profiler_output, "en0");

  expect(results.length).toEqual(0);

  expect(results[0]).toBeUndefined();
});

// ========= macOS 15.5 - not associated with iPhone, no candidate SSIDs ===============
test("Parsing macOS 15.5 - wifi not associated", () => {
  const profiler_output = JSON.parse(
    fs.readFileSync(
      path.join(__dirname, "../data/sp_15.5-no-iPhone.json"),
      "utf-8",
    ),
  );
  const results = getCandidateSSIDs(profiler_output, "en0");

  expect(results.length).toEqual(0);

  expect(results[0]).toBeUndefined();
});

// ========= macOS 12.7.2 ===============

test("Parsing macOS 12.7.2 output", () => {
  const profiler_output = JSON.parse(
    fs.readFileSync(path.join(__dirname, "../data/sp_12.7.2-AP.json"), "utf-8"),
  );
  const results = getCandidateSSIDs(profiler_output, "en0");

  expect(results.length).toEqual(3);

  expect(results[0]).toStrictEqual({
    ssid: "SSID-3",
    bssid: "",
    channel: 149,
    phyMode: "802.11",
    security: "WPA2 Personal",
    rssi: -67,
    signalStrength: 55,
    band: 5,
    txRate: 0, // candidates don't give txRate
    channelWidth: 0, // macOS 10.15.7 doesn't supply channel width
  });

  // const curSSID = getCurrentSSID(profiler_output, "en1");
  // expect(curSSID).toStrictEqual({
  //   ssid: "SSID-5",
  //   phyMode: "802.11n",
  //   txRate: 145,
  //   channel: 6,
  //   channelWidth: 0, // macOS 10.15.7 doesn't supply channel width
  //   band: 2.4,
  //   bssid: "fe:dc:ba:09:87:65",
  //   security: "None",
  //   rssi: -55,
  //   signalStrength: 75,
  // });
  // console.log(`Test routine shows: ${JSON.stringify(results, null, 2)}`);
});
