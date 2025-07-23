import { useSettings } from "@/components/GlobalSettings";
import { PasswordInput } from "./PasswordInput";
import { Label } from "@/components/ui/label";
import { PopoverHelper } from "@/components/PopoverHelpText";
import HeatmapAdvancedConfig from "./HeatmapAdvancedConfig";
import MediaDropdown from "./MediaDropdown";
import { NumberInput } from "./NumberInput";

export default function SettingsEditor() {
  const { settings, updateSettings, readNewSettingsFromFile } = useSettings();

  /**
   * handleNewImageFile - given the name of a new image file,
   *    get the settings for that floor image
   * @param theFile - name of the new image file
   */
  function handleNewImageFile(theFile: string): void {
    readNewSettingsFromFile(theFile); // tell the parent about the new file
  }

  return (
    <table className="w-auto">
      <tbody>
        <tr>
          <td className="text-right pr-4">
            <Label htmlFor="Files" className="font-bold text-lg">
              Floor plan&nbsp;
              <PopoverHelper text="Choose a file to be used as a background image, or upload another PNG or JPEG file." />
            </Label>
          </td>
          <td className="max-w-[400px] p-0 m-0">
            <MediaDropdown
              defaultValue={settings.floorplanImageName}
              onChange={(val) => handleNewImageFile(val)}
            />
          </td>
        </tr>

        <tr>
          <td className="text-right pr-4">
            <Label htmlFor="iperfServer" className="font-bold text-lg">
              iperfServer&nbsp;
              <PopoverHelper text="Address of an iperf3 server. Set to 'localhost' to ignore." />
            </Label>{" "}
          </td>
          <td>
            <input
              type="text"
              className="w-full border border-gray-200 rounded-sm p-2 focus:outline-none focus:ring focus:ring-blue-300 focus:border-blue-400"
              value={settings.iperfServerAdrs}
              onChange={(e) =>
                updateSettings({ iperfServerAdrs: e.target.value.trim() })
              }
            />
          </td>
        </tr>

        <tr>
          <td className="text-right pr-4">
            <Label htmlFor="testDuration" className="font-bold text-lg">
              Test Duration&nbsp;
              <PopoverHelper text="Duration of the speed test (in seconds)." />
            </Label>
          </td>
          <td>
            <NumberInput
              // type="number"
              className="w-full border border-gray-200 rounded-sm p-2 focus:outline-none focus:ring focus:ring-blue-300 focus:border-blue-400"
              initialValue={settings.testDuration}
              onChange={(e: number) => updateSettings({ testDuration: e })}
            />
          </td>
        </tr>

        <tr>
          <td className="text-right pr-4">
            <Label htmlFor="sudoPassword" className="font-bold text-lg">
              sudo password&nbsp;
              <PopoverHelper text="Enter the sudo password: required on macOS or Linux." />
            </Label>
          </td>
          <td>
            <PasswordInput
              value={settings.sudoerPassword}
              onChange={(e) => updateSettings({ sudoerPassword: e })}
            />
          </td>
        </tr>

        {/* <tr>
          <td className="text-right pr-4">
            <Label htmlFor="ssidToUse" className="font-bold text-lg">
              SSID to use&nbsp;
              <PopoverHelper text="Use same SSID, or switch to use best (strongest) SSID" />
            </Label>
          </td>
          <td>
            <input
              type="text"
              className="w-full border border-gray-200 rounded-sm p-2 focus:outline-none focus:ring focus:ring-blue-300 focus:border-blue-400"
              value={settings.iperfServerAdrs}
              onChange={(e) =>
                updateSettings({ iperfServerAdrs: e.target.value.trim() })
              }
            />
          </td>
        </tr> */}

        {/* <tr>
          <td>
            <Label htmlFor="ssidsToIgnore">
              SSIDs to ignore&nbsp;
              <PopoverHelper text="A comma-separated list of SSIDs to ignore" />
            </Label>
          </td>
          <td>
            <input
              type="text"
              className="w-full border border-gray-200 rounded-sm p-2 focus:outline-none focus:ring focus:ring-blue-300 focus:border-blue-400"
              value={settings.iperfServerAdrs}
              onChange={(e) =>
                updateSettings({ iperfServerAdrs: e.target.value.trim() })
              }
            />
          </td>
        </tr> */}
        <tr>
          <td colSpan={2} className="text-right">
            <HeatmapAdvancedConfig />
          </td>
        </tr>
      </tbody>
    </table>
  );
}
