// wifi-password-tool 

// swiftc -framework Security -o wifi-password-tool wifi-password-tool.swift

// WIFI_USERNAME="your_username" WIFI_PASSWORD="your_sudo_password" ./wifi-password-tool "MyNetwork"






import Foundation
import Security

// Exit codes
enum ExitCode: Int32 {
    case success = 0
    case ssidNotFound = 1
    case credentialsError = 2
    case generalError = 3
    case noArguments = 4
}

class WiFiPasswordRetriever {
    
    func getPasswordFromKeychain(for ssid: String, username: String? = nil, password: String? = nil) -> String? {
        // First try the standard Security framework approach (works when not running as root)
        if getuid() != 0 {
            return getPasswordDirectly(for: ssid)
        }
        
        // If running as root and credentials provided, use security command
        if let user = username, let pass = password {
            return getPasswordWithCredentials(for: ssid, username: user, password: pass)
        }
        
        // Fallback to direct approach
        return getPasswordDirectly(for: ssid)
    }
    
    private func getPasswordDirectly(for ssid: String) -> String? {
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
    
    private func getPasswordWithCredentials(for ssid: String, username: String, password: String) -> String? {
        // Create a script that handles the authentication
        let script = """
#!/bin/bash
echo '\(password)' | sudo -S security find-generic-password -wa '\(ssid)' -s 'AirPort' 2>/dev/null
"""
        
        let tempDir = NSTemporaryDirectory()
        let scriptPath = tempDir + "get_wifi_password_\(UUID().uuidString).sh"
        
        do {
            // Write the script
            try script.write(to: URL(fileURLWithPath: scriptPath), atomically: true, encoding: .utf8)
            
            // Make it executable
            let chmodTask = Process()
            chmodTask.executableURL = URL(fileURLWithPath: "/bin/chmod")
            chmodTask.arguments = ["+x", scriptPath]
            try chmodTask.run()
            chmodTask.waitUntilExit()
            
            // Execute the script
            let task = Process()
            task.executableURL = URL(fileURLWithPath: "/bin/bash")
            task.arguments = [scriptPath]
            
            let pipe = Pipe()
            let errorPipe = Pipe()
            task.standardOutput = pipe
            task.standardError = errorPipe
            
            try task.run()
            task.waitUntilExit()
            
            // Clean up the script
            try? FileManager.default.removeItem(atPath: scriptPath)
            
            if task.terminationStatus == 0 {
                let data = pipe.fileHandleForReading.readDataToEndOfFile()
                let output = String(data: data, encoding: .utf8)?.trimmingCharacters(in: .whitespacesAndNewlines)
                
                if let password = output, !password.isEmpty {
                    return password
                }
            }
            
        } catch {
            // Clean up on error
            try? FileManager.default.removeItem(atPath: scriptPath)
        }
        
        return nil
    }
    
    func retrievePassword(for ssid: String) -> ExitCode {
        // Get credentials from environment if available
        let username = ProcessInfo.processInfo.environment["WIFI_USERNAME"]
        let password = ProcessInfo.processInfo.environment["WIFI_PASSWORD"]
        
        guard let wifiPassword = getPasswordFromKeychain(for: ssid, username: username, password: password) else {
            fputs("Error: No password found for SSID '\(ssid)'\n", stderr)
            return .ssidNotFound
        }
        
        // Output the password to stdout
        print(wifiPassword)
        return .success
    }
}

// Main execution
func main() {
    let arguments = CommandLine.arguments
    
    guard arguments.count == 2 else {
        fputs("Usage: \(arguments[0]) <SSID>\n", stderr)
        fputs("Environment variables: WIFI_USERNAME, WIFI_PASSWORD (for sudo access)\n", stderr)
        exit(ExitCode.noArguments.rawValue)
    }
    
    let ssid = arguments[1]
    let retriever = WiFiPasswordRetriever()
    let result = retriever.retrievePassword(for: ssid)
    
    exit(result.rawValue)
}

main()