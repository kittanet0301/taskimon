export const SAVE_VERSION = 3

/** Flip to false before release builds. */
export const TEST_FAST_EVO = true

export const DEV_POINTS_HATCH = TEST_FAST_EVO ? 5 : 100
export const DEV_POINTS_ADULT = TEST_FAST_EVO ? 10 : 500
export const ADULT_MIN_HOURS = TEST_FAST_EVO ? 0 : 48
export const CLICKS_PER_DEV = TEST_FAST_EVO ? 10 : 100
export const KEYS_PER_DEV = TEST_FAST_EVO ? 50 : 500
export const MAX_DEV_PER_HOUR = TEST_FAST_EVO ? 999 : 10
export const RESET_SYSTEM_PIN = '1234'

export { DINO_PREVIEW_COLORS } from './dinoCharacters'
