// Claude sez...
// Compile with necessary frameworks
// swiftc -framework CoreWLAN -framework Security -o wifi-connect wifi-connect.swift

// Usage:
// # Connect to a specific SSID
// sudo ./wifi-connect "Verizon_V9VZ4X"

// # Check exit code
// echo $?

// v27

import Foundation
import CoreWLAN
import Security

// Exit codes
enum ExitCode: Int32 {
    case success = 0
    case ssidNotFound = 1
    case authenticationFailed = 2
    case keychainError = 3
    case generalError = 4
    case noArguments = 5
    case interfaceError = 6
}

class WiFiConnector {
    
    func getPasswordFromKeychain(for ssid: String) -> String? {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: "AirPort",
            kSecAttrAccount as String: ssid,
            kSecMatchLimit as String: kSecMatchLimitOne,
            kSecReturnData as String: true
        ]
        
        var dataTypeRef: AnyObject?
        let status = SecItemCopyMatching(query as CFDictionary, &dataTypeRef)
        
        if status == errSecSuccess,
           let data = dataTypeRef as? Data,
           let password = String(data: data, encoding: .utf8) {
            return password
        }
        
        return nil
    }
    
    func connectToWiFi(ssid: String) -> ExitCode {
        guard let wifiInterface = CWWiFiClient.shared().interface() else {
            fputs("Error: Unable to access Wi-Fi interface\n", stderr)
            return .interfaceError
        }
        
        // Get password from keychain
        guard let password = getPasswordFromKeychain(for: ssid) else {
            fputs("Error: No password found in keychain for SSID '\(ssid)'\n", stderr)
            return .keychainError
        }
        
        // Scan for the specific network with retry logic for iPhone hotspots
        var targetNetwork: CWNetwork?
        let maxRetries = 3
        
        for attempt in 1...maxRetries {
            do {
                let networks = try wifiInterface.scanForNetworks(withName: ssid)
                if let network = networks.first {
                    targetNetwork = network
                    break
                }
                
                // If not found and this isn't the last attempt, wait a bit
                if attempt < maxRetries {
                    Thread.sleep(forTimeInterval: 2.0)
                }
            } catch {
                if attempt == maxRetries {
                    fputs("Error: Failed to scan for networks: \(error.localizedDescription)\n", stderr)
                    return .generalError
                }
                Thread.sleep(forTimeInterval: 1.0)
            }
        }
        
        guard let network = targetNetwork else {
            fputs("Error: SSID '\(ssid)' not found in available networks\n", stderr)
            return .ssidNotFound
        }
        
        // Attempt to connect
        do {
            try wifiInterface.associate(to: network, password: password)
            
            // Wait and verify connection
            Thread.sleep(forTimeInterval: 3.0)
            
            if let currentSSID = wifiInterface.ssid(), currentSSID == ssid {
                // Success - no output to stdout
                return .success
            } else {
                fputs("Error: Connection attempt completed but not connected to '\(ssid)'\n", stderr)
                return .authenticationFailed
            }
            
        } catch let error as NSError {
            // Handle specific CoreWLAN errors
            switch error.code {
            case 0:
                return .success
            case -3900, -3905:
                fputs("Error: Authentication failed for '\(ssid)' - incorrect password\n", stderr)
                return .authenticationFailed
            case -3902:
                fputs("Error: Network '\(ssid)' not found\n", stderr)
                return .ssidNotFound
            default:
                fputs("Error: Failed to connect to '\(ssid)': \(error.localizedDescription)\n", stderr)
                return .generalError
            }
        }
    }
}

// Main execution
func main() {
    let arguments = CommandLine.arguments
    
    guard arguments.count == 2 else {
        fputs("Usage: \(arguments[0]) <SSID>\n", stderr)
        exit(ExitCode.noArguments.rawValue)
    }
    
    let ssid = arguments[1]
    let connector = WiFiConnector()
    let result = connector.connectToWiFi(ssid: ssid)
    
    exit(result.rawValue)
}

main()