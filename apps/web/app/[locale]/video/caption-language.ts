/**
 * Whisper's language codes, which are ISO 639-1 apart from Javanese, mapped to the ISO 639-2/T
 * codes MP4 subtitle tracks are tagged with.
 */
const iso6392ByWhisperCode = new Map(
  (
    "af:afr am:amh ar:ara as:asm az:aze ba:bak be:bel bg:bul bn:ben bo:bod br:bre bs:bos ca:cat " +
    "cs:ces cy:cym da:dan de:deu el:ell en:eng es:spa et:est eu:eus fa:fas fi:fin fo:fao fr:fra " +
    "gl:glg gu:guj ha:hau haw:haw he:heb hi:hin hr:hrv ht:hat hu:hun hy:hye id:ind is:isl it:ita " +
    "ja:jpn jw:jav ka:kat kk:kaz km:khm kn:kan ko:kor la:lat lb:ltz ln:lin lo:lao lt:lit lv:lav " +
    "mg:mlg mi:mri mk:mkd ml:mal mn:mon mr:mar ms:msa mt:mlt my:mya ne:nep nl:nld nn:nno no:nor " +
    "oc:oci pa:pan pl:pol ps:pus pt:por ro:ron ru:rus sa:san sd:snd si:sin sk:slk sl:slv sn:sna " +
    "so:som sq:sqi sr:srp su:sun sv:swe sw:swa ta:tam te:tel tg:tgk th:tha tk:tuk tl:tgl tr:tur " +
    "tt:tat uk:ukr ur:urd uz:uzb vi:vie yi:yid yo:yor yue:yue zh:zho"
  )
    .split(" ")
    .map(function splitPair(pair) {
      const [whisperCode = "", iso6392 = ""] = pair.split(":");
      return [whisperCode, iso6392];
    }),
);

/** The language as a BCP 47 tag; Whisper writes Javanese as `jw` rather than `jv`. */
export function toLanguageTag(whisperCode: string) {
  return whisperCode === "jw" ? "jv" : whisperCode;
}

export function toIso6392(whisperCode: string) {
  return iso6392ByWhisperCode.get(whisperCode);
}
