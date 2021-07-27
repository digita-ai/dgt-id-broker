import { DiscoveryArrayField } from './discovery-array-field.model';
import { DiscoveryStringField } from './discovery-string-field.model';

/**
 * Consist of all OIDC discovery fields, returning either a string or an array
 */
export type DiscoveryField = DiscoveryStringField | DiscoveryArrayField;
