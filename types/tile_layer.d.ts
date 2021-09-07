/**
 * @class
 * @param {import('./tile_container').TileContainer} tileHost
 */
export function TileLayer(tileHost: import('./tile_container').TileContainer): void;
export class TileLayer {
    /**
     * @class
     * @param {import('./tile_container').TileContainer} tileHost
     */
    constructor(tileHost: import('./tile_container').TileContainer);
    /** @param {import('./map').LocMap} map */
    unregister: (map: import('./map').LocMap) => void;
    /** @param {import('./map').LocMap} map */
    redraw: (map: import('./map').LocMap) => void;
    /** @param {import('./map').LocMap} map */
    update: (map: import('./map').LocMap) => void;
}
