import { IosSkeleton } from "../../../components/ios/ios-skeleton";
import { IosToolScreen } from "../../../components/ios/ios-tool-screen";
import { getTranslator } from "../../../messages/get-translator";
import { getRequestLocale } from "../../get-request-locale";

export default async function ChatLoading() {
  const locale = await getRequestLocale();
  const translate = await getTranslator(locale);

  return (
    <IosToolScreen title={translate("Nearby Chat")}>
      <div aria-busy="true" className="flex flex-col gap-6">
        <div className="flex flex-col items-center gap-2 pt-2">
          <IosSkeleton className="size-[72px] rounded-full" />
          <IosSkeleton className="h-7 w-52" />
          <IosSkeleton className="h-4 w-72 max-w-full" />
          <IosSkeleton className="h-4 w-20" />
        </div>
        <IosSkeleton className="h-11 w-full rounded-[22px]" />
        <div className="flex flex-col gap-3">
          <IosSkeleton className="h-[50px] w-full rounded-full" />
          <IosSkeleton className="h-[50px] w-full rounded-full" />
        </div>
      </div>
    </IosToolScreen>
  );
}
