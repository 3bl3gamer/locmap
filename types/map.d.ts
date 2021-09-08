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
 * @template T
 * @typedef {(map:LocMap, params:T) => unknown} MapEventHandler
 */
/** @typedef {import('./common_types').MapEventHandlersMap} MapEventHandlersMap */
/**
 * @typedef {{
 *   [K in keyof MapEventHandlersMap]?:
 *     MapEventHandler<MapEventHandlersMap[K]>
 * } & Record<string, MapEventHandler<any>>} MapEventHandlers
 */
/**
 * @typedef {{
 *   register?(map:LocMap): unknown,
 *   unregister?(map:LocMap): unknown,
 *   update?(map:LocMap): unknown,
 *   redraw?(map:LocMap): unknown,
 *   onEvent?: MapEventHandlers,
 * }} MapLayer
 */
/**
 * @class
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
     * @template T
     * @typedef {(map:LocMap, params:T) => unknown} MapEventHandler
     */
    /** @typedef {import('./common_types').MapEventHandlersMap} MapEventHandlersMap */
    /**
     * @typedef {{
     *   [K in keyof MapEventHandlersMap]?:
     *     MapEventHandler<MapEventHandlersMap[K]>
     * } & Record<string, MapEventHandler<any>>} MapEventHandlers
     */
    /**
     * @typedef {{
     *   register?(map:LocMap): unknown,
     *   unregister?(map:LocMap): unknown,
     *   update?(map:LocMap): unknown,
     *   redraw?(map:LocMap): unknown,
     *   onEvent?: MapEventHandlers,
     * }} MapLayer
     */
    /**
     * @class
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
    get2dContext: () => CanvasRenderingContext2D | null;
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
     * @param {number} delta
     */
    zoom: (x: number, y: number, delta: number) => void;
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
     * @template {string} K
     * @param {K} name
     * @param {K extends keyof MapEventHandlersMap ? MapEventHandlersMap[K] : unknown} params
     */
    emit: <K extends string>(name: K, params: K extends keyof import("./common_types").MapEventHandlersMap ? import("./common_types").MapEventHandlersMap[K] : unknown) => void;
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
export type MapEventHandler<T> = (map: LocMap, params: T) => unknown;
export type MapEventHandlersMap = import('./common_types').MapEventHandlersMap;
export type MapEventHandlers = {
    mapMove?: MapEventHandler<import("./common_types").MapMoveParams> | undefined;
    mapZoom?: MapEventHandler<import("./common_types").MapZoomParams> | undefined;
    singleDown?: MapEventHandler<import("./common_types").SingleDownParams> | undefined;
    singleMove?: MapEventHandler<import("./common_types").SingleMoveParams> | undefined;
    singleUp?: MapEventHandler<import("./common_types").SingleUpParams> | undefined;
    singleClick?: MapEventHandler<import("./common_types").SingleClickParams> | undefined;
    doubleDown?: MapEventHandler<import("./common_types").DoubleDownParams> | undefined;
    doubleMove?: MapEventHandler<import("./common_types").DoubleMoveParams> | undefined;
    doubleUp?: MapEventHandler<import("./common_types").DoubleUpParams> | undefined;
    singleHover?: MapEventHandler<import("./common_types").SingleHoverParams> | undefined;
    controlHint?: MapEventHandler<import("./common_types").HintData> | undefined;
} & Record<string, MapEventHandler<any>>;
export type MapLayer = {
    register?(map: LocMap): unknown;
    unregister?(map: LocMap): unknown;
    update?(map: LocMap): unknown;
    redraw?(map: LocMap): unknown;
    onEvent?: MapEventHandlers | undefined;
};
