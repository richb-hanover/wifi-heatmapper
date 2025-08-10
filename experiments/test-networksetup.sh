#! /bin/sh

# Run system_profiler to get list of current SSIDs available
# [presumably, code would pick the strongest]
# and pass that SSID down to the "-setairportnetwork" command

# USAGE: test-network.sh en0 "wifi ssid name"

# Wrap the whole thing in `time` (e.g. time test-networksetup.sh SSID)
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
# networksetup -setairportpower "$1" off
# echo "=== on ==="
# networksetup -setairportpower "$1" on
# sleep 1

echo "=== system_profiler ==="
# system_profiler -json SPAirPortDataType > junk.json
system_profiler -json SPAirPortDataType | \
jq '.. | objects | select(has("spairport_current_network_information")) | .spairport_current_network_information' 
# # jq '.. | objects | select(has("spairport_airport_other_local_wireless_networks")) | .spairport_airport_other_local_wireless_networks' 

# system_profiler -json SPAirPortDataType | \
# jq '.. | objects | select(has("spairport_airport_other_local_wireless_networks")) | .spairport_airport_other_local_wireless_networks' 

echo "=== turn en0 off ==="
sudo ifconfig en0 down
sleep 2

echo "=== turn en0 on ==="
sudo ifconfig en0 up
sleep 10

echo "=== join $2 on device $1 ==="
sudo networksetup -setairportnetwork "$1" "$2"
echo "=== pinging ==="
ping 1.1.1.1

