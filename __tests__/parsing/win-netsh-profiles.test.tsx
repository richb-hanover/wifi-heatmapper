/**
 * Test parsing for Windows of the `netsh wlan show profiles` in
 *   several localized languages
 */

import {
  expect,
  test,
  describe, // it, beforeAll
} from "vitest";
import fs from "fs";
import path from "path";
import { parseProfiles } from "../../src/lib/wifiScanner-windows";

describe("Checking profiles code", () => {
  test("parsing netsh wlan show profiles", () => {
    const netsh_output = fs.readFileSync(
      path.join(__dirname, "../data/win-netsh-profiles-en.txt"),
      "utf-8",
    );

    const profileList = parseProfiles(netsh_output);

    expect(profileList.length).toEqual(6);

    expect(profileList).toContain("HBTL5 2");
    expect(profileList).toContain("Fourteen Pro");
    expect(profileList).toContain("HBTL");
    expect(profileList).toContain("CAMERA_5G-1");
    expect(profileList).toContain("PACHNET");
    expect(profileList).toContain("RK Production");
  });
});
