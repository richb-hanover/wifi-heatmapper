import { expect, test } from "vitest";
import fs from "fs";
import path from "path";
import {
  getCandidateSSIDs,
  getCurrentSSID,
} from "../../src/lib/wifiScanner-macos";

// testing output from `system_profiler -json SPAirPortDeviceType`

// ========= macOS 10.15.7 ===============

test("Parsing macOS 10.15.7 output", () => {
  const profiler_output = JSON.parse(
    fs.readFileSync(path.join(__dirname, "../data/sp_10.15.7.json"), "utf-8"),
  );
  let results = getCandidateSSIDs(profiler_output, "en1");

  expect(results.length).toEqual(17);

  expect(results[0]).toStrictEqual({
    _name: "SSID-10",
    spairport_network_bssid: "fe:dc:ba:09:87:65",
    spairport_network_channel: 44,
    spairport_network_phymode: "802.11n",
    spairport_network_type: "spairport_network_type_station",
    spairport_security_mode: "spairport_security_mode_none",
    spairport_signal_noise: "-51 dBm / 0 dBm",
  });

  results = getCurrentSSID(profiler_output, "en1");
  console.log(`Test routine shows: ${JSON.stringify(results, null, 2)}`);
});

// ========= macOS 15.5 ===============
test("Parsing macOS 15.5 output", () => {
  const profiler_output = JSON.parse(
    fs.readFileSync(path.join(__dirname, "../data/sp_15.5.json"), "utf-8"),
  );
  let results = getCandidateSSIDs(profiler_output, "en0");

  expect(results.length).toEqual(5);

  expect(results[0]).toStrictEqual({
    _name: "SSID-2",
    spairport_network_channel: "6 (2GHz, 20MHz)",
    spairport_network_phymode: "802.11g/n",
    spairport_network_type: "spairport_network_type_station",
    spairport_security_mode: "spairport_security_mode_none",
    spairport_signal_noise: "-39 dBm / -97 dBm",
  });

  results = getCurrentSSID(profiler_output, "en0");
  console.log(`Test routine shows: ${JSON.stringify(results, null, 2)}`);
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
