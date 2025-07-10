

// # See if calling a Swift app will return BSSID
// # Build with swiftc -o get-bssid get-bssid.swift

// RESULTS: sudo ./get-bssid does NOT return a BSSID Result is:
//
// % sudo ./get-bssid
// Password:
// Interface: en0
// No BSSID found.
// No BSSID found

import CoreWLAN

if let iface = CWWiFiClient.shared().interface() {
    print("Interface: \(iface.interfaceName ?? "unknown")")
    if let bssid = iface.bssid() {
        print("BSSID: \(bssid)")
    } else {
        print("No BSSID found.")
    }
} else {
    print("No Wi-Fi interface available.")
}


