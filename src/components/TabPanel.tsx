import * as Tabs from "@radix-ui/react-tabs";
import { useState } from "react";
import { useSettings } from "./GlobalSettings";

import dynamic from "next/dynamic";

const SettingsEditor = dynamic(() => import("@/components/SettingsEditor"), {
  ssr: false,
  loading: () => <div>Loading settings…</div>,
});
const ClickableFloorplan = dynamic(() => import("@/components/Floorplan"), {
  ssr: false,
  loading: () => <div>Loading floor plan…</div>,
});
const Heatmaps = dynamic(
  () => import("@/components/Heatmaps").then((m) => m.Heatmaps),
  {
    ssr: false,
    loading: () => <div>Loading heat maps…</div>,
  },
);
const PointsTable = dynamic(() => import("@/components/PointsTable"), {
  ssr: false,
  loading: () => <div>Loading survey points…</div>,
});

export default function TabPanel() {
  const [activeTab, setActiveTab] = useState("tab1"); // State to track the active tab
  const { settings, surveyPointActions } = useSettings();

  return (
    <div className="w-full p-2">
      {/* Tabs Root with controlled state */}
      <Tabs.Root value={activeTab} onValueChange={setActiveTab}>
        {/* Tab List */}
        <Tabs.List className="flex gap-2 pt-1">
          <Tabs.Trigger
            value="tab1"
            data-radix-collection-item
            className="px-4 py-2.5 text-base font-medium bg-gray-300 text-gray-800 border border-gray-400 border-b-0 rounded-t-md cursor-pointer transition-all duration-300 ease-in-out hover:bg-gray-200 data-[state=active]:bg-white data-[state=active]:text-black data-[state=active]:font-semibold data-[state=active]:border-gray-500"
          >
            Settings
          </Tabs.Trigger>
          <Tabs.Trigger
            value="tab2"
            data-radix-collection-item
            className="px-4 py-2.5 text-base font-medium bg-gray-300 text-gray-800 border border-gray-400 border-b-0 rounded-t-md cursor-pointer transition-all duration-300 ease-in-out hover:bg-gray-200 data-[state=active]:bg-white data-[state=active]:text-black data-[state=active]:font-semibold data-[state=active]:border-gray-500"
          >
            Floor&nbsp;Plan
          </Tabs.Trigger>
          <Tabs.Trigger
            value="tab3"
            data-radix-collection-item
            className="px-4 py-2.5 text-base font-medium bg-gray-300 text-gray-800 border border-gray-400 border-b-0 rounded-t-md cursor-pointer transition-all duration-300 ease-in-out hover:bg-gray-200 data-[state=active]:bg-white data-[state=active]:text-black data-[state=active]:font-semibold data-[state=active]:border-gray-500"
          >
            Heat&nbsp;Maps
          </Tabs.Trigger>
          <Tabs.Trigger
            value="tab4"
            data-radix-collection-item
            className="px-4 py-2.5 text-base font-medium bg-gray-300 text-gray-800 border border-gray-400 border-b-0 rounded-t-md cursor-pointer transition-all duration-300 ease-in-out hover:bg-gray-200 data-[state=active]:bg-white data-[state=active]:text-black data-[state=active]:font-semibold data-[state=active]:border-gray-500"
          >
            Survey&nbsp;Points
          </Tabs.Trigger>
        </Tabs.List>

        {/* Tab Content */}
        <Tabs.Content value="tab1" className="p-4">
          <SettingsEditor />
        </Tabs.Content>

        <Tabs.Content value="tab2" className="p-4">
          <ClickableFloorplan />
        </Tabs.Content>

        <Tabs.Content value="tab3" className="p-4">
          <Heatmaps />
        </Tabs.Content>

        <Tabs.Content value="tab4" className="p-4">
          <PointsTable
            data={settings.surveyPoints}
            surveyPointActions={surveyPointActions}
            apMapping={settings.apMapping}
          />
        </Tabs.Content>
      </Tabs.Root>
    </div>
  );
}
