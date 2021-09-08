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
export function LocMap(wrap, conv) {
	const rect = wrap.getBoundingClientRect()
	let curWidth = rect.width
	let curHeight = rect.height

	let lon = 0
	let lat = 0
	let level = 8
	let xShift = 0
	let yShift = 0
	let zoom = Math.pow(2, level)
	let minZoom = 256

	this.getLon = () => lon
	this.getLat = () => lat
	this.getLevel = () => level
	this.getXShift = () => xShift
	this.getYShift = () => yShift
	this.getProjConv = () => conv
	this.getZoom = () => zoom
	this.getTopLeftXOffset = () => curWidth / 2
	this.getTopLeftYOffset = () => curHeight / 2
	this.getTopLeftXShift = () => xShift - curWidth / 2
	this.getTopLeftYShift = () => yShift - curHeight / 2
	this.getWidth = () => curWidth
	this.getHeight = () => curHeight

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
	this.lon2x = function (lon) {
		return conv.lon2x(lon, zoom)
	}
	/** @param {number} lat */
	this.lat2y = function (lat) {
		return conv.lat2y(lat, zoom)
	}
	/** @param {number} lat */
	this.meters2pixCoef = function (lat) {
		return conv.meters2pixCoef(lat, zoom)
	}
	/** @param {number} x */
	this.x2lon = function (x) {
		return conv.x2lon(x, zoom)
	}
	/** @param {number} y */
	this.y2lat = function (y) {
		return conv.y2lat(y, zoom)
	}

	//----------
	// core
	//----------

	const layers = /** @type {MapLayer[]} */ ([])
	/** @param {MapLayer} layer */
	this.register = function (layer) {
		const pos = layers.indexOf(layer)
		if (pos != -1) throw new Error('already registered')
		layers.push(layer)
		if (layer.register) layer.register(this)
	}
	/** @param {MapLayer} layer */
	this.unregister = function (layer) {
		const pos = layers.indexOf(layer)
		if (pos == -1) throw new Error('not registered yet')
		layers.splice(pos, 1)
		if (layer.unregister) layer.unregister(this)
	}

	/**
	 * @param {number} _lon
	 * @param {number} _lat
	 * @param {number} _level
	 */
	this.updateLocation = (_lon, _lat, _level) => {
		lon = _lon
		lat = _lat
		level = (_level + 0.5) | 0
		zoom = Math.pow(2, _level)
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

	let zoomSmoothDelta = 1
	let zoomSmoothX = 0
	let zoomSmoothY = 0
	let moveXInertia = 0
	let moveYInertia = 0
	let zoomDeltaInertia = 1
	const smoothIfNecessary = () => {
		if (Math.abs(zoomSmoothDelta - 1) > 0.01 || Math.abs(zoomDeltaInertia - 1) > 0.01) {
			zoomSmoothDelta *= zoomDeltaInertia
			zoomDeltaInertia += (1 - zoomDeltaInertia) * 0.2
			const newDelta = 1 + (zoomSmoothDelta - 1) * 0.7
			this.zoom(zoomSmoothX, zoomSmoothY, zoomSmoothDelta / newDelta)
			zoomSmoothDelta = newDelta
		}
		if (Math.abs(moveXInertia) > 0.5 || Math.abs(moveYInertia) > 0.5) {
			this.move(moveXInertia, moveYInertia)
			moveXInertia *= 0.9
			moveYInertia *= 0.9
		}
	}

	const frameCounter = new FrameCounter()
	let animFrameRequested = false
	function requestRedraw() {
		frameCounter.frameRequested()
		if (!animFrameRequested) {
			animFrameRequested = true
			requestAnimationFrame(onAnimationFrame)
		}
	}
	/** @param {number} timeStamp */
	function onAnimationFrame(timeStamp) {
		animFrameRequested = false
		frameCounter.frameDrawn(timeStamp)
		drawLayers()
		smoothIfNecessary()
	}
	this.requestRedraw = requestRedraw
	this.getFrameTimeDelta = frameCounter.getFrameTimeDelta

	//-------------------
	// control inner
	//-------------------
	this.resize = () => {
		const rect = wrap.getBoundingClientRect()

		canvas.width = rect.width * devicePixelRatio
		canvas.height = rect.height * devicePixelRatio

		curWidth = rect.width
		curHeight = rect.height

		requestRedraw()
	}

	/**
	 * @param {number} x
	 * @param {number} y
	 * @param {number} delta
	 */
	this.zoom = (x, y, delta) => {
		zoom = Math.max(minZoom, zoom * delta)
		level = (Math.log(zoom) / Math.log(2) + 0.5) | 0
		xShift += (-x + curWidth / 2 - xShift) * (1 - delta)
		yShift += (-y + curHeight / 2 - yShift) * (1 - delta)
		pos_screen2map()

		updateLayers()
		requestRedraw()
		this.emit('mapZoom', { x, y, delta })
	}

	/**
	 * @param {number} x
	 * @param {number} y
	 * @param {number} d
	 */
	this.zoomSmooth = (x, y, d) => {
		zoomSmoothDelta = Math.max(minZoom / zoom, zoomSmoothDelta * d)
		zoomSmoothX = x
		zoomSmoothY = y
		smoothIfNecessary()
	}

	/**
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
	 * @param {number} dx
	 * @param {number} dy
	 */
	this.applyMoveInertia = (dx, dy) => {
		moveXInertia = dx
		moveYInertia = dy
		smoothIfNecessary()
	}
	/**
	 * @param {number} x
	 * @param {number} y
	 * @param {number} dz
	 */
	this.applyZoomInertia = (x, y, dz) => {
		zoomDeltaInertia = dz
		zoomSmoothX = x
		zoomSmoothY = y
		zoomSmoothDelta = 1
		smoothIfNecessary()
	}

	//------------
	// events
	//------------

	// TODO: if it could be overloaded, `K` may be `keyof MapEventHandlersMap`
	//       and editor will provide `name` completions (like with `addEventListener`)
	//       https://github.com/microsoft/TypeScript/issues/25590
	/**
	 * @template {string} K
	 * @param {K} name
	 * @param {K extends keyof MapEventHandlersMap ? MapEventHandlersMap[K] : unknown} params
	 */
	this.emit = (name, params) => {
		for (let i = 0; i < layers.length; i++) {
			const layer = layers[i]
			const handler = layer.onEvent && layer.onEvent[name]
			if (handler) handler(this, params)
		}
	}

	lon = 0
	lat = 0
	pos_map2screen()
}

/** @class */
function FrameCounter() {
	const frameTimeDeltas = [16, 16, 16, 16, 16]
	let prevFrameTimeDelta = /**@type {number|null} */ (null)
	let animFrameID = 0

	function onAnimFrame() {
		prevFrameTimeDelta = null
	}

	this.frameRequested = () => {
		cancelAnimationFrame(animFrameID)
	}
	/** @param {number} timeStamp */
	this.frameDrawn = timeStamp => {
		cancelAnimationFrame(animFrameID)
		animFrameID = requestAnimationFrame(onAnimFrame)
		if (prevFrameTimeDelta !== null) {
			frameTimeDeltas.push(Math.min(32, timeStamp - prevFrameTimeDelta))
			frameTimeDeltas.shift()
		}
		prevFrameTimeDelta = timeStamp
	}
	this.getFrameTimeDelta = () => {
		let sum = 0
		for (let i = 0; i < frameTimeDeltas.length; i++) sum += frameTimeDeltas[i]
		return sum / frameTimeDeltas.length
	}
}

/** @type {ProjectionConverter} */
export const ProjectionFlat = {
	x2lon(x, zoom) {
		return x / zoom - 0.5
	},
	y2lat(y, zoom) {
		return y / zoom - 0.5
	},

	lon2x(lon, zoom) {
		return (lon + 0.5) * zoom
	},
	lat2y(lat, zoom) {
		return (lat + 0.5) * zoom
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
