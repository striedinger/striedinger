"use client";

import { Text } from "@workspace/ui/components/text";

import { IosSegmentedControl } from "../../../components/ios/ios-segmented-control";

interface VideoSegmentedSettingProps<Value extends string> {
  label: string;
  onChange: (value: Value) => void;
  options: readonly { label: string; value: Value }[];
  value: Value;
}

/** A titled segmented control, the editor's pattern for choosing between a few options. */
export function VideoSegmentedSetting<Value extends string>({
  label,
  onChange,
  options,
  value,
}: VideoSegmentedSettingProps<Value>) {
  return (
    <div className="flex flex-col gap-2">
      <Text className="px-4 text-ios-subheadline font-semibold text-ios-secondary-label">
        {label}
      </Text>
      <IosSegmentedControl label={label} options={options} value={value} onChange={onChange} />
    </div>
  );
}
