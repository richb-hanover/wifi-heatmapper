import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { Database, IperfTestProperty, testTypes } from "./types";
import { useCallback } from "react";
import { MeasurementTestType } from "./types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const getDefaults = (): Database => {
  // if (process.env.DEFAULT_CONFIG) {
  //   return JSON.parse(process.env.DEFAULT_CONFIG);
  // }
  return {
    surveyPoints: [],
    floorplanImage: "",
    iperfServer: "",
    apMapping: [],
    testDuration: 10,
  };
};

export const formatMacAddress = (macAddress: string) => {
  return macAddress.replace(/../g, "$&-").toUpperCase().slice(0, -1);
};

export const metricFormatter = (
  value: number,
  metric: MeasurementTestType,
  testType?: keyof IperfTestProperty,
  showSignalStrengthAsPercentage?: boolean
): string => {
  if (metric === testTypes.signalStrength) {
    return showSignalStrengthAsPercentage
      ? `${Math.round(value)}%`
      : `${Math.round(value)} dBm`;
  }
  if (testType === "bitsPerSecond") {
    return `${(value / 1000000).toFixed(2)} Mbps`;
  }
  if (testType === "jitterMs") {
    return `${value.toFixed(4)} ms`;
  }
  if (
    testType === "lostPackets" ||
    testType === "retransmits" ||
    testType === "packetsReceived"
  ) {
    return Math.round(value).toString();
  }
  return value.toFixed(2);
};
