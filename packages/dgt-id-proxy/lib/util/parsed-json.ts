
export interface ParsedJSON {
  [key: string]: boolean | number | string | string[] | ParsedJSON;
}
