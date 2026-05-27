export type ReciterId = "alafasy" | "husary" | "minshawi";

export type Reciter = {
  id: ReciterId;
  displayName: string;
  audioBaseUrl: string;
};

export const reciters: Reciter[] = [
  {
    id: "alafasy",
    displayName: "Mishary Alafasy",
    audioBaseUrl: "https://everyayah.com/data/Alafasy_128kbps",
  },
  {
    id: "husary",
    displayName: "Husary",
    audioBaseUrl: "https://everyayah.com/data/Husary_128kbps",
  },
  {
    id: "minshawi",
    displayName: "Minshawi",
    audioBaseUrl: "https://everyayah.com/data/Minshawy_Murattal_128kbps",
  },
];

export function getReciter(reciterId: ReciterId) {
  return reciters.find((reciter) => reciter.id === reciterId) ?? reciters[0];
}
