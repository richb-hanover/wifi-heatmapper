# Test cases

* wifi disabled
* wifi enabled, but no SSIDs have ever been associated 
* Wee Otter, without iPhone hotspot and with absent signal strength for other SSIDs
* Somewhere with no open SSIDs
* wifi enabled, connected to a weak SSID
* wifi enabled, connected to a strong SSID 
* wifi enabled, but don't have PW for strongest SSID (have never associated with it)
  (Set a SpareRouter nearby, tell OS to forget that SSID)

## Measurement process

All this happens server-side.
Server should initialize a global `WifiResults` object at startup,
then use that to compare for better signal strength.
Client's only action is to ask, "What's the signal strength now?"

1. Retain current SSID, BSSID, and signalStrength in global state
2. Scan local wifi environment
3. Handle error if no SSIDs available or wifi disabled
4. Optimization: If already using the BSSID with the
   strongest signal, don't bother to reassociate
5. Or if we are currently using that SSID and signal strength
   is within two dBm of the saved value, don't bother
6. Otherwise, tell the OS to reassociate with the strongest SSID
7. If it succeeds, update global SSID, BSSID and signal strength
8. If any of this fails, handle error cases:

* wifi disabled
* no SSIDs from the scan have signal strengths (Wee Otter)
* no SSIDs from the scan have ever been used
* don't have PW to strongest SSID (same case as above)
   That strong signal might be your refrigerator, AC unit, lightbulb, etc.
* Maybe advanced config keeps a list of SSIDs to ignore

In #3 above, GUI needs to say,

> SSID 'foo' exists, but wifi-heatmapper cannot connect to it.  
>
> * Connect manually by providing the password _or_
> * Ignore it by adding it to list in the Advanced Config
> so that SSID will never be offered again

## API

Current API:

* **preflightSettings()** - return nice error message if not ready to go
* **checkIperfServer()** - ensure that the iperf3 server is available, return a nice error message or ""
* **restartWifi()** - actually turn off Wi-Fi, then re-enable,
  and wait until `ipconfig` returns a real address
* **scanWifi()** - loop until txRate is non-zero
  (meaning that it has fully re-associated) then
  return a WifiResults from `wdutil` output.

Desired API:

* **preflightSettings()** - _same_
* **checkIperfServer()** - _same_
* **restartWifi()** - _deprecated_
* **scanWifi()** - _deprecated_
* **scanForSSIDs()** - Survey the wifi, and
  return an array of WifiResults, sorted
  by signalStrength along with a status of:
  * "" - first item is best
  * "Wifi disabled"
  * "Can't connect..."
  * (maybe) "Current SSID (xxx) is weak"
  * ... etc. 
* **connectToWifi(SSID)** - associate with the named
  SSID, return the WifiResults and a status string.
  May need to finagle around until connection comes back.
* **getCurrentWifi()** - return WifiResults and status string
* **getRecentSSIDs()** - return an array of recently-connected-to
  SSIDs (we might only choose from these...)
