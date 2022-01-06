/**
 * Saves current map position to `location.hash` as `#{lon}/{lat}/{level}`.
 * Updates map position on `location.hash` change.
 * @class
 * @param {number} [lonLatPrec] location precision
 * @param {number} [levelPrec] level precision
 */
export function URLLayer(lonLatPrec?: number | undefined, levelPrec?: number | undefined): void;
export class URLLayer {
    /**
     * Saves current map position to `location.hash` as `#{lon}/{lat}/{level}`.
     * Updates map position on `location.hash` change.
     * @class
     * @param {number} [lonLatPrec] location precision
     * @param {number} [levelPrec] level precision
     */
    constructor(lonLatPrec?: number | undefined, levelPrec?: number | undefined);
    /** @param {import('./map').LocMap} map */
    register: (map: import('./map').LocMap) => void;
    /** @param {import('./map').LocMap} map */
    unregister: (map: import('./map').LocMap) => void;
    /** @param {import('./map').LocMap} map */
    update: (map: import('./map').LocMap) => void;
}
