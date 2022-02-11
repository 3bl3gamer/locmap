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
 * @param {HTMLElement} wrap main map element, should be relative/absolute for canvas to scale correctly
 * @param {ProjectionConverter} conv projection config, usually `ProjectionMercator`
 */
export function LocMap(wrap, conv) {
	const rect = wrap.getBoundingClientRect()
	let curWidth = rect.width
	let curHeight = rect.height

	let lon = 0
	let lat = 0
	let zoom = 256
	let xShift = 0
	let yShift = 0
	let minZoom = 0
	let maxZoom = Infinity

	this.getLon = () => lon
	this.getLat = () => lat
	this.getZoom = () => zoom
	this.getProjConv = () => conv
	/**
	 * Map top-left edge offset from the view center (in pixels)
	 * @returns {[x:number, y:number]}
	 */
	this.getShift = () => [xShift, yShift]
	/** Returns current projection config */
	/**
	 * Map top-left edge offset from the view top-left edge (in pixels)
	 * @returns {[x:number, y:number]}
	 */
	this.getViewBoxShift = () => [xShift - curWidth / 2, yShift - curHeight / 2]
	/**
	 * Map view size
	 * @returns {[x:number, y:number]}
	 */
	this.getViewBoxSize = () => [curWidth, curHeight]

	/**
	 * Returns min and max zoom
	 * @returns {[min:number, max:number]}
	 */
	this.getZoomRange = () => [minZoom, maxZoom]
	/**
	 * Sets min and max zoom. Does not clamp current zoom.
	 * @param {number} min
	 * @param {number} max
	 */
	this.setZoomRange = (min, max) => {
		minZoom = min
		maxZoom = max
	}

	const canvas = document.createElement('canvas')
	canvas.className = 'locmap-canvas'
	canvas.style.position = 'absolute'
	canvas.style.left = '0'
	canvas.style.top = '0'
	canvas.style.width = '100%'
	canvas.style.height = '100%'
	wrap.appendChild(canvas)
	const rc = canvas.getContext('2d')

	this.getWrap = () => wrap
	this.getCanvas = () => canvas
	this.get2dContext = () => rc

	function pos_screen2map() {
		lon = conv.x2lon(xShift, zoom)
		lat = conv.y2lat(yShift, zoom)
	}
	function pos_map2screen() {
		xShift = conv.lon2x(lon, zoom)
		yShift = conv.lat2y(lat, zoom)
	}

	/** @param {number} lon */
	this.lon2x = lon => {
		return conv.lon2x(lon, zoom)
	}
	/** @param {number} lat */
	this.lat2y = lat => {
		return conv.lat2y(lat, zoom)
	}
	/** @param {number} lat */
	this.meters2pixCoef = lat => {
		return conv.meters2pixCoef(lat, zoom)
	}
	/** @param {number} x */
	this.x2lon = x => {
		return conv.x2lon(x, zoom)
	}
	/** @param {number} y */
	this.y2lat = y => {
		return conv.y2lat(y, zoom)
	}

	//----------
	// core
	//----------

	const layers = /** @type {MapLayer[]} */ ([])
	/** @param {MapLayer} layer */
	this.register = layer => {
		if (layers.includes(layer)) throw new Error('already registered')
		layers.push(layer)
		if (layer.register) layer.register(this)
	}
	/** @param {MapLayer} layer */
	this.unregister = layer => {
		const pos = layers.indexOf(layer)
		if (pos === -1) throw new Error('not registered yet')
		layers.splice(pos, 1)
		if (layer.unregister) layer.unregister(this)
	}
	/** @returns {readonly MapLayer[]} */
	this.getLayers = () => layers

	/**
	 * Instantly update map location and zoom.
	 * @param {number} lon_
	 * @param {number} lat_
	 * @param {number} zoom_
	 */
	this.updateLocation = (lon_, lat_, zoom_) => {
		lon = lon_
		lat = lat_
		zoom = zoom_
		pos_map2screen()
		updateLayers()
		requestRedraw()
	}

	const updateLayers = () => {
		for (let i = 0; i < layers.length; i++) {
			const layer = layers[i]
			if (layer.update) layer.update(this)
		}
	}
	const drawLayers = () => {
		if (rc === null) return
		rc.clearRect(0, 0, canvas.width, canvas.height)
		rc.scale(devicePixelRatio, devicePixelRatio)
		for (let i = 0; i < layers.length; i++) {
			const layer = layers[i]
			if (layer.redraw) layer.redraw(this)
		}
		rc.scale(1 / devicePixelRatio, 1 / devicePixelRatio)
	}

	const ZOOM_ANIM_MODE_SMOOTH = 0
	const ZOOM_ANIM_MODE_INERTIA = 1
	const zoomAnimationMinSpeed = 0.0001 //zoom_change/ms
	const zoomInertiaDeceleration = 0.993
	const zoomSmoothDeceleration = 0.983
	let zoomAnimationMode = /**@type {0|1}*/ (ZOOM_ANIM_MODE_SMOOTH)
	let zoomAnimationPrevStamp = 0
	let zoomAnimationX = 0
	let zoomAnimationY = 0
	let zoomAnimationDelta = 1

	const MOVE_ANIM_MODE_SMOOTH = 0
	const MOVE_ANIM_MODE_INERTIA = 1
	const moveInertiaDeceleration = 0.993 //relative speed decrease per 1ms
	const moveSmoothDeceleration = 0.985
	const moveAnimationMinSpeed = 0.01 //pixels/ms
	let moveAnimationMode = /**@type {0|1}*/ (MOVE_ANIM_MODE_SMOOTH)
	let moveAnimationPrevStamp = 0
	let moveAnimationX = 0
	let moveAnimationY = 0

	/** @param {number} frameTime */
	const smoothIfNecessary = frameTime => {
		const now = performance.now()

		if (Math.abs(zoomAnimationDelta - 1) > zoomAnimationMinSpeed) {
			const elapsed = now - zoomAnimationPrevStamp

			let dz
			if (zoomAnimationMode === ZOOM_ANIM_MODE_INERTIA) {
				dz = zoomAnimationDelta ** elapsed
				const inertiaK = zoomInertiaDeceleration ** elapsed
				zoomAnimationDelta = 1 + (zoomAnimationDelta - 1) * inertiaK
			} else {
				const smoothK = zoomSmoothDeceleration ** elapsed
				let newSmoothDelta = 1 + (zoomAnimationDelta - 1) * smoothK
				if (Math.abs(newSmoothDelta - 1) <= zoomAnimationMinSpeed) newSmoothDelta = 1
				dz = zoomAnimationDelta / newSmoothDelta
				zoomAnimationDelta = newSmoothDelta
			}

			this.zoom(zoomAnimationX, zoomAnimationY, dz)
			zoomAnimationPrevStamp = now
		}

		if (moveAnimationX ** 2 + moveAnimationY ** 2 > moveAnimationMinSpeed ** 2) {
			const elapsed = now - moveAnimationPrevStamp

			let dx, dy
			if (moveAnimationMode === MOVE_ANIM_MODE_INERTIA) {
				dx = moveAnimationX * elapsed
				dy = moveAnimationY * elapsed
				const k = moveInertiaDeceleration ** elapsed
				moveAnimationX *= k
				moveAnimationY *= k
			} else {
				let k = moveSmoothDeceleration ** elapsed
				let newX = moveAnimationX * k
				let newY = moveAnimationY * k
				if (newX ** 2 + newY ** 2 < moveAnimationMinSpeed ** 2) k = 0
				dx = moveAnimationX * (1 - k)
				dy = moveAnimationY * (1 - k)
				moveAnimationX *= k
				moveAnimationY *= k
			}

			this.move(dx, dy)
			moveAnimationPrevStamp = now
		}
	}

	let animFrameRequested = false
	function requestRedraw() {
		if (!animFrameRequested) {
			animFrameRequested = true
			requestAnimationFrame(onAnimationFrame)
		}
	}
	/** @param {number} frameTime */
	function onAnimationFrame(frameTime) {
		animFrameRequested = false
		smoothIfNecessary(frameTime)
		drawLayers()
	}
	/** Schedules map redraw (unless already scheduled). Can be safelyl called multiple times per frame. */
	this.requestRedraw = requestRedraw

	//-------------------
	// control inner
	//-------------------

	/**
	 * Should be called after map element (`wrap`) resize to update internal state and canvas.
	 */
	this.resize = () => {
		const rect = wrap.getBoundingClientRect()

		canvas.width = rect.width * devicePixelRatio
		canvas.height = rect.height * devicePixelRatio

		curWidth = rect.width
		curHeight = rect.height

		requestRedraw()
	}

	/**
	 * Zoom in `delta` times using `(x,y)` as a reference point
	 * (stays in place when zooming, usually mouse position).
	 * `0 < zoom < 1` for zoom out.
	 * @param {number} x
	 * @param {number} y
	 * @param {number} delta
	 */
	this.zoom = (x, y, delta) => {
		const prevZoom = zoom
		zoom = mutlClamp(minZoom, maxZoom, zoom, delta)
		const actualDelta = zoom / prevZoom
		xShift += (-x + curWidth / 2 - xShift) * (1 - actualDelta)
		yShift += (-y + curHeight / 2 - yShift) * (1 - actualDelta)
		pos_screen2map()

		updateLayers()
		requestRedraw()
		this.emit('mapZoom', { x, y, delta })
	}

	/**
	 * Zoom in `delta` times smoothly using `(x,y)` as a reference point.
	 * Motion resembles `ease-out`, i.e. slowing down to the end.
	 * Useful for handling zoom buttons and mouse wheel.
	 * @param {number} x
	 * @param {number} y
	 * @param {number} delta
	 * @param {number} stamp zoom start time, usually `event.timeStamp` or `performance.now()`
	 */
	this.zoomSmooth = (x, y, delta, stamp) => {
		if (zoomAnimationMode !== ZOOM_ANIM_MODE_SMOOTH) zoomAnimationDelta = 1
		zoomAnimationDelta = mutlClamp(minZoom / zoom, maxZoom / zoom, zoomAnimationDelta, delta)
		zoomAnimationX = x
		zoomAnimationY = y
		zoomAnimationPrevStamp = stamp
		zoomAnimationMode = ZOOM_ANIM_MODE_SMOOTH
		smoothIfNecessary(stamp)
	}

	/**
	 * Move map view by `(dx,dy)` pixels.
	 * @param {number} dx
	 * @param {number} dy
	 */
	this.move = (dx, dy) => {
		xShift -= dx
		yShift -= dy
		pos_screen2map()

		updateLayers()
		requestRedraw()
		this.emit('mapMove', { dx, dy })
	}

	/**
	 * Move map view smoothly by `(dx,dy)` pixels.
	 * Motion resembles `ease-out`, i.e. slowing down to the end.
	 * Useful for handling move buttons.
	 * @param {number} dx
	 * @param {number} dy
	 * @param {number} stamp move start time, usually `event.timeStamp` or `performance.now()`
	 */
	this.moveSmooth = (dx, dy, stamp) => {
		if (moveAnimationMode !== MOVE_ANIM_MODE_SMOOTH) moveAnimationX = moveAnimationY = 0
		moveAnimationX += dx
		moveAnimationY += dy
		moveAnimationPrevStamp = stamp
		moveAnimationMode = MOVE_ANIM_MODE_SMOOTH
		smoothIfNecessary(stamp)
	}

	/**
	 * Start moving map view with a certain speed and a gradual slowdown.
	 * Useful for mouse/touch handling.
	 * @param {number} dx horizontal speed in px/ms
	 * @param {number} dy vertival speed in px/ms
	 * @param {number} stamp move start time, usually `event.timeStamp` or `performance.now()`
	 */
	this.applyMoveInertia = (dx, dy, stamp) => {
		moveAnimationX = dx
		moveAnimationY = dy
		moveAnimationPrevStamp = stamp
		moveAnimationMode = MOVE_ANIM_MODE_INERTIA
		smoothIfNecessary(stamp)
	}
	/**
	 * Start zoomin map with a certain speed and a gradual slowdown around `(x,y)` reference point.
	 * Useful for multitouch pinch-zoom handling.
	 * @param {number} x
	 * @param {number} y
	 * @param {number} delta zoom speed, times per ms.
	 * @param {number} stamp zoom start time, usually `event.timeStamp` or `performance.now()`
	 */
	this.applyZoomInertia = (x, y, delta, stamp) => {
		zoomAnimationDelta = delta
		zoomAnimationX = x
		zoomAnimationY = y
		zoomAnimationPrevStamp = stamp
		zoomAnimationMode = ZOOM_ANIM_MODE_INERTIA
		smoothIfNecessary(stamp)
	}

	//------------
	// events
	//------------

	// TODO: if it could be overloaded, `K` may be `keyof MapEventHandlersMap`
	//       and editor will provide `name` completions (like with `addEventListener`)
	//       https://github.com/microsoft/TypeScript/issues/25590
	/**
	 * Emits a built-in (see {@linkcode MapEventHandlersMap}) or custom event with some arguments.
	 * @template {string} K
	 * @param {K} name
	 * @param {K extends keyof import('./common_types').MapEventHandlersMap
	 *           ? import('./common_types').MapEventHandlersMap[K]
	 *           : unknown} params
	 */
	this.emit = (name, params) => {
		for (let i = 0; i < layers.length; i++) {
			const layer = layers[i]
			const handler = layer.onEvent && layer.onEvent[name]
			if (handler) handler(this, params)
		}
	}

	//-----------
	// setup
	//-----------

	pos_map2screen()
}

/** @type {ProjectionConverter} */
export const ProjectionFlat = {
	x2lon(x, zoom) {
		return x / zoom
	},
	y2lat(y, zoom) {
		return y / zoom
	},

	lon2x(lon, zoom) {
		return lon * zoom
	},
	lat2y(lat, zoom) {
		return lat * zoom
	},

	meters2pixCoef(lat, zoom) {
		return zoom
	},
}

/** @type {ProjectionConverter} */
export const ProjectionMercator = {
	x2lon(x, z) {
		return (x / z) * 360 - 180
	},
	y2lat(y, z) {
		const n = Math.PI - (2 * Math.PI * y) / z
		return (180 / Math.PI) * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)))
	},

	lon2x(lon, zoom) {
		return ((lon + 180) / 360) * zoom
	},
	lat2y(lat, zoom) {
		return (
			((1 - Math.log(Math.tan((lat * Math.PI) / 180) + 1 / Math.cos((lat * Math.PI) / 180)) / Math.PI) /
				2) *
			zoom
		)
	},

	meters2pixCoef(lat, zoom) {
		lat *= Math.PI / 180
		return zoom / 40075000 / Math.abs(Math.cos(lat))
	},
}

/** @type {ProjectionConverter} */
export const ProjectionYandexMercator = {
	// http://www.geofaq.ru/forum/index.php?action=vthread&forum=2&topic=7&page=5#msg1152
	// http://habrahabr.ru/post/151103/
	x2lon(x, zoom) {
		return (x / zoom) * 360 - 180
	},
	y2lat(y, zoom) {
		const ty = Math.exp((y / zoom) * Math.PI * 2 - Math.PI)
		const m = 5.328478445e-11
		const h = 1.764564338702e-8
		const k = 0.00000657187271079536
		const n = 0.003356551468879694
		const g = Math.PI / 2 - 2 * Math.atan(ty)
		// prettier-ignore
		const l = g + n*Math.sin(2*g) + k*Math.sin(4*g) + h*Math.sin(6*g) + m*Math.sin(8*g);
		return (l * 180) / Math.PI
	},

	lon2x(lon, zoom) {
		return ((lon + 180) / 360) * zoom
	},
	lat2y(lat, zoom) {
		const l = (lat * Math.PI) / 180
		const k = 0.0818191908426
		const t = k * Math.sin(l)
		// prettier-ignore
		return (
			1 -
			Math.log(
				Math.tan(Math.PI/4 + l/2)
			) / Math.PI +
			k*Math.log(
				Math.tan(
					Math.PI/4 +
					Math.asin(t)/2
				)
			) / Math.PI
		) / 2 * zoom
	},

	meters2pixCoef(lat, zoom) {
		lat *= Math.PI / 180
		return zoom / 40075000 / Math.abs(Math.cos(lat))
	},
}

/**
 * @param {number} min
 * @param {number} max
 * @param {number} val
 * @param {number} delta
 */
function mutlClamp(min, max, val, delta) {
	val *= delta
	if (delta < 1 && val < min) val = min
	if (delta > 1 && val > max) val = max
	return val
}
