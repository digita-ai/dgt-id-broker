/**
 * An interface representing a parsed JSON object.
 */
export interface ParsedJSON {
  [key: string]: boolean | number | string | string[] | ParsedJSON;
}
