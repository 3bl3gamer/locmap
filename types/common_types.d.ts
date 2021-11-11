export type MapMoveParams = {
    dx: number;
    dy: number;
};
export type MapZoomParams = {
    x: number;
    y: number;
    delta: number;
};
export type SingleDownParams = {
    x: number;
    y: number;
    id: number | 'mouse';
    isSwitching: boolean;
};
export type SingleUpParams = {
    x: number;
    y: number;
    id: number | 'mouse';
    isSwitching: boolean;
};
export type SingleMoveParams = {
    x: number;
    y: number;
    id: number | 'mouse';
};
export type SingleClickParams = {
    x: number;
    y: number;
    id: number | 'mouse';
};
export type DblClickParams = {
    x: number;
    y: number;
    id: number | 'mouse';
};
export type DoubleDownParams = {
    id0: number;
    x0: number;
    y0: number;
    id1: number;
    x1: number;
    y1: number;
};
export type DoubleMoveParams = {
    id0: number;
    x0: number;
    y0: number;
    id1: number;
    x1: number;
    y1: number;
};
export type DoubleUpParams = {
    id0: number;
    id1: number;
};
export type DoubleClickParams = {
    id0: number;
    x0: number;
    y0: number;
    id1: number;
    x1: number;
    y1: number;
};
export type SingleHoverParams = {
    x: number;
    y: number;
};
export type HintData = {
    type: 'use_two_fingers' | 'use_control_to_zoom';
};
export type MapEventHandlersMap = {
    mapMove: MapMoveParams;
    mapZoom: MapZoomParams;
    singleDown: SingleDownParams;
    singleMove: SingleMoveParams;
    singleUp: SingleUpParams;
    singleClick: SingleClickParams;
    dblClick: DblClickParams;
    doubleDown: DoubleDownParams;
    doubleMove: DoubleMoveParams;
    doubleUp: DoubleUpParams;
    doubleClick: DoubleClickParams;
    singleHover: SingleHoverParams;
    controlHint: HintData;
};
