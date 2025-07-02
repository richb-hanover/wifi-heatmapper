#! /bin/sh

# Run system_profiler to get list of current SSIDs available
# [presumably, code would pick the strongest]
# and pass that SSID down to the "-setairportnetwork" command

# Wrap the whole thing in `time` (e.g. time test-networksetup.sh HBTL)
# then wait until "ping 1.1.1.1" returns an actual response
# then Ctl-C to see the time needed to switch to that SSID

# Observations:
# - usually takes 8-12 seconds to switch
# - Not much faster to "switch" to the same SSID

# test networksetup and system_profiler
# networksetup -setairportpower en0 on
# sleep 2
# networksetup -setairportnetwork en0 "HomeWiFi"
# system_profiler -json SPAirPortDataType 

# system_profiler -json SPAirPortDataType | \
# # jq '.spairport_current_network_information'
# jq '.. | objects | select(has("spairport_current_network_information")) | .spairport_current_network_information' 

# echo "=== off ==="
# networksetup -setairportpower en0 off
# echo "=== on ==="
# networksetup -setairportpower en0 on
# sleep 1

echo "=== system_profiler ==="
system_profiler -json SPAirPortDataType > junk.json
echo "=== join $1 ==="
networksetup -setairportnetwork en0 "$1"
echo "=== pinging ==="
ping 1.1.1.1

