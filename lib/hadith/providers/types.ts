import { type NormalizedHadith, type ParsedHadithReference } from "../types";

export type HadithLookupProvider = {
  id: string;
  lookup(reference: ParsedHadithReference): Promise<NormalizedHadith>;
};
