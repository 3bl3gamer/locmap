/**
 * Loads, caches and draws tiles with transitions. To be used with {@linkcode TileLayer}.
 * @class
 * @param {number} tileW tile display size
 * @param {TileImgLoadFunc} tileLoadFunc loads tile image,
 *   see {@linkcode loadTileImage} and maybe {@linkcode clampEarthTiles}
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
     * @param {TileImgLoadFunc} tileLoadFunc loads tile image,
     *   see {@linkcode loadTileImage} and maybe {@linkcode clampEarthTiles}
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
 * Loads image for {@linkcode TileContainer}s ({@linkcode SmoothTileContainer} for example).
 * @param {TilePathFunc} pathFunc tile path func, for example:
 *   ``(x, y, z) => `http://${oneOf('a', 'b', 'c')}.tile.openstreetmap.org/${z}/${x}/${y}.png` ``
 * @returns {TileImgLoadFunc}
 */
export function loadTileImage(pathFunc: TilePathFunc): TileImgLoadFunc;
/**
 * Wrapper for {@linkcode TilePathFunc} (like {@linkcode loadTileImage}).
 * Skips loading tiles outside of the map square (1x1 on level 0, 2x2 on level 1, etc.).
 *
 * @param {TileImgLoadFunc} tileFunc
 * @returns {TileImgLoadFunc}
 */
export function clampEarthTiles(tileFunc: TileImgLoadFunc): TileImgLoadFunc;
/**
 * Draws simple tile placeholder (semi-transparent square).
 *
 * @param {import('./map').LocMap} map
 * @param {number} x tile column index
 * @param {number} y tile row index
 * @param {number} z tile level
 * @param {number} drawX location on canvas
 * @param {number} drawY location on canvas
 * @param {number} tileW current tile size
 * @param {number} scale tile scale relative to it's regular size (displaying size is `tileW*scale`)
 */
export function drawRectTilePlaceholder(map: import('./map').LocMap, x: number, y: number, z: number, drawX: number, drawY: number, tileW: number, scale: number): void;
/**
 * When `img` is `null`, the tile is considerend blank and not drawn (may be replaced by placeholder).
 *
 * When `img` is not `null`, the tile is considerend ready to be drawn.
 */
export type Tile<TImg extends HTMLImageElement | ImageBitmap | null> = {
    img: TImg;
    clear: (() => unknown) | null;
    x: number;
    y: number;
    z: number;
    appearAt: number;
    lastDrawIter: number;
};
export type BlankTile = Tile<null>;
export type ImgTile = Tile<HTMLImageElement> | Tile<ImageBitmap>;
export type AnyTile = BlankTile | ImgTile;
export type TileUpdateFunc = (img: HTMLImageElement | ImageBitmap | null, clear: () => unknown) => unknown;
export type TileImgLoadFunc = (x: number, y: number, z: number, onUpdate: TileUpdateFunc) => unknown;
export type TilePathFunc = (x: number, y: number, z: number) => string;
export type TilePlaceholderDrawFunc = (map: import('./map').LocMap, x: number, y: number, z: number, drawX: number, drawY: number, tileW: number, scale: number) => unknown;
