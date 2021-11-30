export type Code = string;

/**
 * Represents a code challenge & method (encoding algorithm) and an optional initially provided state.
 */
export interface ChallengeAndMethod {
  challenge: string;
  method: string;
  initialState?: boolean;
}
