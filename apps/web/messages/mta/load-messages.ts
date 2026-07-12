import type { Locale, TranslationCatalog } from "@workspace/i18n";

import type { messages as englishMessages } from "./en";
export async function loadMtaMessages(
  locale: Locale,
): Promise<TranslationCatalog<typeof englishMessages>> {
  const localizedSearchErrors: Readonly<Record<Locale, string>> = {
    en: "We couldn't find that location. Try a full NYC address or neighborhood.",
    es: "No encontramos esa ubicación. Prueba una dirección completa de NYC o un barrio.",
    de: "Dieser Standort wurde nicht gefunden. Versuche eine vollständige NYC-Adresse oder ein Viertel.",
    it: "Posizione non trovata. Prova un indirizzo completo di NYC o un quartiere.",
    fr: "Lieu introuvable. Essayez une adresse complète de NYC ou un quartier.",
    pt: "Não encontramos esse local. Tente um endereço completo de NYC ou um bairro.",
    zh: "找不到该位置。请尝试输入完整的纽约市地址或街区。",
    ja: "場所が見つかりません。NYCの完全な住所または地区名を入力してください。",
  };
  const localizedArrivalErrors: Readonly<Record<Locale, readonly [string, string]>> = {
    en: [
      "Live MTA arrivals are temporarily unavailable. Please try again.",
      "No upcoming trains are currently reported for this stop.",
    ],
    es: [
      "Las llegadas en vivo de MTA no están disponibles temporalmente. Inténtalo de nuevo.",
      "No hay próximos trenes reportados para esta estación.",
    ],
    de: [
      "Live-MTA-Ankünfte sind vorübergehend nicht verfügbar. Bitte versuche es erneut.",
      "Für diese Station sind derzeit keine kommenden Züge gemeldet.",
    ],
    it: [
      "Gli arrivi MTA in tempo reale non sono temporaneamente disponibili. Riprova.",
      "Nessun treno in arrivo è attualmente segnalato per questa fermata.",
    ],
    fr: [
      "Les arrivées MTA en direct sont temporairement indisponibles. Réessayez.",
      "Aucun prochain métro n’est actuellement signalé pour cette station.",
    ],
    pt: [
      "As chegadas ao vivo da MTA estão temporariamente indisponíveis. Tente novamente.",
      "Nenhum próximo trem foi informado para esta estação.",
    ],
    zh: ["MTA 实时到站信息暂时不可用。请重试。", "该站目前没有报告即将到达的列车。"],
    ja: [
      "MTAのリアルタイム到着情報は一時的に利用できません。もう一度お試しください。",
      "この駅では現在、到着予定の電車が報告されていません。",
    ],
  };
  const localizedFilterLabels: Readonly<Record<Locale, readonly [string, string]>> = {
    en: ["Filter by train", "All trains"],
    es: ["Filtrar por tren", "Todos los trenes"],
    de: ["Nach Zug filtern", "Alle Züge"],
    it: ["Filtra per treno", "Tutti i treni"],
    fr: ["Filtrer par métro", "Tous les métros"],
    pt: ["Filtrar por trem", "Todos os trens"],
    zh: ["按列车筛选", "所有列车"],
    ja: ["電車で絞り込む", "すべての電車"],
  };
  const localizedCarouselLabels: Readonly<Record<Locale, readonly [string, string]>> = {
    en: ["Previous trains", "Next trains"],
    es: ["Trenes anteriores", "Trenes siguientes"],
    de: ["Vorherige Züge", "Nächste Züge"],
    it: ["Treni precedenti", "Treni successivi"],
    fr: ["Métros précédents", "Métros suivants"],
    pt: ["Trens anteriores", "Próximos trens"],
    zh: ["上一组列车", "下一组列车"],
    ja: ["前の電車", "次の電車"],
  };
  type RuntimeMessage =
    | "We couldn't find that location. Try a full NYC address or neighborhood."
    | "Live MTA arrivals are temporarily unavailable. Please try again."
    | "No upcoming trains are currently reported for this stop."
    | "Filter by train"
    | "All trains"
    | "Previous trains"
    | "Next trains";
  function withSearchError(
    catalog: Omit<TranslationCatalog<typeof englishMessages>, RuntimeMessage>,
  ) {
    const arrivalMessages = localizedArrivalErrors[locale];
    const filterLabels = localizedFilterLabels[locale];
    const carouselLabels = localizedCarouselLabels[locale];
    return {
      ...catalog,
      "We couldn't find that location. Try a full NYC address or neighborhood.":
        localizedSearchErrors[locale],
      "Live MTA arrivals are temporarily unavailable. Please try again.": arrivalMessages[0],
      "No upcoming trains are currently reported for this stop.": arrivalMessages[1],
      "Filter by train": filterLabels[0],
      "All trains": filterLabels[1],
      "Previous trains": carouselLabels[0],
      "Next trains": carouselLabels[1],
    };
  }
  switch (locale) {
    case "es":
      return withSearchError((await import("./es")).messages);
    case "de":
      return withSearchError((await import("./de")).messages);
    case "it":
      return withSearchError((await import("./it")).messages);
    case "fr":
      return withSearchError((await import("./fr")).messages);
    case "pt":
      return withSearchError((await import("./pt")).messages);
    case "zh":
      return withSearchError((await import("./zh")).messages);
    case "ja":
      return withSearchError((await import("./ja")).messages);
    default:
      return (await import("./en")).messages;
  }
}
