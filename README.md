Simple modular canvas-based tile map engine.

[]()<!-- REGULAR_SIZE_START --><!-- Generated, do not edit! -->6.0<!-- REGULAR_SIZE_END -->
KiB after min+gizp, [more](#size).

[Example](https://3bl3gamer.github.io/locmap/examples/)

## Usage

<!-- REGULAR_EXAMPLE_START -->
<!-- Generated, do not edit! -->
```js
import {
    LocMap, ControlLayer, SmoothTileContainer, TileLayer, ProjectionMercator,
    appendCredit, loadTileImage, clampEarthTiles, drawRectTilePlaceholder,
} from 'locmap'

const map = new LocMap(document.body, ProjectionMercator)
const tileContainer = new SmoothTileContainer(
    256,
    clampEarthTiles(loadTileImage((x, y, z) =>
        `http://${oneOf('a', 'b', 'c')}.tile.openstreetmap.org/${z}/${x}/${y}.png`)),
    drawRectTilePlaceholder,
)
map.register(new TileLayer(tileContainer))
map.register(new ControlLayer())
appendCredit(document.body,
    '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors')
window.onresize = map.resize
```
<!-- REGULAR_EXAMPLE_END -->

## Size

<!-- SIZE_TABLE_START -->
<!-- Generated, do not edit! -->
|         | bundled | minfied | min+gz |     |
|:--------|--------:|--------:|-------:|:----|
| base    |   28.4  |    6.5  |   3.0  | KiB |
| regular |   54.0  |   14.1  |   6.0  | KiB |
| full    |   59.4  |   16.4  |   6.8  | KiB |
<!-- SIZE_TABLE_END -->

<!-- API_BLOCK_START -->
<!-- Generated, do not edit! -->
## API

### <a name="user-content-locmap"></a>new LocMap(wrap, conv) [src](https://github.com/3bl3gamer/locmap/blob/6bcb7cc/src/map.js#L39)

 * `wrap` *HTMLElement* — main map element, should be relative/absolute for canvas to scale correctly.
 * `conv` *ProjectionConverter* — projection config, usually `ProjectionMercator`.

Core map engine. Manages location, layers and some transition animations.

#### <a name="user-content-register"></a>register(layer) [src](https://github.com/3bl3gamer/locmap/blob/6bcb7cc/src/map.js#L138)

 * `layer` *MapLayer*

#### <a name="user-content-unregister"></a>unregister(layer) [src](https://github.com/3bl3gamer/locmap/blob/6bcb7cc/src/map.js#L144)

 * `layer` *MapLayer*

#### <a name="user-content-updatelocation"></a>updateLocation(lon_, lat_, zoom_) [src](https://github.com/3bl3gamer/locmap/blob/6bcb7cc/src/map.js#L159)

 * `lon_` *number*
 * `lat_` *number*
 * `zoom_` *number*

Instantly update map location and zoom.

#### <a name="user-content-move"></a>move(dx, dy) [src](https://github.com/3bl3gamer/locmap/blob/6bcb7cc/src/map.js#L341)

 * `dx` *number*
 * `dy` *number*

Move map view by `(dx,dy)` pixels.

#### <a name="user-content-movesmooth"></a>moveSmooth(dx, dy, stamp) [src](https://github.com/3bl3gamer/locmap/blob/6bcb7cc/src/map.js#L359)

 * `dx` *number*
 * `dy` *number*
 * `stamp` *number* — move start time, usually `event.timeStamp` or `performance.now()`.

Move map view smoothly by `(dx,dy)` pixels.
Motion resembles `ease-out`, i.e. slowing down to the end.
Useful for handling move buttons.

#### <a name="user-content-applymoveinertia"></a>applyMoveInertia(dx, dy, stamp) [src](https://github.com/3bl3gamer/locmap/blob/6bcb7cc/src/map.js#L375)

 * `dx` *number* — horizontal speed in px/ms.
 * `dy` *number* — vertival speed in px/ms.
 * `stamp` *number* — move start time, usually `event.timeStamp` or `performance.now()`.

Start moving map view with a certain speed and a gradual slowdown.
Useful for mouse/touch handling.

#### <a name="user-content-zoom"></a>zoom(x, y, delta) [src](https://github.com/3bl3gamer/locmap/blob/6bcb7cc/src/map.js#L304)

 * `x` *number*
 * `y` *number*
 * `delta` *number*

Zoom in `delta` times using `(x,y)` as a reference point
(stays in place when zooming, usually mouse position).
`0 < zoom < 1` for zoom out.

#### <a name="user-content-zoomsmooth"></a>zoomSmooth(x, y, delta, stamp) [src](https://github.com/3bl3gamer/locmap/blob/6bcb7cc/src/map.js#L326)

 * `x` *number*
 * `y` *number*
 * `delta` *number*
 * `stamp` *number* — zoom start time, usually `event.timeStamp` or `performance.now()`.

Zoom in `delta` times smoothly using `(x,y)` as a reference point.
Motion resembles `ease-out`, i.e. slowing down to the end.
Useful for handling zoom buttons and mouse wheel.

#### <a name="user-content-applyzoominertia"></a>applyZoomInertia(x, y, delta, stamp) [src](https://github.com/3bl3gamer/locmap/blob/6bcb7cc/src/map.js#L390)

 * `x` *number*
 * `y` *number*
 * `delta` *number* — zoom speed, times per ms.
 * `stamp` *number* — zoom start time, usually `event.timeStamp` or `performance.now()`.

Start zoomin map with a certain speed and a gradual slowdown around `(x,y)` reference point.
Useful for multitouch pinch-zoom handling.

#### <a name="user-content-emit"></a>emit(name, params) [src](https://github.com/3bl3gamer/locmap/blob/6bcb7cc/src/map.js#L414)

 * `K` *string*
 * `name` *K*
 * `params` *K extends keyof MapEventHandlersMap ? MapEventHandlersMap\[K\] : unknown*

Emits a built-in (see [`MapEventHandlersMap`](#user-content-mapeventhandlersmap)) or custom event with some arguments.

#### <a name="user-content-get2dcontext"></a>get2dContext() [src](https://github.com/3bl3gamer/locmap/blob/6bcb7cc/src/map.js#L100)

 * Returns: *null | CanvasRenderingContext2D*

#### <a name="user-content-getcanvas"></a>getCanvas() [src](https://github.com/3bl3gamer/locmap/blob/6bcb7cc/src/map.js#L99)

 * Returns: *HTMLCanvasElement*

#### <a name="user-content-getlat"></a>getLat() [src](https://github.com/3bl3gamer/locmap/blob/6bcb7cc/src/map.js#L53)

 * Returns: *number*

#### <a name="user-content-getlayers"></a>getLayers() [src](https://github.com/3bl3gamer/locmap/blob/6bcb7cc/src/map.js#L151)

 * Returns: *readonly MapLayer\[\]*

#### <a name="user-content-getlon"></a>getLon() [src](https://github.com/3bl3gamer/locmap/blob/6bcb7cc/src/map.js#L52)

 * Returns: *number*

#### <a name="user-content-getprojconv"></a>getProjConv() [src](https://github.com/3bl3gamer/locmap/blob/6bcb7cc/src/map.js#L55)

 * Returns: *ProjectionConverter*

#### <a name="user-content-getshift"></a>getShift() [src](https://github.com/3bl3gamer/locmap/blob/6bcb7cc/src/map.js#L60)

 * Returns: *\[x:number, y:number\]*

Map top-left edge offset from the view center (in pixels).

#### <a name="user-content-getviewboxshift"></a>getViewBoxShift() [src](https://github.com/3bl3gamer/locmap/blob/6bcb7cc/src/map.js#L66)

 * Returns: *\[x:number, y:number\]*

Map top-left edge offset from the view top-left edge (in pixels).

#### <a name="user-content-getviewboxsize"></a>getViewBoxSize() [src](https://github.com/3bl3gamer/locmap/blob/6bcb7cc/src/map.js#L71)

 * Returns: *\[x:number, y:number\]*

Map view size.

#### <a name="user-content-getwrap"></a>getWrap() [src](https://github.com/3bl3gamer/locmap/blob/6bcb7cc/src/map.js#L98)

 * Returns: *HTMLElement*

#### <a name="user-content-getzoom"></a>getZoom() [src](https://github.com/3bl3gamer/locmap/blob/6bcb7cc/src/map.js#L54)

 * Returns: *number*

#### <a name="user-content-getzoomrange"></a>getZoomRange() [src](https://github.com/3bl3gamer/locmap/blob/6bcb7cc/src/map.js#L77)

 * Returns: *\[min:number, max:number\]*

Returns min and max zoom.

#### <a name="user-content-lat2y"></a>lat2y(lat) [src](https://github.com/3bl3gamer/locmap/blob/6bcb7cc/src/map.js#L116)

 * `lat` *number*
 * Returns: *number*

#### <a name="user-content-lon2x"></a>lon2x(lon) [src](https://github.com/3bl3gamer/locmap/blob/6bcb7cc/src/map.js#L112)

 * `lon` *number*
 * Returns: *number*

#### <a name="user-content-meters2pixcoef"></a>meters2pixCoef(lat) [src](https://github.com/3bl3gamer/locmap/blob/6bcb7cc/src/map.js#L120)

 * `lat` *number*
 * Returns: *number*

#### <a name="user-content-requestredraw"></a>requestRedraw() [src](https://github.com/3bl3gamer/locmap/blob/6bcb7cc/src/map.js#L257)

Schedules map redraw (unless already scheduled). Can be safelly called multiple times per frame.

#### <a name="user-content-resize"></a>resize() [src](https://github.com/3bl3gamer/locmap/blob/6bcb7cc/src/map.js#L284)

Should be called after map element (`wrap`) resize to update internal state and canvas.

#### <a name="user-content-setzoomrange"></a>setZoomRange(min, max) [src](https://github.com/3bl3gamer/locmap/blob/6bcb7cc/src/map.js#L83)

 * `min` *number*
 * `max` *number*

Sets min and max zoom. Does not clamp current zoom.

#### <a name="user-content-x2lon"></a>x2lon(x) [src](https://github.com/3bl3gamer/locmap/blob/6bcb7cc/src/map.js#L124)

 * `x` *number*
 * Returns: *number*

#### <a name="user-content-y2lat"></a>y2lat(y) [src](https://github.com/3bl3gamer/locmap/blob/6bcb7cc/src/map.js#L128)

 * `y` *number*
 * Returns: *number*


### <a name="user-content-tilelayer"></a>new TileLayer(tileContainer) [src](https://github.com/3bl3gamer/locmap/blob/6bcb7cc/src/tile_layer.js#L17)

 * `tileContainer` *TileContainer* — tile cache/drawer, for example [`SmoothTileContainer`](#user-content-smoothtilecontainer).

Loads and draw tiles using [`TileContainer`](#user-content-tilecontainer).
Disables tile load while zooming.


### <a name="user-content-smoothtilecontainer"></a>new SmoothTileContainer(tileW, tileLoadFunc\[, tilePlaceholderDrawFunc\]) [src](https://github.com/3bl3gamer/locmap/blob/6bcb7cc/src/tile_container.js#L64)

 * `tileW` *number* — tile display size.
 * `tileLoadFunc` *TileImgLoadFunc* — loads tile image,
  see [`loadTileImage`](#user-content-loadtileimage) and maybe [`clampEarthTiles`](#user-content-clampearthtiles).
 * `tilePlaceholderDrawFunc` *TilePlaceholderDrawFunc* — draws placeholder when tile is not ready or has failed to load
  (for example, [`drawRectTilePlaceholder`](#user-content-drawrecttileplaceholder)).

Loads, caches and draws tiles with transitions. To be used with [`TileLayer`](#user-content-tilelayer).


### <a name="user-content-controllayer"></a>new ControlLayer(\[mouseOpts\]\[, kbdOpts\]) [src](https://github.com/3bl3gamer/locmap/blob/6bcb7cc/src/control_layer.js#L410)

 * `mouseOpts` *{doNotInterfere?}*
   * `doNotInterfere` *boolean*
 * `kbdOpts` *{outlineFix}*
   * `outlineFix` *undefined | null | string*

Layer for pointer (mouse/touch) and keyboard input.
See [`PointerControlLayer`](#user-content-pointercontrollayer) and [`KeyboardControlLayer`](#user-content-keyboardcontrollayer).


### <a name="user-content-pointercontrollayer"></a>new PointerControlLayer(\[opts\]) [src](https://github.com/3bl3gamer/locmap/blob/6bcb7cc/src/control_layer.js#L80)

 * `opts` *{doNotInterfere?}*
   * `doNotInterfere` *boolean*

Enables mouse and touch input: gragging, wheel- and pinch-zooming.


### <a name="user-content-keyboardcontrollayer"></a>new KeyboardControlLayer(\[opts\]) [src](https://github.com/3bl3gamer/locmap/blob/6bcb7cc/src/control_layer.js#L350)

 * `opts` *{outlineFix}*
   * `outlineFix` *undefined | null | string* — value that will be set to `map.getWrap().style.outline`.
  It's a workaround for mobile Safari 14 (at least) bug where `canvas` performance
  drops significantly after changing parent `tabIndex` attribute.
  'none' (default) seems fixing the issue.

Enables keyboard controls: arrows for movement, +/- for zoom. Shift can be used for speedup.
Makes map element focusable.


### <a name="user-content-controlhintlayer"></a>new ControlHintLayer(controlText, twoFingersText\[, opts\]) [src](https://github.com/3bl3gamer/locmap/blob/6bcb7cc/src/control_layer.js#L434)

 * `controlText` *string* — text to be shown when `Ctrl`/`⌘` key is required to zoom.
  For example: `` `hold ${controlHintKeyName()} to zoom` ``.
 * `twoFingersText` *string* — text to be shown when two fingers are required to drag.
  For example: `'use two fingers to drag'`.
 * `opts` *{styles}* — text box style overrides.
   * `styles` *Record\<string, string\>*

Should be used with `doNotInterfere:true` set on [`PointerControlLayer`](#user-content-pointercontrollayer) or [`ControlLayer`](#user-content-controllayer).
Shows a text over the map when user input is ignored.


### <a name="user-content-locationlayer"></a>new LocationLayer() [src](https://github.com/3bl3gamer/locmap/blob/6bcb7cc/src/location_layer.js#L21)

Watches current geolocation, draws a cross or a circle (depending on accuracy) on the map.


### <a name="user-content-urllayer"></a>new URLLayer(\[lonLatPrec\]\[, levelPrec\]) [src](https://github.com/3bl3gamer/locmap/blob/6bcb7cc/src/url_layer.js#L18)

 * `lonLatPrec` *number* — location precision. **Default**: `9`
 * `levelPrec` *number* — level precision. **Default**: `4`

Saves current map position to `location.hash` as `#{lon}/{lat}/{level}`.
Updates map position on `location.hash` change.


### Functions

#### <a name="user-content-appendcredit"></a>appendCredit(wrap, html\[, style\]) [src](https://github.com/3bl3gamer/locmap/blob/6bcb7cc/src/utils.js#L28)

 * `wrap` *HTMLElement* — parent element, usually `map.getWrap()`.
 * `html` *string* — content as HTML (won't be escaped).
 * `style` *Partial\<CSSStyleDeclaration\>* — custom style object. **Default**: `CREDIT_BOTTOM_RIGHT`

Shortcut for appending some HTML at the right-bottom of another element.

#### <a name="user-content-clampearthtiles"></a>clampEarthTiles(tileFunc) [src](https://github.com/3bl3gamer/locmap/blob/6bcb7cc/src/tile_container.js#L420)

 * `tileFunc` *TileImgLoadFunc*
 * Returns: *TileImgLoadFunc*

Wrapper for [`TilePathFunc`](#user-content-tilepathfunc) (like [`loadTileImage`](#user-content-loadtileimage)).
Skips loading tiles outside of the map square (1x1 on level 0, 2x2 on level 1, etc.).

#### <a name="user-content-controlhintkeyname"></a>controlHintKeyName() [src](https://github.com/3bl3gamer/locmap/blob/6bcb7cc/src/control_layer.js#L496)

 * Returns: *'⌘' | 'Ctrl'*

Returns `⌘` on MacOS/iOS and `Ctrl` on other platforms.
Useful for [`ControlHintLayer`](#user-content-controlhintlayer).

#### <a name="user-content-drawrecttileplaceholder"></a>drawRectTilePlaceholder(map, x, y, z, drawX, drawY, tileW, scale) [src](https://github.com/3bl3gamer/locmap/blob/6bcb7cc/src/tile_container.js#L440)

 * `map` *LocMap*
 * `x` *number* — tile column index.
 * `y` *number* — tile row index.
 * `z` *number* — tile level.
 * `drawX` *number* — location on canvas.
 * `drawY` *number* — location on canvas.
 * `tileW` *number* — current tile size.
 * `scale` *number* — tile scale relative to it's regular size (displaying size is `tileW*scale`).

Draws simple tile placeholder (semi-transparent square).

#### <a name="user-content-loadtileimage"></a>loadTileImage(pathFunc) [src](https://github.com/3bl3gamer/locmap/blob/6bcb7cc/src/tile_container.js#L391)

 * `pathFunc` *TilePathFunc* — tile path func, for example:
  ``(x, y, z) => `http://${oneOf('a', 'b', 'c')}.tile.openstreetmap.org/${z}/${x}/${y}.png` ``.
 * Returns: *TileImgLoadFunc*

Loads image for [`TileContainer`](#user-content-tilecontainer)s ([`SmoothTileContainer`](#user-content-smoothtilecontainer) for example).

#### <a name="user-content-oneof"></a>oneOf(...args) [src](https://github.com/3bl3gamer/locmap/blob/6bcb7cc/src/utils.js#L7)

 * `T` *any*
 * `args` *T\[\]*
 * Returns: *T*

Chooses and returns random argument.
<!-- API_BLOCK_END -->
