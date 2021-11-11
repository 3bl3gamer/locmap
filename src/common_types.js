export {}

/**
 * @typedef {{dx:number, dy:number}} MapMoveParams
 * @typedef {{x:number, y:number, delta:number}} MapZoomParams
 */

/**
 * @typedef {{x:number, y:number, id:number|'mouse', isSwitching:boolean }} SingleDownParams
 * @typedef {{x:number, y:number, id:number|'mouse', isSwitching:boolean }} SingleUpParams
 * @typedef {{x:number, y:number, id:number|'mouse' }} SingleMoveParams
 * @typedef {{x:number, y:number, id:number|'mouse' }} SingleClickParams
 * @typedef {{x:number, y:number, id:number|'mouse' }} DblClickParams
 * @typedef {{id0:number, x0:number, y0:number, id1:number, x1:number, y1:number}} DoubleDownParams
 * @typedef {{id0:number, x0:number, y0:number, id1:number, x1:number, y1:number}} DoubleMoveParams
 * @typedef {{id0:number, id1:number}} DoubleUpParams
 * @typedef {{id0:number, x0:number, y0:number, id1:number, x1:number, y1:number}} DoubleClickParams
 * @typedef {{x:number, y:number}} SingleHoverParams
 */

/** @typedef {{type: 'use_two_fingers'|'use_control_to_zoom'}} HintData */

/**
 * @typedef {{
 *   mapMove: MapMoveParams,
 *   mapZoom: MapZoomParams,
 *   singleDown: SingleDownParams,
 *   singleMove: SingleMoveParams,
 *   singleUp: SingleUpParams,
 *   singleClick: SingleClickParams,
 *   dblClick: DblClickParams,
 *   doubleDown: DoubleDownParams,
 *   doubleMove: DoubleMoveParams,
 *   doubleUp: DoubleUpParams,
 *   doubleClick: DoubleClickParams,
 *   singleHover: SingleHoverParams,
 *   controlHint: HintData,
 * }} MapEventHandlersMap
 */
