import { IosSkeleton } from "../../../components/ios/ios-skeleton";

export default function CardLoading() {
  return (
    <div aria-busy="true" className="flex flex-col gap-5">
      <IosSkeleton className="h-[52px] w-full rounded-[22px]" />
      <IosSkeleton className="h-[50px] w-full rounded-full" />
    </div>
  );
}
