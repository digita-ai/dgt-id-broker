/**
 * Represents a parsed JSON object. Mostly used to represent a token payload.
 */
export interface ParsedJSON {
  [key: string]: boolean | number | string | string[] | ParsedJSON;
}
