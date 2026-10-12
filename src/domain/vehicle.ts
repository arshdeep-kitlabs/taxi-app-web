/**
 * The car a driver has told us about.
 *
 * Which details are asked for — make, model, year, colour, plate — comes from
 * config, so this holds them by name rather than as fixed columns and the set
 * can grow without a change here.
 */
export type DriverVehicle = {
  driverId: string;
  /** Keyed by field name. A select holds the option id, not its label. */
  fields: Record<string, string>;
  updatedAt: string;
};
