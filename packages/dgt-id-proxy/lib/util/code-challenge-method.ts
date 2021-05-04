export type Code = string;

export interface ChallengeAndMethod {
  challenge: string;
  method: string;
  clientState?: string;
}
