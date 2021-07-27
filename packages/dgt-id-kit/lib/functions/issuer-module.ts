import { DiscoveryField } from '../models/discovery-field.model';
import { DiscoveryStringField } from '../models/discovery-string-field.model';
import { Issuer } from '../models/issuer.model';

export const getIssuerConfig = async (issuer: Issuer): Promise<any> => {

  const response = await fetch(issuer.url.toString());

};

export const validateIssuerUrl = async (issuer: string): Promise<boolean> => {

};

export const getDiscoveryInfo =
async <T extends DiscoveryField>(issuer: URL, field: T):
T extends DiscoveryStringField ? Promise<string> : Promise<string[]> => {

};

export const getEndpoint = async (issuer: Issuer, endpoint: DiscoveryStringField): Promise<string> => {

};
