

// # See if calling a Swift app will return BSSID
// # Build with swiftc -o get-bssid get-bssid.swift

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


