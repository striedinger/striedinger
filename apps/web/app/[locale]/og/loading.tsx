import { IosSkeleton } from "../../../components/ios/ios-skeleton";
import { IosToolScreen } from "../../../components/ios/ios-tool-screen";
import { getOgTranslator } from "../../../messages/og/get-translator";
import { getRequestLocale } from "../../get-request-locale";

export default async function OpenGraphLoading() {
  const locale = await getRequestLocale();
  const translate = await getOgTranslator(locale);

  return (
    <IosToolScreen title={translate("Open Graph Preview")} contentWidth="42rem">
      <div aria-busy="true" className="flex flex-col gap-5">
        <div className="flex flex-col">
          <IosSkeleton className="h-[52px] w-full rounded-[22px]" />
          <div className="flex flex-col gap-1.5 px-5 pt-2.5">
            <IosSkeleton className="h-3 w-full" />
            <IosSkeleton className="h-3 w-4/5" />
          </div>
        </div>
        <IosSkeleton className="h-[50px] w-full rounded-full" />
      </div>
    </IosToolScreen>
  );
}
