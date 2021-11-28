/**
 * Saves current map position to `location.hash` as `#{lon}/{lat}/{level}`.
 * Updates map position on `location.hash` change.
 * @class
 */
export function URLLayer(): void;
export class URLLayer {
    /** @param {import('./map').LocMap} map */
    register: (map: import('./map').LocMap) => void;
    /** @param {import('./map').LocMap} map */
    unregister: (map: import('./map').LocMap) => void;
    /** @param {import('./map').LocMap} map */
    update: (map: import('./map').LocMap) => void;
}
