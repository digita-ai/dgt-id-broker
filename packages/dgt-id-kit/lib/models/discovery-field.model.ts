import { DiscoveryArrayField } from './discovery-array-field.model';
import { DiscoveryStringField } from './discovery-string-field.model';

/**
 * Consist of all discovery fields, string or array
 */
export type DiscoveryField = DiscoveryStringField | DiscoveryArrayField;
