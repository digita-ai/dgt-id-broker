/**
 * describes an OIDC Issuer
 */
export interface Issuer {
  /** The URL to the issuer */
  url: URL;
  /** optional URL to the icon of the issuer */
  icon?: URL;
  /** short title */
  label?: string;
  /** extra information about the issuer */
  description?: string;
}
