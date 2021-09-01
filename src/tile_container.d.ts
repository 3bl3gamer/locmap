/**
 * @param {number} tileW
 * @param {(x:number, y:number, z:number) => string} pathFunc
 */
export function TileContainer(tileW: number, pathFunc: (x: number, y: number, z: number) => string): void;
export class TileContainer {
    /**
     * @param {number} tileW
     * @param {(x:number, y:number, z:number) => string} pathFunc
     */
    constructor(tileW: number, pathFunc: (x: number, y: number, z: number) => string);
    /**
     * @param {import('./map').LocMap} map
     * @param {number} x
     * @param {number} y
     * @param {number} scale
     * @param {number} i
     * @param {number} j
     * @param {number} level
     * @param {boolean} load_on_fail
     */
    tryDrawTile: (map: import('./map').LocMap, x: number, y: number, scale: number, i: number, j: number, level: number, load_on_fail: boolean) => boolean;
    /**
     * @param {import('./map').LocMap} map
     * @param {number} x
     * @param {number} y
     * @param {number} scale
     * @param {number} partN
     * @param {number} partI
     * @param {number} partJ
     * @param {number} i
     * @param {number} j
     * @param {number} level
     */
    tryDrawPart: (map: import('./map').LocMap, x: number, y: number, scale: number, partN: number, partI: number, partJ: number, i: number, j: number, level: number) => boolean;
    /**
     * @param {import('./map').LocMap} map
     * @param {number} x
     * @param {number} y
     * @param {number} scale
     * @param {number} qi
     * @param {number} qj
     * @param {number} i
     * @param {number} j
     * @param {number} level
     */
    tryDrawAsQuarter: (map: import('./map').LocMap, x: number, y: number, scale: number, qi: number, qj: number, i: number, j: number, level: number) => boolean;
    getTileWidth: () => number;
    clearCache: () => void;
}
