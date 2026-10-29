"use client";

import { type Locale, supportedLocales } from "@workspace/i18n";
import { useParams } from "next/navigation";

interface ErrorMessages {
  description: string;
  home: string;
  /** Contains `{digest}`, the reference the server logged the error under. */
  reference: string;
  retry: string;
  title: string;
}

/**
 * The error screens' few strings, inline rather than through a route's catalog, because
 * error boundaries load with every page and must work even when loading the page failed.
 */
const errorMessages: Record<Locale, ErrorMessages> = {
  en: {
    title: "This page hit a snag",
    description:
      "The problem may be temporary. Try loading this part of the app again, or return home.",
    reference: "Reference: {digest}",
    retry: "Try again",
    home: "Return home",
  },
  es: {
    title: "Esta página tuvo un problema",
    description:
      "Puede ser algo temporal. Intenta cargar esta parte de la app de nuevo o vuelve al inicio.",
    reference: "Referencia: {digest}",
    retry: "Reintentar",
    home: "Volver al inicio",
  },
  de: {
    title: "Auf dieser Seite ist ein Problem aufgetreten",
    description:
      "Das Problem ist vielleicht nur vorübergehend. Lade diesen Teil der App erneut oder kehre zur Startseite zurück.",
    reference: "Referenz: {digest}",
    retry: "Erneut versuchen",
    home: "Zur Startseite",
  },
  it: {
    title: "Questa pagina ha avuto un problema",
    description:
      "Il problema potrebbe essere temporaneo. Prova a ricaricare questa parte dell’app o torna alla home.",
    reference: "Riferimento: {digest}",
    retry: "Riprova",
    home: "Torna alla home",
  },
  fr: {
    title: "Cette page a rencontré un problème",
    description:
      "Le problème est peut-être temporaire. Rechargez cette partie de l’app ou revenez à l’accueil.",
    reference: "Référence : {digest}",
    retry: "Réessayer",
    home: "Retour à l’accueil",
  },
  pt: {
    title: "Esta página teve um problema",
    description:
      "O problema pode ser temporário. Tente carregar esta parte do app novamente ou volte ao início.",
    reference: "Referência: {digest}",
    retry: "Tentar novamente",
    home: "Voltar ao início",
  },
  zh: {
    title: "此页面出现问题",
    description: "问题可能是暂时的。请重新加载应用的这一部分，或返回首页。",
    reference: "参考编号：{digest}",
    retry: "重试",
    home: "返回首页",
  },
  ja: {
    title: "このページで問題が発生しました",
    description:
      "一時的な問題の可能性があります。アプリのこの部分を再読み込みするか、ホームに戻ってください。",
    reference: "参照番号: {digest}",
    retry: "再試行",
    home: "ホームに戻る",
  },
};

function isLocale(value: unknown): value is Locale {
  return supportedLocales.includes(value as Locale);
}

/** The error screen's strings in the route's language, or English above the locale segment. */
export function useErrorMessages() {
  const locale = useParams<{ locale?: string }>().locale;
  return errorMessages[isLocale(locale) ? locale : "en"];
}
