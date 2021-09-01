/**
 * @typedef {{
 *   x2lon(x:number, zoom:number):number,
 *   y2lat(y:number, zoom:number):number,
 *   lon2x(lon:number, zoom:number):number,
 *   lat2y(lat:number, zoom:number):number,
 *   meters2pixCoef(lat:number, zoom:number):number,
 * }} ProjectionConverter
 */
/**
 * @typedef {{
 *   register?(map:LocMap): unknown,
 *   unregister?(map:LocMap): unknown,
 *   update?(map:LocMap): unknown,
 *   redraw?(map:LocMap): unknown,
 *   onEvent?: Record<string, (map:LocMap, params:any) => unknown>,
 * }} MapLayer
 */
/**
 * @param {HTMLElement} wrap
 * @param {ProjectionConverter} conv
 */
export function LocMap(wrap: HTMLElement, conv: ProjectionConverter): void;
export class LocMap {
    /**
     * @typedef {{
     *   x2lon(x:number, zoom:number):number,
     *   y2lat(y:number, zoom:number):number,
     *   lon2x(lon:number, zoom:number):number,
     *   lat2y(lat:number, zoom:number):number,
     *   meters2pixCoef(lat:number, zoom:number):number,
     * }} ProjectionConverter
     */
    /**
     * @typedef {{
     *   register?(map:LocMap): unknown,
     *   unregister?(map:LocMap): unknown,
     *   update?(map:LocMap): unknown,
     *   redraw?(map:LocMap): unknown,
     *   onEvent?: Record<string, (map:LocMap, params:any) => unknown>,
     * }} MapLayer
     */
    /**
     * @param {HTMLElement} wrap
     * @param {ProjectionConverter} conv
     */
    constructor(wrap: HTMLElement, conv: ProjectionConverter);
    getLon: () => number;
    getLat: () => number;
    getLevel: () => number;
    getXShift: () => number;
    getYShift: () => number;
    getProjConv: () => ProjectionConverter;
    getZoom: () => number;
    getTopLeftXOffset: () => number;
    getTopLeftYOffset: () => number;
    getTopLeftXShift: () => number;
    getTopLeftYShift: () => number;
    getWidth: () => number;
    getHeight: () => number;
    getWrap: () => HTMLElement;
    getCanvas: () => HTMLCanvasElement;
    get2dContext: () => CanvasRenderingContext2D;
    /** @param {number} lon */
    lon2x: (lon: number) => number;
    /** @param {number} lat */
    lat2y: (lat: number) => number;
    /** @param {number} lat */
    meters2pixCoef: (lat: number) => number;
    /** @param {number} x */
    x2lon: (x: number) => number;
    /** @param {number} y */
    y2lat: (y: number) => number;
    /** @param {MapLayer} layer */
    register: (layer: MapLayer) => void;
    /** @param {MapLayer} layer */
    unregister: (layer: MapLayer) => void;
    /**
     * @param {number} _lon
     * @param {number} _lat
     * @param {number} _level
     */
    updateLocation: (_lon: number, _lat: number, _level: number) => void;
    requestRedraw: () => void;
    getFrameTimeDelta: () => number;
    resize: () => void;
    /**
     * @param {number} x
     * @param {number} y
     * @param {number} d
     */
    zoom: (x: number, y: number, d: number) => void;
    /**
     * @param {number} x
     * @param {number} y
     * @param {number} d
     */
    zoomSmooth: (x: number, y: number, d: number) => void;
    /**
     * @param {number} dx
     * @param {number} dy
     */
    move: (dx: number, dy: number) => void;
    /**
     * @param {number} dx
     * @param {number} dy
     */
    applyMoveInertia: (dx: number, dy: number) => void;
    /**
     * @param {number} x
     * @param {number} y
     * @param {number} dz
     */
    applyZoomInertia: (x: number, y: number, dz: number) => void;
    /**
     * @param {string} name
     * @param {unknown} params
     */
    emit: (name: string, params: unknown) => void;
}
/** @type {ProjectionConverter} */
export const ProjectionFlat: ProjectionConverter;
/** @type {ProjectionConverter} */
export const ProjectionMercator: ProjectionConverter;
/** @type {ProjectionConverter} */
export const ProjectionYandexMercator: ProjectionConverter;
export type ProjectionConverter = {
    x2lon(x: number, zoom: number): number;
    y2lat(y: number, zoom: number): number;
    lon2x(lon: number, zoom: number): number;
    lat2y(lat: number, zoom: number): number;
    meters2pixCoef(lat: number, zoom: number): number;
};
export type MapLayer = {
    register?(map: LocMap): unknown;
    unregister?(map: LocMap): unknown;
    update?(map: LocMap): unknown;
    redraw?(map: LocMap): unknown;
    onEvent?: Record<string, (map: LocMap, params: any) => unknown>;
};
