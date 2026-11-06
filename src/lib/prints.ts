import prints from "../data/prints.json";

export interface Print {
  width: number;
  height: number;
  author: string;
  license: string;
  licenseUrl: string;
  page: string;
}

const table: Record<string, Print | undefined> = prints;

export const printFor = (id: string): Print | undefined => table[id];
