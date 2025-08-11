"use client";

import * as RadioGroup from "@radix-ui/react-radio-group";
import { SsidStrategy } from "@/lib/types";

export function SsidStrategyPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <RadioGroup.Root
      value={value}
      onValueChange={(v) => onChange(v as SsidStrategy)}
      className="flex gap-4"
    >
      <RadioOption value="same" label="Use current SSID" />
      <RadioOption value="best" label="Seek best SSID" />
    </RadioGroup.Root>
  );
}

function RadioOption({ value, label }: { value: string; label: string }) {
  return (
    <RadioGroup.Item
      value={value}
      className="flex items-center gap-2 rounded-md border border-gray-400
                 px-3 py-2 text-sm outline-none transition
                 hover:bg-gray-50 data-[state=checked]:border-blue-500
                 data-[state=checked]:bg-blue-50"
    >
      {/* bullet indicator */}
      <div
        className="h-4 w-4 rounded-full border border-gray-400 flex items-center
                   justify-center data-[state=checked]:border-blue-500"
      >
        <RadioGroup.Indicator className="flex items-center justify-center">
          <span className="h-2 w-2 rounded-full bg-blue-600" />
        </RadioGroup.Indicator>
      </div>
      {label}
    </RadioGroup.Item>
  );
}
