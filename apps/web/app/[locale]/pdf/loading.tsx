import { IosSkeleton } from "../../../components/ios/ios-skeleton";
import { IosToolScreen } from "../../../components/ios/ios-tool-screen";
import { getPdfTranslator } from "../../../messages/pdf/get-translator";
import { getRequestLocale } from "../../get-request-locale";

export default async function PdfLoading() {
  const locale = await getRequestLocale();
  const translate = await getPdfTranslator(locale);

  return (
    <IosToolScreen title={translate("PDF Optimizer")} contentWidth="48rem">
      <div aria-busy="true" className="flex flex-col gap-2 pt-2">
        <IosSkeleton className="h-64 w-full rounded-[26px]" />
        <IosSkeleton className="mx-5 mt-1 h-4 w-1/2" />
      </div>
    </IosToolScreen>
  );
}
