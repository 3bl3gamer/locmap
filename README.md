Simple modular canvas-based tile map engine.

[]()<!-- REGULAR_SIZE_START --><!-- Generated, do not edit! -->5.7<!-- REGULAR_SIZE_END -->
KiB after min+gizp, [more](#size).

[Example](https://3bl3gamer.github.io/locmap/examples/)

## Usage

```js
import {
    LocMap, ControlLayer, ControlHintLayer, LocationLayer, URLLayer,
    SmoothTileContainer, TileLayer, ProjectionMercator, oneOf, appendCredit,
} from 'locmap'

const map = new LocMap(document.body, ProjectionMercator)
const tileContainer = new SmoothTileContainer(256, (x, y, z) =>
    `http://${oneOf('a', 'b', 'c')}.tile.openstreetmap.org/${z}/${x}/${y}.png`)
map.register(new TileLayer(tileContainer))
map.register(new ControlLayer())
appendCredit(document.body,
    '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors')
window.onresize = map.resize
```

## Size

<!-- SIZE_TABLE_START -->
<!-- Generated, do not edit! -->
|         | bundled | minfied | min+gz |     |
|:--------|--------:|--------:|-------:|:----|
| base    |   25.5  |    6.6  |   2.9  | KiB |
| regular |   47.8  |   13.6  |   5.7  | KiB |
| full    |   54.0  |   16.2  |   6.6  | KiB |
<!-- SIZE_TABLE_END -->

<!-- API_BLOCK_START -->
<!-- Generated, do not edit! -->
## API

### new LocMap(wrap, conv) [src](https://github.com/3bl3gamer/locmap/blob/f3dbca0/src/map.js#L39)

 * `wrap` *HTMLElement* — main map element.
 * `conv` *ProjectionConverter* — projection config, usually `ProjectionMercator`.

Core map engine. Manages location, layers and some transition animations.

#### register(layer) [src](https://github.com/3bl3gamer/locmap/blob/f3dbca0/src/map.js#L121)

 * `layer` *MapLayer*

#### unregister(layer) [src](https://github.com/3bl3gamer/locmap/blob/f3dbca0/src/map.js#L127)

 * `layer` *MapLayer*

#### updateLocation(lon_, lat_, level_) [src](https://github.com/3bl3gamer/locmap/blob/f3dbca0/src/map.js#L140)

 * `lon_` *number*
 * `lat_` *number*
 * `level_` *number*

Instantly update map location and zoom level.

#### move(dx, dy) [src](https://github.com/3bl3gamer/locmap/blob/f3dbca0/src/map.js#L319)

 * `dx` *number*
 * `dy` *number*

Move map view by `(dx,dy)` pixels.

#### moveSmooth(dx, dy, stamp) [src](https://github.com/3bl3gamer/locmap/blob/f3dbca0/src/map.js#L337)

 * `dx` *number*
 * `dy` *number*
 * `stamp` *number* — move start time, usually `event.timeStamp` or `performance.now()`.

Move map view smoothly by `(dx,dy)` pixels.
Motion resembles `ease-out`, i.e. slowing down to the end.
Useful for handling move buttons.

#### applyMoveInertia(dx, dy, stamp) [src](https://github.com/3bl3gamer/locmap/blob/f3dbca0/src/map.js#L353)

 * `dx` *number* — horizontal speed in px/ms.
 * `dy` *number* — vertival speed in px/ms.
 * `stamp` *number* — move start time, usually `event.timeStamp` or `performance.now()`.

Start moving map view with a certain speed and a gradual slowdown.
Useful for mouse/touch handling.

#### zoom(x, y, delta) [src](https://github.com/3bl3gamer/locmap/blob/f3dbca0/src/map.js#L281)

 * `x` *number*
 * `y` *number*
 * `delta` *number*

Zoom in `delta` times using `(x,y)` as a reference point
(stays in place when zooming, usually mouse position).
`0 < zoom < 1` for zoom out.

#### zoomSmooth(x, y, delta, stamp) [src](https://github.com/3bl3gamer/locmap/blob/f3dbca0/src/map.js#L304)

 * `x` *number*
 * `y` *number*
 * `delta` *number*
 * `stamp` *number* — zoom start time, usually `event.timeStamp` or `performance.now()`.

Zoom in `delta` times smoothly using `(x,y)` as a reference point.
Motion resembles `ease-out`, i.e. slowing down to the end.
Useful for handling zoom buttons and mouse wheel.

#### applyZoomInertia(x, y, delta, stamp) [src](https://github.com/3bl3gamer/locmap/blob/f3dbca0/src/map.js#L368)

 * `x` *number*
 * `y` *number*
 * `delta` *number* — zoom speed, times per ms.
 * `stamp` *number* — zoom start time, usually `event.timeStamp` or `performance.now()`.

Start zoomin map with a certain speed and a gradual slowdown around `(x,y)` reference point.
Useful for multitouch pinch-zoom handling.

#### emit(name, params) [src](https://github.com/3bl3gamer/locmap/blob/f3dbca0/src/map.js#L392)

 * `K` *string*
 * `name` *K*
 * `params` *K extends keyof MapEventHandlersMap ? MapEventHandlersMap[K] : unknown*

Emits a built-in (see {@linkcode MapEventHandlersMap}) or custom event with some arguments.

#### get2dContext() [src](https://github.com/3bl3gamer/locmap/blob/f3dbca0/src/map.js#L83)

 * Returns: *null | CanvasRenderingContext2D*

#### getCanvas() [src](https://github.com/3bl3gamer/locmap/blob/f3dbca0/src/map.js#L82)

 * Returns: *HTMLCanvasElement*

#### getLat() [src](https://github.com/3bl3gamer/locmap/blob/f3dbca0/src/map.js#L53)

 * Returns: *number*

#### getLevel() [src](https://github.com/3bl3gamer/locmap/blob/f3dbca0/src/map.js#L54)

 * Returns: *number*

#### getLon() [src](https://github.com/3bl3gamer/locmap/blob/f3dbca0/src/map.js#L52)

 * Returns: *number*

#### getProjConv() [src](https://github.com/3bl3gamer/locmap/blob/f3dbca0/src/map.js#L60)

 * Returns: *ProjectionConverter*

Returns current projection config.

#### getViewBoxHeight() [src](https://github.com/3bl3gamer/locmap/blob/f3dbca0/src/map.js#L69)

 * Returns: *number*

Map view height.

#### getViewBoxWidth() [src](https://github.com/3bl3gamer/locmap/blob/f3dbca0/src/map.js#L67)

 * Returns: *number*

Map view width.

#### getViewBoxXShift() [src](https://github.com/3bl3gamer/locmap/blob/f3dbca0/src/map.js#L63)

 * Returns: *number*

Map left edge offset from the view left edge (in pixels).

#### getViewBoxYShift() [src](https://github.com/3bl3gamer/locmap/blob/f3dbca0/src/map.js#L65)

 * Returns: *number*

Map top edge offset from the view top edge (in pixels).

#### getWrap() [src](https://github.com/3bl3gamer/locmap/blob/f3dbca0/src/map.js#L81)

 * Returns: *HTMLElement*

#### getXShift() [src](https://github.com/3bl3gamer/locmap/blob/f3dbca0/src/map.js#L56)

 * Returns: *number*

Map left edge offset from the view center (in pixels).

#### getYShift() [src](https://github.com/3bl3gamer/locmap/blob/f3dbca0/src/map.js#L58)

 * Returns: *number*

Map top edge offset from the view center (in pixels).

#### getZoom() [src](https://github.com/3bl3gamer/locmap/blob/f3dbca0/src/map.js#L61)

 * Returns: *number*

#### lat2y(lat) [src](https://github.com/3bl3gamer/locmap/blob/f3dbca0/src/map.js#L99)

 * `lat` *number*
 * Returns: *number*

#### lon2x(lon) [src](https://github.com/3bl3gamer/locmap/blob/f3dbca0/src/map.js#L95)

 * `lon` *number*
 * Returns: *number*

#### meters2pixCoef(lat) [src](https://github.com/3bl3gamer/locmap/blob/f3dbca0/src/map.js#L103)

 * `lat` *number*
 * Returns: *number*

#### requestRedraw() [src](https://github.com/3bl3gamer/locmap/blob/f3dbca0/src/map.js#L239)

Schedules map redraw (unless already scheduled). Can be safelyl called multiple times per frame.

#### resize() [src](https://github.com/3bl3gamer/locmap/blob/f3dbca0/src/map.js#L261)

Should be called after map element (`wrap`) resize to update internal state and canvas.

#### x2lon(x) [src](https://github.com/3bl3gamer/locmap/blob/f3dbca0/src/map.js#L107)

 * `x` *number*
 * Returns: *number*

#### y2lat(y) [src](https://github.com/3bl3gamer/locmap/blob/f3dbca0/src/map.js#L111)

 * `y` *number*
 * Returns: *number*


### new TileLayer(tileContainer) [src](https://github.com/3bl3gamer/locmap/blob/f3dbca0/src/tile_layer.js#L17)

 * `tileContainer` *TileContainer* — tile cache/drawer, for example {@linkcode SmoothTileContainer}.

Loads and draw tiles using {@linkcode TileContainer}.
Disables tile load while zooming.


### new SmoothTileContainer(tileW, pathFunc) [src](https://github.com/3bl3gamer/locmap/blob/f3dbca0/src/tile_container.js#L25)

 * `tileW` *number* — tile display size.
 * `pathFunc` *(x:number, y:number, z:number) =\> string* — tile path func, for example:
  ``(x, y, z) => `http://${oneOf('a', 'b', 'c')}.tile.openstreetmap.org/${z}/${x}/${y}.png` ``.

Loads, caches draws tiles. To be used with {@linkcode TileLayer}.


### new ControlLayer([mouseOpts][, kbdOpts]) [src](https://github.com/3bl3gamer/locmap/blob/f3dbca0/src/control_layer.js#L391)

 * `mouseOpts` *{doNotInterfere?}*
   * `doNotInterfere` *boolean*
 * `kbdOpts` *{outlineFix}*
   * `outlineFix` *undefined | null | string*

Layer for pointer (mouse/touch) and keyboard input.
See {@linkcode PointerControlLayer} and {@linkcode KeyboardControlLayer}.


### new PointerControlLayer([opts]) [src](https://github.com/3bl3gamer/locmap/blob/f3dbca0/src/control_layer.js#L79)

 * `opts` *{doNotInterfere?}*
   * `doNotInterfere` *boolean*

Enables mouse and touch input: gragging, wheel- and pinch-zooming.


### new KeyboardControlLayer([opts]) [src](https://github.com/3bl3gamer/locmap/blob/f3dbca0/src/control_layer.js#L331)

 * `opts` *{outlineFix}*
   * `outlineFix` *undefined | null | string* — value that will be set to `map.getWrap().style.outline`.
  It's a workaround for mobile Safari 14 (at least) bug where `canvas` performance
  drops significantly after changing parent `tabIndex` attribute.

Enables keyboard controls: arrows for movement, +/- for zoom. Shift can be used for speedup.
Makes map element focusable.


### new ControlHintLayer(controlText, twoFingersText[, opts]) [src](https://github.com/3bl3gamer/locmap/blob/f3dbca0/src/control_layer.js#L415)

 * `controlText` *string* — text to be shown when `Ctrl`/`⌘` key is required to zoom.
  For example: `` `hold ${controlHintKeyName()} to zoom` ``.
 * `twoFingersText` *string* — text to be shown when two fingers are required to drag.
  For example: `'use two fingers to drag'`.
 * `opts` *{styles}* — text box style overrides.
   * `styles` *Record\<string, string\>*

Should be used with `doNotInterfere:true` set on {@linkcode MouseControlLayer} or {@linkcode ControlLayer}.
Shows a text over the map when user input is ignored.


### new LocationLayer() [src](https://github.com/3bl3gamer/locmap/blob/f3dbca0/src/location_layer.js#L21)

Watches current geolocation, draws a cross or a circle (depending on accuracy) on the map.


### new URLLayer() [src](https://github.com/3bl3gamer/locmap/blob/f3dbca0/src/url_layer.js#L16)

Saves current map position to `location.hash` as `#{lon}/{lat}/{level}`.
Updates map position on `location.hash` change.


### Functions

#### appendCredit(wrap, html[, style]) [src](https://github.com/3bl3gamer/locmap/blob/f3dbca0/src/utils.js#L28)

 * `wrap` *HTMLElement* — parent element, usually `map.getWrap()`.
 * `html` *string* — content as HTML (won't be escaped).
 * `style` *Partial\<CSSStyleDeclaration\>* **Default**: `CREDIT_BOTTOM_RIGHT`

Shortcut for appending some HTML at the right-bottom of another element.

#### controlHintKeyName() [src](https://github.com/3bl3gamer/locmap/blob/f3dbca0/src/control_layer.js#L478)

 * Returns: *'⌘' | 'Ctrl'*

Returns `⌘` on MacOS/iOS and `Ctrl` on other platforms.
Useful for {@linkcode ControlHintLayer}.

#### oneOf(...args) [src](https://github.com/3bl3gamer/locmap/blob/f3dbca0/src/utils.js#L7)

 * `T` *any*
 * `args` *T[]*
 * Returns: *T*

Chooses and returns random argument.
<!-- API_BLOCK_END -->
