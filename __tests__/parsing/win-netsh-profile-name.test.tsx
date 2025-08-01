/**
 * Test parsing for Windows of the `netsh wlan show profile name=...` in
 *   several localized languages
 */

import {
  expect,
  test,
  // describe, it, beforeAll
} from "vitest";
import fs from "fs";
import path from "path";
import { findProfileFromSSID } from "../../src/lib/wifiScanner-windows";

test("parsing English netsh profile name output", () => {
  const netsh_output = fs.readFileSync(
    path.join(__dirname, "../data/win-netsh-profile-name-en.txt"),
    "utf-8"
  );
  let output = findProfileFromSSID(netsh_output, "HBTL5");
  expect(output).toEqual("HBTL5 2");

  output = findProfileFromSSID(netsh_output, "HBTL6"); // bogus second SSID works, too
  expect(output).toEqual("HBTL5 2");

  output = findProfileFromSSID(netsh_output, "HBTL10");
  expect(output).toBe(null);

  // create a bad profile with no "Name" for the profile
  const noProfile = netsh_output
    .split("\n")
    .filter((line) => !line.includes("Name"))
    .join("\n");
  expect(() => findProfileFromSSID(noProfile, "HBTL5")).toThrowError(
    "No profile name found"
  );

  // create a bad profile stripping out "SSID Name" lines
  const noSSID = netsh_output
    .split("\n")
    .filter((line) => !line.includes("SSID name"))
    .join();
  expect(() => findProfileFromSSID(noSSID, "HBTL5")).toThrowError(
    /^Can't find an SSID/
  );
});

test("parsing French netsh profile name output", () => {
  const netsh_output = fs.readFileSync(
    path.join(__dirname, "../data/win-netsh-profile-name-fr.txt"),
    "utf-8"
  );
  let output = findProfileFromSSID(netsh_output, "HBTL5");
  expect(output).toEqual("HBTL5 2");

  output = findProfileFromSSID(netsh_output, "HBTL6"); // bogus second SSID works, too
  expect(output).toEqual("HBTL5 2");

  output = findProfileFromSSID(netsh_output, "HBTL10");
  expect(output).toBe(null);

  // create a bad profile with no "Name" for the profile
  const noProfile = netsh_output
    .split("\n")
    .filter((line) => !line.includes("Name"))
    .join("\n");
  expect(() => findProfileFromSSID(noProfile, "HBTL5")).toThrowError(
    "No profile name found"
  );

  // create a bad profile stripping out "SSID Name" lines
  const noSSID = netsh_output
    .split("\n")
    .filter((line) => !line.includes("SSID name"))
    .join();
  expect(() => findProfileFromSSID(noSSID, "HBTL5")).toThrowError(
    /^Can't find an SSID/
  );
});

// test("parsing German netsh profile name output", () => {
//   const netsh_output = fs.readFileSync(
//     path.join(__dirname, "../data/win-netsh-profile-name-de.txt"),
//     "utf-8"
//   );
//   let output = findProfileFromSSID(netsh_output, "HBTL5");
//   expect(output).toEqual("HBTL5 2");

//   output = findProfileFromSSID(netsh_output, "HBTL6"); // bogus second SSID works, too
//   expect(output).toEqual("HBTL5 2");

//   output = findProfileFromSSID(netsh_output, "HBTL10");
//   expect(output).toBe(null);

//   // create a bad profile with no "Name" for the profile
//   const noProfile = netsh_output
//     .split("\n")
//     .filter((line) => !line.includes("Name"))
//     .join("\n");
//   expect(() => findProfileFromSSID(noProfile, "HBTL5")).toThrowError(
//     "No profile name found"
//   );

//   // create a bad profile stripping out "SSID Name" lines
//   const noSSID = netsh_output
//     .split("\n")
//     .filter((line) => !line.includes("SSID name"))
//     .join();
//   expect(() => findProfileFromSSID(noSSID, "HBTL5")).toThrowError(
//     /^Can't find an SSID/
//   );
// });
