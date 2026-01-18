// lib/derating/defaults.ts
export const DEFAULTS = {
  ambientTempC: 25,
  arrheniusT0C: 25,
  activationEnergyEv: 0.7,
  stressExponentN: 5,
  minDeratedDM: 0.2,
  minDeratedFOS: 1 / (1 - 0.2), // 1.25
  minTempMarginC: 10,
  boltzmannK_eV_per_K: 8.617e-5,
} as const;
