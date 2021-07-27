import { DiscoveryField } from '../models/discovery-field.model';
import { DiscoveryStringField } from '../models/discovery-string-field.model';

export const getIssuerConfig = async (issuer: URL): Promise<any> => {

  const response = await fetch(issuer.toString());

};

export const validateIssuerUrl = async (issuer: string): Promise<boolean> => {

};

export const getDiscoveryInfo =
async <T extends DiscoveryField>(issuer: URL, field: T):
T extends DiscoveryStringField ? Promise<string> : Promise<string[]> => {

};

export const getEndpoint = async (issuer: URL, endpoint: DiscoveryStringField): Promise<string> => {

};
