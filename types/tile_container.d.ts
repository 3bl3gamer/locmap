/**
 * @class
 * @param {number} tileW
 * @param {(x:number, y:number, z:number) => string} pathFunc
 */
export function TileContainer(tileW: number, pathFunc: (x: number, y: number, z: number) => string): void;
export class TileContainer {
    /**
     * @class
     * @param {number} tileW
     * @param {(x:number, y:number, z:number) => string} pathFunc
     */
    constructor(tileW: number, pathFunc: (x: number, y: number, z: number) => string);
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
export type Tile = {
    img: HTMLImageElement;
    x: number;
    y: number;
    z: number;
    appearAt: number;
    lastDrawIter: number;
};
