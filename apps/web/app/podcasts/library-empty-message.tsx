import { Text } from "@workspace/ui/components/text";

interface LibraryEmptyMessageProps {
  message: string;
}

export function LibraryEmptyMessage({ message }: LibraryEmptyMessageProps) {
  return (
    <Text className="px-8 pt-[16vh] text-center text-[17px] leading-[22px] text-(--ios-secondary-label)">
      {message}
    </Text>
  );
}
