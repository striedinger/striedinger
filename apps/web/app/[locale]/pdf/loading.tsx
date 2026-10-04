import { IosSkeleton } from "../../../components/ios/ios-skeleton";

export default function PdfLoading() {
  return (
    <div aria-busy="true" className="flex flex-col gap-2 pt-2">
      <IosSkeleton className="h-64 w-full rounded-ios-2xl" />
      <IosSkeleton className="mx-5 mt-1 h-4 w-1/2" />
    </div>
  );
}
