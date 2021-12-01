/**
 * @typedef {object} TileContainer
 * @prop {() => unknown} clearCache
 * @prop {() => number} getTileWidth
 * @prop {(map:import('./map').LocMap,
 *   xShift:number, yShift:number, scale:number,
 *   iFrom:number, jFrom:number, iCount:number, jCount:number, level:number,
 *   shouldLoad: boolean) => unknown} draw
 */
/**
 * Loads and draw tiles using {@linkcode TileContainer}.
 * Disables tile load while zooming.
 * @class
 * @param {TileContainer} tileContainer tile cache/drawer, for example {@linkcode SmoothTileContainer}
 */
export function TileLayer(tileContainer: TileContainer): void;
export class TileLayer {
    /**
     * @typedef {object} TileContainer
     * @prop {() => unknown} clearCache
     * @prop {() => number} getTileWidth
     * @prop {(map:import('./map').LocMap,
     *   xShift:number, yShift:number, scale:number,
     *   iFrom:number, jFrom:number, iCount:number, jCount:number, level:number,
     *   shouldLoad: boolean) => unknown} draw
     */
    /**
     * Loads and draw tiles using {@linkcode TileContainer}.
     * Disables tile load while zooming.
     * @class
     * @param {TileContainer} tileContainer tile cache/drawer, for example {@linkcode SmoothTileContainer}
     */
    constructor(tileContainer: TileContainer);
    /** @param {import('./map').LocMap} map */
    unregister: (map: import('./map').LocMap) => void;
    /** @param {import('./map').LocMap} map */
    redraw: (map: import('./map').LocMap) => void;
    /** @type {import('./map').MapEventHandlers} */
    onEvent: import('./map').MapEventHandlers;
}
export type TileContainer = {
    clearCache: () => unknown;
    getTileWidth: () => number;
    draw: (map: import('./map').LocMap, xShift: number, yShift: number, scale: number, iFrom: number, jFrom: number, iCount: number, jCount: number, level: number, shouldLoad: boolean) => unknown;
};
