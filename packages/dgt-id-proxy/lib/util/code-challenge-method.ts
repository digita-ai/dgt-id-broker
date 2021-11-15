export type Code = string;

/**
 * An interface that represents a code challenge & method and an optional initially provided state.
 */
export interface ChallengeAndMethod {
  challenge: string;
  method: string;
  initialState?: boolean;
}
