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
/**
 * @typedef {{
 *   [K in keyof import('./common_types').MapEventHandlersMap]?:
 *     MapEventHandler<import('./common_types').MapEventHandlersMap[K]>
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
 * Core map engine. Manages location, layers and some transition animations.
 * @class
 * @param {HTMLElement} wrap main map element
 * @param {ProjectionConverter} conv projection config, usually `ProjectionMercator`
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
    /**
     * @typedef {{
     *   [K in keyof import('./common_types').MapEventHandlersMap]?:
     *     MapEventHandler<import('./common_types').MapEventHandlersMap[K]>
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
     * Core map engine. Manages location, layers and some transition animations.
     * @class
     * @param {HTMLElement} wrap main map element
     * @param {ProjectionConverter} conv projection config, usually `ProjectionMercator`
     */
    constructor(wrap: HTMLElement, conv: ProjectionConverter);
    getLon: () => number;
    getLat: () => number;
    getZoom: () => number;
    /** Map left edge offset from the view center (in pixels) */
    getXShift: () => number;
    /** Map top edge offset from the view center (in pixels) */
    getYShift: () => number;
    /** Returns current projection config */
    getProjConv: () => ProjectionConverter;
    /** Map left edge offset from the view left edge (in pixels) */
    getViewBoxXShift: () => number;
    /** Map top edge offset from the view top edge (in pixels) */
    getViewBoxYShift: () => number;
    /** Map view width */
    getViewBoxWidth: () => number;
    /** Map view height */
    getViewBoxHeight: () => number;
    /**
     * Returns min and max zoom
     * @returns {[min:number, max:number]}
     */
    getZoomRange: () => [min: number, max: number];
    /**
     * Sets min and max zoom. Does not clamp current zoom.
     * @param {number} min
     * @param {number} max
     */
    setZoomRange: (min: number, max: number) => void;
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
     * Instantly update map location and zoom.
     * @param {number} lon_
     * @param {number} lat_
     * @param {number} zoom_
     */
    updateLocation: (lon_: number, lat_: number, zoom_: number) => void;
    /** Schedules map redraw (unless already scheduled). Can be safelyl called multiple times per frame. */
    requestRedraw: () => void;
    /**
     * Should be called after map element (`wrap`) resize to update internal state and canvas.
     */
    resize: () => void;
    /**
     * Zoom in `delta` times using `(x,y)` as a reference point
     * (stays in place when zooming, usually mouse position).
     * `0 < zoom < 1` for zoom out.
     * @param {number} x
     * @param {number} y
     * @param {number} delta
     */
    zoom: (x: number, y: number, delta: number) => void;
    /**
     * Zoom in `delta` times smoothly using `(x,y)` as a reference point.
     * Motion resembles `ease-out`, i.e. slowing down to the end.
     * Useful for handling zoom buttons and mouse wheel.
     * @param {number} x
     * @param {number} y
     * @param {number} delta
     * @param {number} stamp zoom start time, usually `event.timeStamp` or `performance.now()`
     */
    zoomSmooth: (x: number, y: number, delta: number, stamp: number) => void;
    /**
     * Move map view by `(dx,dy)` pixels.
     * @param {number} dx
     * @param {number} dy
     */
    move: (dx: number, dy: number) => void;
    /**
     * Move map view smoothly by `(dx,dy)` pixels.
     * Motion resembles `ease-out`, i.e. slowing down to the end.
     * Useful for handling move buttons.
     * @param {number} dx
     * @param {number} dy
     * @param {number} stamp move start time, usually `event.timeStamp` or `performance.now()`
     */
    moveSmooth: (dx: number, dy: number, stamp: number) => void;
    /**
     * Start moving map view with a certain speed and a gradual slowdown.
     * Useful for mouse/touch handling.
     * @param {number} dx horizontal speed in px/ms
     * @param {number} dy vertival speed in px/ms
     * @param {number} stamp move start time, usually `event.timeStamp` or `performance.now()`
     */
    applyMoveInertia: (dx: number, dy: number, stamp: number) => void;
    /**
     * Start zoomin map with a certain speed and a gradual slowdown around `(x,y)` reference point.
     * Useful for multitouch pinch-zoom handling.
     * @param {number} x
     * @param {number} y
     * @param {number} delta zoom speed, times per ms.
     * @param {number} stamp zoom start time, usually `event.timeStamp` or `performance.now()`
     */
    applyZoomInertia: (x: number, y: number, delta: number, stamp: number) => void;
    /**
     * Emits a built-in (see {@linkcode MapEventHandlersMap}) or custom event with some arguments.
     * @template {string} K
     * @param {K} name
     * @param {K extends keyof import('./common_types').MapEventHandlersMap
     *           ? import('./common_types').MapEventHandlersMap[K]
     *           : unknown} params
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
export type MapEventHandlers = {
    mapMove?: MapEventHandler<import("./common_types").MapMoveParams> | undefined;
    mapZoom?: MapEventHandler<import("./common_types").MapZoomParams> | undefined;
    singleDown?: MapEventHandler<import("./common_types").SingleDownParams> | undefined;
    singleMove?: MapEventHandler<import("./common_types").SingleMoveParams> | undefined;
    singleUp?: MapEventHandler<import("./common_types").SingleUpParams> | undefined;
    singleClick?: MapEventHandler<import("./common_types").SingleClickParams> | undefined;
    dblClick?: MapEventHandler<import("./common_types").DblClickParams> | undefined;
    doubleDown?: MapEventHandler<import("./common_types").DoubleDownParams> | undefined;
    doubleMove?: MapEventHandler<import("./common_types").DoubleMoveParams> | undefined;
    doubleUp?: MapEventHandler<import("./common_types").DoubleUpParams> | undefined;
    doubleClick?: MapEventHandler<import("./common_types").DoubleClickParams> | undefined;
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
