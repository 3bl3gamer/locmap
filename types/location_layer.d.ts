/**
 * Watches current geolocation, draws a cross or a circle (depending on accuracy) on the map.
 * @class
 */
export function LocationLayer(): void;
export class LocationLayer {
    /** @param {import('./map').LocMap} map */
    register: (map: import('./map').LocMap) => void;
    /** @param {import('./map').LocMap} map */
    unregister: (map: import('./map').LocMap) => void;
    /** @param {import('./map').LocMap} map */
    redraw: (map: import('./map').LocMap) => void;
}
