/**
 * Loads and draw tiles via {@linkcode TileContainer}.
 * Disables tile load while zooming.
 * @class
 * @param {import('./tile_container').TileContainer} tileHost
 */
export function TileLayer(tileHost: import('./tile_container').TileContainer): void;
export class TileLayer {
    /**
     * Loads and draw tiles via {@linkcode TileContainer}.
     * Disables tile load while zooming.
     * @class
     * @param {import('./tile_container').TileContainer} tileHost
     */
    constructor(tileHost: import('./tile_container').TileContainer);
    /** @param {import('./map').LocMap} map */
    unregister: (map: import('./map').LocMap) => void;
    /** @param {import('./map').LocMap} map */
    redraw: (map: import('./map').LocMap) => void;
    /** @type {import('./map').MapEventHandlers} */
    onEvent: import('./map').MapEventHandlers;
}
