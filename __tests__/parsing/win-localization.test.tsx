/**
 * Test parsing for Windows of the `netsh wlan show interfaces` in
 *   several localized languages
 */

import { expect, test, describe, it, beforeAll } from "vitest";
// import fs from "fs";
// import path from "path";
// import { parseNetshInterfaces } from "../../src/lib/wifiScanner-windows";
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

test("check 'Nom'", () => {
  expect(reverseLookupTable.get("Nom")).toBe("name");
});
test("check 'Kanal'", () => {
  expect(reverseLookupTable.get("Kanal")).toBe("channel");
});
test("check 'Tipo de radio'", () => {
  expect(reverseLookupTable.get("Tipo de radio")).toBe("phyMode");
});
test("check 'Authentification'", () => {
  expect(reverseLookupTable.get("Authentification")).toBe("security");
});
test("check 'Velocità trasmissione (Mbps)'", () => {
  expect(reverseLookupTable.get("Velocità trasmissione (Mbps)")).toBe("txRate");
});
test("check 'Name'", () => {
  expect(reverseLookupTable.get("Name")).toBe("name");
});
test("check 'Nom'", () => {
  expect(reverseLookupTable.get("Señal")).toBe("signalStrength");
});
