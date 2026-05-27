export const qcfFontBaseUrl = "https://verses.quran.foundation/fonts/quran/hafs";

export function getQcfV2FontName(pageNumber: number) {
  return `p${pageNumber}-v2`;
}

export function getQcfV2FontUrl(pageNumber: number) {
  return `${qcfFontBaseUrl}/v2/woff2/p${pageNumber}.woff2`;
}
