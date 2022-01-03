/**
 * Loads, caches and draws tiles with transitions. To be used with {@linkcode TileLayer}.
 * @class
 * @param {number} tileW tile display size
 * @param {TileImgLoadFunc} tileLoadFunc tile path func, for example:
 *   ``(x, y, z) => `http://${oneOf('a', 'b', 'c')}.tile.openstreetmap.org/${z}/${x}/${y}.png` ``
 *
 *   May return `null` to skip tile loading.
 * @param {TilePlaceholderDrawFunc} [tilePlaceholderDrawFunc]
 *   draws placeholder when tile is not ready or has failed to load
 *   (for example, {@linkcode drawRectTilePlaceholder})
 */
export function SmoothTileContainer(tileW: number, tileLoadFunc: TileImgLoadFunc, tilePlaceholderDrawFunc?: TilePlaceholderDrawFunc | undefined): void;
export class SmoothTileContainer {
    /**
     * Loads, caches and draws tiles with transitions. To be used with {@linkcode TileLayer}.
     * @class
     * @param {number} tileW tile display size
     * @param {TileImgLoadFunc} tileLoadFunc tile path func, for example:
     *   ``(x, y, z) => `http://${oneOf('a', 'b', 'c')}.tile.openstreetmap.org/${z}/${x}/${y}.png` ``
     *
     *   May return `null` to skip tile loading.
     * @param {TilePlaceholderDrawFunc} [tilePlaceholderDrawFunc]
     *   draws placeholder when tile is not ready or has failed to load
     *   (for example, {@linkcode drawRectTilePlaceholder})
     */
    constructor(tileW: number, tileLoadFunc: TileImgLoadFunc, tilePlaceholderDrawFunc?: TilePlaceholderDrawFunc | undefined);
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
 * @param {TilePathFunc} pathFunc
 * @returns {TileImgLoadFunc}
 */
export function loadTileImage(pathFunc: TilePathFunc): TileImgLoadFunc;
/**
 * @param {TileImgLoadFunc} tileFunc
 * @returns {TileImgLoadFunc}
 */
export function clampEarthTiles(tileFunc: TileImgLoadFunc): TileImgLoadFunc;
/**
 * @param {import('./map').LocMap} map
 * @param {number} x
 * @param {number} y
 * @param {number} tileW
 * @param {number} scale
 */
export function drawRectTilePlaceholder(map: import('./map').LocMap, x: number, y: number, tileW: number, scale: number): void;
export type Tile<T> = {
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
export type TileImgLoadFunc = (x: number, y: number, z: number, onLoad: (img: HTMLImageElement) => unknown) => unknown;
export type TilePathFunc = (x: number, y: number, z: number) => string;
export type TilePlaceholderDrawFunc = (map: import('./map').LocMap, x: number, y: number, tileW: number, scale: number) => unknown;
