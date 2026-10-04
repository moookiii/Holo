/** Shared UV constants deliberately independent of the card catalog. Workers
 * must not import thousands of card registrations to obtain one rectangle. */
export interface CardLayout {
  artwork: [number, number, number, number];
  innerFrame: [number, number, number, number];
}
export const DEFAULT_FOIL_LAYOUT: CardLayout = { artwork: [.12, .18, .88, .70], innerFrame: [.035, .023, .965, .977] };
