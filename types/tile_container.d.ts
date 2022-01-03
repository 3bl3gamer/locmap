/**
 * Loads, caches and draws tiles with transitions. To be used with {@linkcode TileLayer}.
 * @class
 * @param {number} tileW tile display size
 * @param {(x:number, y:number, z:number) => string|null} pathFunc tile path func, for example:
 *   ``(x, y, z) => `http://${oneOf('a', 'b', 'c')}.tile.openstreetmap.org/${z}/${x}/${y}.png` ``
 *
 *   May return `null` to skip tile loading.
 * @param {(map:import('./map').LocMap, x:number, y:number, tileW:number, scale:number) => unknown} [tilePlaceholderDrawFunc]
 *   draws placeholder when tile is not ready or has failed to load (for example, {@linkcode drawRectTilePlaceholder})
 */
export function SmoothTileContainer(tileW: number, pathFunc: (x: number, y: number, z: number) => string | null, tilePlaceholderDrawFunc?: ((map: import('./map').LocMap, x: number, y: number, tileW: number, scale: number) => unknown) | undefined): void;
export class SmoothTileContainer {
    /**
     * Loads, caches and draws tiles with transitions. To be used with {@linkcode TileLayer}.
     * @class
     * @param {number} tileW tile display size
     * @param {(x:number, y:number, z:number) => string|null} pathFunc tile path func, for example:
     *   ``(x, y, z) => `http://${oneOf('a', 'b', 'c')}.tile.openstreetmap.org/${z}/${x}/${y}.png` ``
     *
     *   May return `null` to skip tile loading.
     * @param {(map:import('./map').LocMap, x:number, y:number, tileW:number, scale:number) => unknown} [tilePlaceholderDrawFunc]
     *   draws placeholder when tile is not ready or has failed to load (for example, {@linkcode drawRectTilePlaceholder})
     */
    constructor(tileW: number, pathFunc: (x: number, y: number, z: number) => string | null, tilePlaceholderDrawFunc?: ((map: import('./map').LocMap, x: number, y: number, tileW: number, scale: number) => unknown) | undefined);
    /**
     * @param {import('./map').LocMap} map
     * @param {number} xShift
     * @param {number} yShift
     * @param {number} scale
     * @param {number} iFrom
     * @param {number} jFrom
     * @param {number} iCount
     * @param {number} jCount
     * @param {number} level
     * @param {boolean} shouldLoad
     */
    draw: (map: import('./map').LocMap, xShift: number, yShift: number, scale: number, iFrom: number, jFrom: number, iCount: number, jCount: number, level: number, shouldLoad: boolean) => void;
    getTileWidth: () => number;
    clearCache: () => void;
}
/**
 * @param {import('./map').LocMap} map
 * @param {number} x
 * @param {number} y
 * @param {number} tileW
 * @param {number} scale
 */
export function drawRectTilePlaceholder(map: import('./map').LocMap, x: number, y: number, tileW: number, scale: number): void;
export type Tile<T extends HTMLImageElement | null> = {
    img: T;
    x: number;
    y: number;
    z: number;
    appearAt: number;
    lastDrawIter: number;
};
export type LoadingTile = Tile<null>;
export type ReadyTile = Tile<HTMLImageElement>;
export type AnyTile = Tile<HTMLImageElement | null>;
