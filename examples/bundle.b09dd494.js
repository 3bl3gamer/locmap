(function () {
	'use strict';

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
	function LocMap(wrap, conv) {
		const rect = wrap.getBoundingClientRect();
		let curWidth = rect.width;
		let curHeight = rect.height;

		let lon = 0;
		let lat = 0;
		let zoom = 256;
		let xShift = 0;
		let yShift = 0;
		let minZoom = 0;
		let maxZoom = Infinity;

		this.getLon = () => lon;
		this.getLat = () => lat;
		this.getZoom = () => zoom;
		this.getProjConv = () => conv;
		/**
		 * Map top-left edge offset from the view center (in pixels)
		 * @returns {[x:number, y:number]}
		 */
		this.getShift = () => [xShift, yShift];
		/** Returns current projection config */
		/**
		 * Map top-left edge offset from the view top-left edge (in pixels)
		 * @returns {[x:number, y:number]}
		 */
		this.getViewBoxShift = () => [xShift - curWidth / 2, yShift - curHeight / 2];
		/**
		 * Map view size
		 * @returns {[x:number, y:number]}
		 */
		this.getViewBoxSize = () => [curWidth, curHeight];

		/**
		 * Returns min and max zoom
		 * @returns {[min:number, max:number]}
		 */
		this.getZoomRange = () => [minZoom, maxZoom];
		/**
		 * Sets min and max zoom. Does not clamp current zoom.
		 * @param {number} min
		 * @param {number} max
		 */
		this.setZoomRange = (min, max) => {
			minZoom = min;
			maxZoom = max;
		};

		const canvas = document.createElement('canvas');
		canvas.className = 'locmap-canvas';
		canvas.style.position = 'absolute';
		canvas.style.left = '0';
		canvas.style.top = '0';
		canvas.style.width = '100%';
		canvas.style.height = '100%';
		wrap.appendChild(canvas);
		const rc = canvas.getContext('2d');

		this.getWrap = () => wrap;
		this.getCanvas = () => canvas;
		this.get2dContext = () => rc;

		function pos_screen2map() {
			lon = conv.x2lon(xShift, zoom);
			lat = conv.y2lat(yShift, zoom);
		}
		function pos_map2screen() {
			xShift = conv.lon2x(lon, zoom);
			yShift = conv.lat2y(lat, zoom);
		}

		/** @param {number} lon */
		this.lon2x = lon => {
			return conv.lon2x(lon, zoom)
		};
		/** @param {number} lat */
		this.lat2y = lat => {
			return conv.lat2y(lat, zoom)
		};
		/** @param {number} lat */
		this.meters2pixCoef = lat => {
			return conv.meters2pixCoef(lat, zoom)
		};
		/** @param {number} x */
		this.x2lon = x => {
			return conv.x2lon(x, zoom)
		};
		/** @param {number} y */
		this.y2lat = y => {
			return conv.y2lat(y, zoom)
		};

		//----------
		// core
		//----------

		const layers = /** @type {MapLayer[]} */ ([]);
		/** @param {MapLayer} layer */
		this.register = layer => {
			if (layers.includes(layer)) throw new Error('already registered')
			layers.push(layer);
			if (layer.register) layer.register(this);
		};
		/** @param {MapLayer} layer */
		this.unregister = layer => {
			const pos = layers.indexOf(layer);
			if (pos === -1) throw new Error('not registered yet')
			layers.splice(pos, 1);
			if (layer.unregister) layer.unregister(this);
		};
		/** @returns {readonly MapLayer[]} */
		this.getLayers = () => layers;

		/**
		 * Instantly update map location and zoom.
		 * @param {number} lon_
		 * @param {number} lat_
		 * @param {number} zoom_
		 */
		this.updateLocation = (lon_, lat_, zoom_) => {
			lon = lon_;
			lat = lat_;
			zoom = zoom_;
			pos_map2screen();
			updateLayers();
			requestRedraw();
		};

		const updateLayers = () => {
			for (let i = 0; i < layers.length; i++) {
				const layer = layers[i];
				if (layer.update) layer.update(this);
			}
		};
		const drawLayers = () => {
			if (rc === null) return
			rc.clearRect(0, 0, canvas.width, canvas.height);
			rc.scale(devicePixelRatio, devicePixelRatio);
			for (let i = 0; i < layers.length; i++) {
				const layer = layers[i];
				if (layer.redraw) layer.redraw(this);
			}
			rc.scale(1 / devicePixelRatio, 1 / devicePixelRatio);
		};

		const ZOOM_ANIM_MODE_SMOOTH = 0;
		const ZOOM_ANIM_MODE_INERTIA = 1;
		const zoomAnimationMinSpeed = 0.0001; //zoom_change/ms
		const zoomInertiaDeceleration = 0.993;
		const zoomSmoothDeceleration = 0.983;
		let zoomAnimationMode = /**@type {0|1}*/ (ZOOM_ANIM_MODE_SMOOTH);
		let zoomAnimationPrevStamp = 0;
		let zoomAnimationX = 0;
		let zoomAnimationY = 0;
		let zoomAnimationDelta = 1;

		const MOVE_ANIM_MODE_SMOOTH = 0;
		const MOVE_ANIM_MODE_INERTIA = 1;
		const moveInertiaDeceleration = 0.993; //relative speed decrease per 1ms
		const moveSmoothDeceleration = 0.985;
		const moveAnimationMinSpeed = 0.01; //pixels/ms
		let moveAnimationMode = /**@type {0|1}*/ (MOVE_ANIM_MODE_SMOOTH);
		let moveAnimationPrevStamp = 0;
		let moveAnimationX = 0;
		let moveAnimationY = 0;

		/** @param {number} frameTime */
		const smoothIfNecessary = frameTime => {
			const now = performance.now();

			if (Math.abs(zoomAnimationDelta - 1) > zoomAnimationMinSpeed) {
				const elapsed = now - zoomAnimationPrevStamp;

				let dz;
				if (zoomAnimationMode === ZOOM_ANIM_MODE_INERTIA) {
					dz = zoomAnimationDelta ** elapsed;
					const inertiaK = zoomInertiaDeceleration ** elapsed;
					zoomAnimationDelta = 1 + (zoomAnimationDelta - 1) * inertiaK;
				} else {
					const smoothK = zoomSmoothDeceleration ** elapsed;
					let newSmoothDelta = 1 + (zoomAnimationDelta - 1) * smoothK;
					if (Math.abs(newSmoothDelta - 1) <= zoomAnimationMinSpeed) newSmoothDelta = 1;
					dz = zoomAnimationDelta / newSmoothDelta;
					zoomAnimationDelta = newSmoothDelta;
				}

				this.zoom(zoomAnimationX, zoomAnimationY, dz);
				zoomAnimationPrevStamp = now;
			}

			if (moveAnimationX ** 2 + moveAnimationY ** 2 > moveAnimationMinSpeed ** 2) {
				const elapsed = now - moveAnimationPrevStamp;

				let dx, dy;
				if (moveAnimationMode === MOVE_ANIM_MODE_INERTIA) {
					dx = moveAnimationX * elapsed;
					dy = moveAnimationY * elapsed;
					const k = moveInertiaDeceleration ** elapsed;
					moveAnimationX *= k;
					moveAnimationY *= k;
				} else {
					let k = moveSmoothDeceleration ** elapsed;
					let newX = moveAnimationX * k;
					let newY = moveAnimationY * k;
					if (newX ** 2 + newY ** 2 < moveAnimationMinSpeed ** 2) k = 0;
					dx = moveAnimationX * (1 - k);
					dy = moveAnimationY * (1 - k);
					moveAnimationX *= k;
					moveAnimationY *= k;
				}

				this.move(dx, dy);
				moveAnimationPrevStamp = now;
			}
		};

		let animFrameRequested = false;
		function requestRedraw() {
			if (!animFrameRequested) {
				animFrameRequested = true;
				requestAnimationFrame(onAnimationFrame);
			}
		}
		/** @param {number} frameTime */
		function onAnimationFrame(frameTime) {
			animFrameRequested = false;
			smoothIfNecessary();
			drawLayers();
		}
		/** Schedules map redraw (unless already scheduled). Can be safelyl called multiple times per frame. */
		this.requestRedraw = requestRedraw;

		//-------------------
		// control inner
		//-------------------

		/**
		 * Should be called after map element (`wrap`) resize to update internal state and canvas.
		 */
		this.resize = () => {
			const rect = wrap.getBoundingClientRect();

			canvas.width = rect.width * devicePixelRatio;
			canvas.height = rect.height * devicePixelRatio;

			curWidth = rect.width;
			curHeight = rect.height;

			requestRedraw();
		};

		/**
		 * Zoom in `delta` times using `(x,y)` as a reference point
		 * (stays in place when zooming, usually mouse position).
		 * `0 < zoom < 1` for zoom out.
		 * @param {number} x
		 * @param {number} y
		 * @param {number} delta
		 */
		this.zoom = (x, y, delta) => {
			const prevZoom = zoom;
			zoom = mutlClamp(minZoom, maxZoom, zoom, delta);
			const actualDelta = zoom / prevZoom;
			xShift += (-x + curWidth / 2 - xShift) * (1 - actualDelta);
			yShift += (-y + curHeight / 2 - yShift) * (1 - actualDelta);
			pos_screen2map();

			updateLayers();
			requestRedraw();
			this.emit('mapZoom', { x, y, delta });
		};

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
			if (zoomAnimationMode !== ZOOM_ANIM_MODE_SMOOTH) zoomAnimationDelta = 1;
			zoomAnimationDelta = mutlClamp(minZoom / zoom, maxZoom / zoom, zoomAnimationDelta, delta);
			zoomAnimationX = x;
			zoomAnimationY = y;
			zoomAnimationPrevStamp = stamp;
			zoomAnimationMode = ZOOM_ANIM_MODE_SMOOTH;
			smoothIfNecessary();
		};

		/**
		 * Move map view by `(dx,dy)` pixels.
		 * @param {number} dx
		 * @param {number} dy
		 */
		this.move = (dx, dy) => {
			xShift -= dx;
			yShift -= dy;
			pos_screen2map();

			updateLayers();
			requestRedraw();
			this.emit('mapMove', { dx, dy });
		};

		/**
		 * Move map view smoothly by `(dx,dy)` pixels.
		 * Motion resembles `ease-out`, i.e. slowing down to the end.
		 * Useful for handling move buttons.
		 * @param {number} dx
		 * @param {number} dy
		 * @param {number} stamp move start time, usually `event.timeStamp` or `performance.now()`
		 */
		this.moveSmooth = (dx, dy, stamp) => {
			if (moveAnimationMode !== MOVE_ANIM_MODE_SMOOTH) moveAnimationX = moveAnimationY = 0;
			moveAnimationX += dx;
			moveAnimationY += dy;
			moveAnimationPrevStamp = stamp;
			moveAnimationMode = MOVE_ANIM_MODE_SMOOTH;
			smoothIfNecessary();
		};

		/**
		 * Start moving map view with a certain speed and a gradual slowdown.
		 * Useful for mouse/touch handling.
		 * @param {number} dx horizontal speed in px/ms
		 * @param {number} dy vertival speed in px/ms
		 * @param {number} stamp move start time, usually `event.timeStamp` or `performance.now()`
		 */
		this.applyMoveInertia = (dx, dy, stamp) => {
			moveAnimationX = dx;
			moveAnimationY = dy;
			moveAnimationPrevStamp = stamp;
			moveAnimationMode = MOVE_ANIM_MODE_INERTIA;
			smoothIfNecessary();
		};
		/**
		 * Start zoomin map with a certain speed and a gradual slowdown around `(x,y)` reference point.
		 * Useful for multitouch pinch-zoom handling.
		 * @param {number} x
		 * @param {number} y
		 * @param {number} delta zoom speed, times per ms.
		 * @param {number} stamp zoom start time, usually `event.timeStamp` or `performance.now()`
		 */
		this.applyZoomInertia = (x, y, delta, stamp) => {
			zoomAnimationDelta = delta;
			zoomAnimationX = x;
			zoomAnimationY = y;
			zoomAnimationPrevStamp = stamp;
			zoomAnimationMode = ZOOM_ANIM_MODE_INERTIA;
			smoothIfNecessary();
		};

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
				const layer = layers[i];
				const handler = layer.onEvent && layer.onEvent[name];
				if (handler) handler(this, params);
			}
		};

		//-----------
		// setup
		//-----------

		pos_map2screen();
	}

	/** @type {ProjectionConverter} */
	const ProjectionMercator = {
		x2lon(x, z) {
			return (x / z) * 360 - 180
		},
		y2lat(y, z) {
			const n = Math.PI - (2 * Math.PI * y) / z;
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
			lat *= Math.PI / 180;
			return zoom / 40075000 / Math.abs(Math.cos(lat))
		},
	};

	/**
	 * @param {number} min
	 * @param {number} max
	 * @param {number} val
	 * @param {number} delta
	 */
	function mutlClamp(min, max, val, delta) {
		val *= delta;
		if (delta < 1 && val < min) val = min;
		if (delta > 1 && val > max) val = max;
		return val
	}

	/** @typedef {[EventTarget, string, (e:any) => void]} Evt */

	/**
	 * @param {DoubleMoveCallbacks & SingleHoverCallbacks & WheelCallbacks} callbacks
	 */
	function controlDouble(callbacks) {
		/** @type {Element} */ let startElem;
		/** @type {EventTarget} */ let moveElem;
		/** @type {EventTarget} */ let leaveElem;
		/** @type {Element|null} */ let offsetElem;

		/** @type {Evt} */ let mouseDownEvt;
		/** @type {Evt} */ let mouseMoveEvt;
		/** @type {Evt} */ let mouseUpEvt;
		/** @type {Evt} */ let wheelEvt;
		/** @type {Evt} */ let mouseHoverEvt;
		/** @type {Evt} */ let mouseLeaveEvt;
		/** @type {Evt} */ let touchStartEvt;
		/** @type {Evt} */ let touchMoveEvt;
		/** @type {Evt} */ let touchEndEvt;
		/** @type {Evt} */ let touchCancelEvt;

		const { singleDown = noop, singleMove = noop, singleUp = noop } = callbacks;
		const { doubleDown = noop, doubleMove = noop, doubleUp = noop } = callbacks;
		const { singleHover = noop, singleLeave = noop, wheelRot = noop } = callbacks;

		const touchIds = /** @type {number[]} */ ([]);

		const wrap = makeOffsetWrapper(() => offsetElem);

		const mousedown = wrap(function mousedown(/** @type {MouseEvent} */ e, dx, dy) {
			if (e.button !== 0) return false
			addListener(mouseMoveEvt);
			addListener(mouseUpEvt);
			removeListener(mouseHoverEvt);
			return singleDown(e, 'mouse', e.clientX + dx, e.clientY + dy, false)
		});

		const mousemove = wrap(function mousemove(/** @type {MouseEvent} */ e, dx, dy) {
			return singleMove(e, 'mouse', e.clientX + dx, e.clientY + dy)
		});

		const mouseup = wrap(function mouseup(/** @type {MouseEvent} */ e, dx, dy) {
			if (e.button !== 0) return false
			removeListener(mouseMoveEvt);
			removeListener(mouseUpEvt);
			addListener(mouseHoverEvt);
			return singleUp(e, 'mouse', false)
		});

		const mousemoveHover = wrap(function mousemoveHover(/** @type {MouseEvent} */ e, dx, dy) {
			return singleHover(e, e.clientX + dx, e.clientY + dy)
		});

		const mouseleave = wrap(function mouseleave(/** @type {MouseEvent} */ e, dx, dy) {
			return singleLeave(e, e.clientX + dx, e.clientY + dy)
		});

		const touchstart = wrap(function touchstart(/** @type {TouchEvent} */ e, dx, dy) {
			const curCount = touchIds.length;
			if (curCount === 2) return false
			const changedTouches = e.changedTouches;

			if (curCount === 0) {
				addListener(touchMoveEvt);
				addListener(touchEndEvt);
				addListener(touchCancelEvt);
			}

			if (curCount === 0 && changedTouches.length === 1) {
				const t = e.changedTouches[0];
				touchIds.push(t.identifier);
				return singleDown(e, touchIds[0], t.clientX + dx, t.clientY + dy, false)
			}

			let t0, t1;
			let prevent = /**@type {void|boolean}*/ (false);
			if (curCount === 0) {
				// and changedTouches.length >= 2
				t0 = changedTouches[0];
				t1 = changedTouches[1];
				touchIds.push(t0.identifier);
				prevent = singleDown(e, t0.identifier, t0.clientX + dx, t0.clientY + dy, false);
			} else {
				// curCount === 1 and changedTouches.length >= 1
				t0 = mustFindTouch(e.touches, touchIds[0]);
				t1 = e.changedTouches[0];
			}
			touchIds.push(t1.identifier);
			const prevetUp = singleUp(e, t0.identifier, true);
			prevent = prevent || prevetUp;

			const x0 = t0.clientX + dx;
			const y0 = t0.clientY + dy;
			const x1 = t1.clientX + dx;
			const y1 = t1.clientY + dy;
			const preventDouble = doubleDown(e, touchIds[0], x0, y0, touchIds[1], x1, y1);
			return prevent || preventDouble
		});

		const touchmove = wrap(function touchmove(/** @type {TouchEvent} */ e, dx, dy) {
			const curCount = touchIds.length;
			if (curCount === 1) {
				const t0 = findTouch(e.changedTouches, touchIds[0]);
				if (t0 === null) return false
				return singleMove(e, touchIds[0], t0.clientX + dx, t0.clientY + dy)
			}
			if (curCount === 2) {
				// can not use e.changedTouches: one of touches may have not changed
				const t0 = mustFindTouch(e.touches, touchIds[0]);
				const t1 = mustFindTouch(e.touches, touchIds[1]);
				const x0 = t0.clientX + dx;
				const y0 = t0.clientY + dy;
				const x1 = t1.clientX + dx;
				const y1 = t1.clientY + dy;
				return doubleMove(e, touchIds[0], x0, y0, touchIds[1], x1, y1)
			}
		});

		const releasedTouches = /** @type {Touch[]} */ ([]);
		const touchend = wrap(function touchend(/** @type {TouchEvent} */ e, dx, dy) {
			const curCount = touchIds.length;
			if (curCount === 0) return false

			const tid0 = touchIds[0];
			const tid1 = touchIds[1];

			releasedTouches.length = 0;
			for (let j = touchIds.length - 1; j >= 0; j--) {
				for (let i = 0; i < e.changedTouches.length; i++) {
					const t = e.changedTouches[i];
					if (t.identifier === touchIds[j]) {
						touchIds.splice(j, 1);
						releasedTouches.push(t);
						break
					}
				}
			}
			if (releasedTouches.length === 0) return false

			if (curCount === releasedTouches.length) {
				removeListener(touchMoveEvt);
				removeListener(touchEndEvt);
				removeListener(touchCancelEvt);
			}

			if (curCount === 1) {
				// and releasedTouches.length === 1
				return singleUp(e, releasedTouches[0].identifier, false)
			}

			// curCount === 2 and releasedTouches.length >= 1
			const tLast =
				releasedTouches.length === 1 ? mustFindTouch(e.touches, touchIds[0]) : releasedTouches[1];

			const preventUp2 = doubleUp(e, tid0, tid1);
			const preventDown1 = singleDown(e, tLast.identifier, tLast.clientX + dx, tLast.clientY + dy, true);
			let preventUp1 = /**@type {void|boolean}*/ (false);
			if (curCount === 2 && releasedTouches.length === 2) {
				preventUp1 = singleUp(e, tLast.identifier, false);
			}
			return preventUp2 || preventDown1 || preventUp1
		});

		const touchcancel = wrap(function touchcancel(/** @type {TouchEvent} */ e, dx, dy) {
			touchend(e);
		});

		const mousewheel = makeWheelListener(wrap, wheelRot);

		return makeEventsToggler((/**@type {MoveElemsCfg}*/ elems) => {
			startElem = elems.startElem;
			moveElem = elems.moveElem ?? window;
			leaveElem = elems.leaveElem ?? startElem;
			offsetElem = nullUnlessOffset(elems.offsetElem, startElem);

			mouseDownEvt = /** @type {Evt} */ ([startElem, 'mousedown', mousedown]);
			mouseMoveEvt = /** @type {Evt} */ ([moveElem, 'mousemove', mousemove]);
			mouseUpEvt = /** @type {Evt} */ ([moveElem, 'mouseup', mouseup]);
			wheelEvt = /** @type {Evt} */ ([startElem, 'wheel', mousewheel]);
			mouseHoverEvt = /** @type {Evt} */ ([moveElem, 'mousemove', mousemoveHover]);
			mouseLeaveEvt = /** @type {Evt} */ ([leaveElem, 'mouseleave', mouseleave]);
			touchStartEvt = /** @type {Evt} */ ([startElem, 'touchstart', touchstart]);
			touchMoveEvt = /** @type {Evt} */ ([moveElem, 'touchmove', touchmove]);
			touchEndEvt = /** @type {Evt} */ ([moveElem, 'touchend', touchend]);
			touchCancelEvt = /** @type {Evt} */ ([moveElem, 'touchcancel', touchcancel]);

			// prettier-ignore
			const events = [
				mouseDownEvt, mouseMoveEvt, mouseUpEvt, mouseHoverEvt, mouseLeaveEvt, wheelEvt,
				touchStartEvt, touchMoveEvt, touchEndEvt, touchCancelEvt,
			];
			const autoOnEvents = [mouseDownEvt, touchStartEvt, mouseHoverEvt, mouseLeaveEvt, wheelEvt];
			return [events, autoOnEvents]
		})
	}

	function noop() {}

	/**
	 * @param {() => Element|null|undefined} getOffsetElem
	 */
	function makeOffsetWrapper(getOffsetElem) {
		/**
		 * @template {Event} T
		 * @param {(e:T, x:number, y:number) => boolean|void} func
		 * @returns {(e:T) => void}
		 */
		function wrap(func) {
			return e => {
				let dx = 0;
				let dy = 0;
				const elem = getOffsetElem();
				if (elem) ({ left: dx, top: dy } = elem.getBoundingClientRect());
				func(e, -dx, -dy) && e.preventDefault();
			}
		}
		return wrap
	}

	/**
	 * @param {Element|null|undefined|'no-offset'} elem
	 * @param {Element} defaultElem
	 */
	function nullUnlessOffset(elem, defaultElem) {
		if (elem === 'no-offset') return null
		return elem ?? defaultElem
	}

	/**
	 * @param {(func: (e:WheelEvent, x:number, y:number) => boolean|void) => ((e:WheelEvent) => void)} wrap
	 * @param {(e:WheelEvent, deltaX:number, deltaY:number, deltaZ:number, x:number, y:number) => void|boolean} wheelRot
	 */
	function makeWheelListener(wrap, wheelRot) {
		const deltaMode2pixels = [];
		deltaMode2pixels[WheelEvent.DOM_DELTA_PIXEL] = 1;
		deltaMode2pixels[WheelEvent.DOM_DELTA_LINE] = 20;
		deltaMode2pixels[WheelEvent.DOM_DELTA_PAGE] = 50; // а это вообще как?
		return wrap(function mousewheel(/** @type {WheelEvent} */ e, dx, dy) {
			const k = deltaMode2pixels[e.deltaMode];
			return wheelRot(e, e.deltaX * k, e.deltaY * k, e.deltaZ * k, e.clientX + dx, e.clientY + dy)
		})
	}

	/**
	 * @template TElemsCfg
	 * @param {(elems: TElemsCfg) => EvtGroup} getEvents
	 * @returns {ControlToggler<TElemsCfg>}
	 */
	function makeEventsToggler(getEvents) {
		let events = /**@type {(EvtGroup|null)}*/ (null);

		return {
			get isOn() {
				return !!events
			},
			on(elems) {
				if (!events) {
					events = getEvents(elems);
					const autoOnEvents = events[1];
					autoOnEvents.map(addListener);
				}
				return this
			},
			off() {
				if (events) {
					const allEents = events[0];
					allEents.map(removeListener);
					events = null;
				}
				return this
			},
		}
	}

	/**
	 * @param {TouchList} list
	 * @param {number} id
	 */
	function findTouch(list, id) {
		for (let i = 0; i < list.length; i++) if (list[i].identifier === id) return list[i]
		return null
	}
	/**
	 * @param {TouchList} list
	 * @param {number} id
	 */
	function mustFindTouch(list, id) {
		const touch = findTouch(list, id);
		if (touch === null) throw new Error(`touch #${id} not found`)
		return touch
	}

	/** @param {Evt} event */
	function addListener(event) {
		event[0].addEventListener(event[1], event[2], { capture: true, passive: false });
	}

	/** @param {Evt} event */
	function removeListener(event) {
		event[0].removeEventListener(event[1], event[2], { capture: true });
	}

	/**
	 * Chooses and returns random argument.
	 * @template T
	 * @param  {...T} args
	 * @returns {T}
	 */
	function oneOf(...args) {
		return args[(args.length * Math.random()) | 0]
	}

	/** @type {Partial<CSSStyleDeclaration>} */
	const CREDIT_BOTTOM_RIGHT = {
		position: 'absolute',
		right: '0',
		bottom: '0',
		font: '11px/1.5 sans-serif',
		background: 'white',
		padding: '0 5px',
		opacity: '0.75',
	};

	/**
	 * Shortcut for appending some HTML at the right-bottom of another element.
	 * @param {HTMLElement} wrap parent element, usually `map.getWrap()`
	 * @param {string} html content as HTML (won't be escaped)
	 * @param {Partial<CSSStyleDeclaration>} [style=CREDIT_BOTTOM_RIGHT] custom style object
	 */
	function appendCredit(wrap, html, style = CREDIT_BOTTOM_RIGHT) {
		const elem = document.createElement('div');
		elem.className = 'map-credit';
		elem.innerHTML = html;
		for (const name in style) elem.style[name] = /**@type {string}*/ (style[name]);
		wrap.appendChild(elem);
	}

	/**
	 * @param {number} a
	 * @param {number} b
	 * @param {number} x
	 */
	function clamp(a, b, x) {
		return Math.max(a, Math.min(b, x))
	}

	/**
	 * @param {number} x1
	 * @param {number} y1
	 * @param {number} x2
	 * @param {number} y2
	 */
	function point_distance(x1, y1, x2, y2) {
		return Math.sqrt((x2 - x1) * (x2 - x1) + (y2 - y1) * (y2 - y1))
	}

	/**
	 * Returns `attr` speed prediction for `timeStamp` moment by
	 * calculating acceleration of values `items[i][attr]` (with linear approximation).
	 * @param {{stamp:number}[]} items
	 * @param {string} attr
	 * @param {number} timeStamp
	 */
	function getApproximatedSpeed(items, attr, timeStamp) {
		// https://prog-cpp.ru/mnk/
		let sumx = 0;
		let sumy = 0;
		let sumx2 = 0;
		let sumxy = 0;
		let n = 0;
		const len = items.length;
		const now = performance.now();
		const last = items[len - 1];
		let cur = last;
		for (let i = len - 1; i > 0; i--) {
			const prev = items[i - 1];
			if (now - prev.stamp > 150) break
			const dtime = cur.stamp - prev.stamp;
			const dattr = cur[attr] - prev[attr];
			if (dtime === 0) continue

			const x = cur.stamp;
			const y = /**@type {number}*/ (dattr / dtime);
			sumx += x;
			sumy += y;
			sumx2 += x * x;
			sumxy += x * y;
			n++;
			cur = prev;
		}

		if (n === 1) {
			// Got only two usable items (the last movement was too short),
			// just returning average speed between them.
			const dtime = last.stamp - cur.stamp;
			const dattr = last[attr] - cur[attr];
			if (dtime < 4) return 0 //in case events are too close or have the same time
			return dattr / dtime
		}
		if (n === 0) return 0

		const aDenom = n * sumx2 - sumx * sumx;
		if (aDenom === 0) return 0
		const a = (n * sumxy - sumx * sumy) / aDenom;
		const b = (sumy - a * sumx) / n;
		let k = a * timeStamp + b;

		const dattr = last[attr] - cur[attr];
		if (k * dattr < 0) k = 0; //if acceleration changes the sign (i.e. flips direction), movement should be stopped
		return k
	}

	/**
	 * "default timing in Windows is 500ms" https://stackoverflow.com/a/29917394
	 */
	const DBL_CLICK_MAX_DELAY = 500;

	/**
	 * Enables mouse and touch input: gragging, wheel- and pinch-zooming.
	 * @class
	 * @param {{doNotInterfere?:boolean}} [opts]
	 */
	function PointerControlLayer(opts) {
		const { doNotInterfere } = opts || {};
		/** @type {{off():unknown}} */
		let control;

		let mouseX = 0;
		let mouseY = 0;

		let moveDistance = 0;
		let lastSingleClickAt = 0;
		let lastDoubleTouchParams = /**@type {[number,number,number,number,number,number]|null}*/ (null);

		let lastDoubleTouch_cx = 0;
		let lastDoubleTouch_cy = 0;
		let lastDoubleTouch_dx = 0;
		let lastDoubleTouch_dy = 0;
		let lastDoubleTouch_dist = 1;
		let lastDoubleTouch_stamp = 0;

		let lastMoves = [{ x: 0, y: 0, stamp: 0 }];
		let lastZooms = [{ dist: 0, stamp: 0 }];
		for (const arr of [lastMoves, lastZooms])
			while (arr.length < 5) arr.push(Object.assign({}, /**@type {*}*/ (arr[0])));

		/**
		 * If stamp is new, pops the first array element, pushes in back and returns it.
		 * If stamp is same, just returns the last array element.
		 * Useful for Safari (and maybe some others) where sometimes a bunch of touch events
		 * come with same timeStamp. In that case we should just update last element, not push anything.
		 * @template {{stamp:number}} T
		 * @param {T[]} arr
		 * @param {number} stamp
		 * @returns {T}
		 */
		function peekOrShift(arr, stamp) {
			const last = arr[arr.length - 1];
			if (last.stamp === stamp) return last
			const newLast = /** @type {*} */ (arr.shift());
			arr.push(newLast);
			return newLast
		}
		/** @param {number} stamp */
		function recordMousePos(stamp) {
			const last = peekOrShift(lastMoves, stamp);
			last.x = mouseX;
			last.y = mouseY;
			last.stamp = stamp;
		}
		/** Shifts all lastMoves so that the last recorded move will be at mouse(x,y) */
		function moveRecordedMousePos() {
			const last = lastMoves[lastMoves.length - 1];
			const dx = mouseX - last.x;
			const dy = mouseY - last.y;
			for (let i = 0; i < lastMoves.length; i++) {
				lastMoves[i].x += dx;
				lastMoves[i].y += dy;
			}
		}
		/** @param {number} stamp */
		function recordTouchDist(stamp) {
			const last = peekOrShift(lastZooms, stamp);
			last.dist = lastDoubleTouch_dist;
			last.stamp = stamp;
		}
		/**
		 * @param {import('./map').LocMap} map
		 * @param {number} timeStamp
		 */
		function applyInertia(map, timeStamp) {
			const dx = getApproximatedSpeed(lastMoves, 'x', timeStamp);
			const dy = getApproximatedSpeed(lastMoves, 'y', timeStamp);
			const dz = getApproximatedSpeed(lastZooms, 'dist', timeStamp) / lastDoubleTouch_dist + 1;
			map.applyMoveInertia(dx, dy, lastMoves[lastMoves.length - 1].stamp);
			map.applyZoomInertia(mouseX, mouseY, dz, lastZooms[lastZooms.length - 1].stamp);
		}

		/**
		 * Sets mouse(x,y) to (x,y) with special post-double-touch correction.
		 *
		 * Two fingers do not lift simultaneously, so there is (almost) always two-touches -> one-touch -> no touch.
		 * This may cause a problem if two touches move in opposite directions (zooming):
		 * while they both are down, there is a little movement,
		 * but when first touch lift, second (still down) starts to move map aside with significant speed.
		 * Then second touch lifts too and speed reduces again (because of smoothing and inertia).
		 * All that makes motion at the end of zoom gesture looks trembling.
		 *
		 * This function tries to fix that by continuing double-touch motion for a while.
		 * Used only for movement: zooming should remain smooth thanks to applyInertia() at the end of doubleUp().
		 * @param {number} x
		 * @param {number} y
		 * @param {number} stamp
		 */
		function setCorrectedSinglePos(x, y, stamp) {
			const timeDelta = stamp - lastDoubleTouch_stamp;
			const duration = 150;
			const k = clamp(0, 1, ((duration - timeDelta) / duration) * 2);
			mouseX = (lastDoubleTouch_cx + lastDoubleTouch_dx * timeDelta) * k + x * (1 - k);
			mouseY = (lastDoubleTouch_cy + lastDoubleTouch_dy * timeDelta) * k + y * (1 - k);
		}

		/**
		 * For some reason FF return same touchMove event for each touch
		 * (two events with same timeStamps and coords for two touches, thee for thee, etc.)
		 * @param {number} centerX
		 * @param {number} centerY
		 * @param {number} distance
		 * @param {number} stamp
		 */
		function doubleMoveHasChanged(centerX, centerY, distance, stamp) {
			return (
				mouseX !== centerX ||
				mouseY !== centerY ||
				lastDoubleTouch_dist !== distance ||
				lastMoves[lastMoves.length - 1].stamp !== stamp
			)
		}

		/**
		 * @param {MouseEvent|TouchEvent} e
		 * @param {'mouse'|number} id
		 */
		function shouldShowTwoFingersHint(e, id) {
			return doNotInterfere && id !== 'mouse' && e.timeStamp - lastDoubleTouch_stamp > 1000
		}

		/** @param {import('./map').LocMap} map */
		const makeControl = map =>
			controlDouble({
				singleDown(e, id, x, y, isSwitching) {
					if (shouldShowTwoFingersHint(e, id)) return false
					map.getWrap().focus();
					setCorrectedSinglePos(x, y, e.timeStamp);
					if (isSwitching) moveRecordedMousePos();
					if (!isSwitching) {
						recordMousePos(e.timeStamp);
						map.applyMoveInertia(0, 0, 0);
						map.applyZoomInertia(0, 0, 1, 0);
						moveDistance = 0;
						lastDoubleTouchParams = null;
					}
					map.emit('singleDown', { x, y, id, isSwitching });
					return true
				},
				singleMove(e, id, x, y) {
					if (shouldShowTwoFingersHint(e, id)) {
						map.emit('controlHint', { type: 'use_two_fingers' });
						return false
					}
					const oldX = mouseX;
					const oldY = mouseY;
					setCorrectedSinglePos(x, y, e.timeStamp);
					moveDistance += point_distance(oldX, oldY, mouseX, mouseY);
					map.move(mouseX - oldX, mouseY - oldY);
					recordMousePos(e.timeStamp);
					map.emit('singleMove', { x, y, id });
					return true
				},
				singleUp(e, id, isSwitching) {
					const stamp = e.timeStamp;
					if (!isSwitching) applyInertia(map, stamp);
					map.emit('singleUp', { x: mouseX, y: mouseY, id, isSwitching });
					if (moveDistance < 5 && !isSwitching) {
						if (lastDoubleTouchParams) {
							map.zoomSmooth(mouseX, mouseY, 0.5, stamp);
							const [id0, x0, y0, id1, x1, y1] = lastDoubleTouchParams;
							map.emit('doubleClick', { id0, x0, y0, id1, x1, y1 });
						} else {
							const isDbl = lastSingleClickAt > stamp - DBL_CLICK_MAX_DELAY;
							lastSingleClickAt = stamp;
							if (isDbl) map.zoomSmooth(mouseX, mouseY, 2, stamp);
							map.emit(isDbl ? 'dblClick' : 'singleClick', { x: mouseX, y: mouseY, id });
						}
					}
					return true
				},
				doubleDown(e, id0, x0, y0, id1, x1, y1) {
					mouseX = (x0 + x1) * 0.5;
					mouseY = (y0 + y1) * 0.5;
					lastDoubleTouch_dist = point_distance(x0, y0, x1, y1);
					lastDoubleTouch_cx = mouseX;
					lastDoubleTouch_cy = mouseY;
					moveRecordedMousePos();
					lastDoubleTouchParams = [id0, x0, y0, id1, x1, y1];
					map.emit('doubleDown', { id0, x0, y0, id1, x1, y1 });
					return true
				},
				doubleMove(e, id0, x0, y0, id1, x1, y1) {
					const cx = (x0 + x1) * 0.5;
					const cy = (y0 + y1) * 0.5;
					const cd = point_distance(x0, y0, x1, y1);
					if (doubleMoveHasChanged(cx, cy, cd, e.timeStamp)) {
						map.move(cx - mouseX, cy - mouseY);
						map.zoom(cx, cy, cd / lastDoubleTouch_dist);
						moveDistance +=
							point_distance(mouseX, mouseY, cx, cy) + Math.abs(cd - lastDoubleTouch_dist);
						lastDoubleTouchParams = [id0, x0, y0, id1, x1, y1];
						mouseX = cx;
						mouseY = cy;
						lastDoubleTouch_dist = cd;
						lastDoubleTouch_cx = cx;
						lastDoubleTouch_cy = cy;
						recordMousePos(e.timeStamp);
						recordTouchDist(e.timeStamp);
						map.emit('doubleMove', { id0, x0, y0, id1, x1, y1 });
					}
					return true
				},
				doubleUp(e, id0, id1) {
					const stamp = e.timeStamp;
					lastDoubleTouch_dx = getApproximatedSpeed(lastMoves, 'x', stamp);
					lastDoubleTouch_dy = getApproximatedSpeed(lastMoves, 'y', stamp);
					lastDoubleTouch_stamp = e.timeStamp;
					map.emit('doubleUp', { id0, id1 });
					return true
				},
				wheelRot(e, deltaX, deltaY, deltaZ, x, y) {
					if (!doNotInterfere || e.ctrlKey || e.metaKey) {
						map.zoomSmooth(x, y, Math.pow(2, -deltaY / 240), e.timeStamp);
						return true
					} else {
						map.emit('controlHint', { type: 'use_control_to_zoom' });
						return false
					}
				},
				singleHover(e, x, y) {
					map.emit('singleHover', { x, y });
				},
			}).on({
				// not map.getWrap(): so this layer will not prevent events from reaching other layers
				startElem: map.getCanvas(),
			});

		/** @param {import('./map').LocMap} map */
		this.register = map => {
			control = makeControl(map);
		};

		/** @param {import('./map').LocMap} map */
		this.unregister = map => {
			control.off();
		};
	}

	/**
	 * Enables keyboard controls: arrows for movement, +/- for zoom. Shift can be used for speedup.
	 * Makes map element focusable.
	 * @class
	 * @param {object} [opts]
	 * @param {string|null} [opts.outlineFix] value that will be set to `map.getWrap().style.outline`.
	 *   It's a workaround for mobile Safari 14 (at least) bug where `canvas` performance
	 *   drops significantly after changing parent `tabIndex` attribute.
	 */
	function KeyboardControlLayer(opts) {
		const { outlineFix = 'none' } = opts || {};
		/** @type {(e:KeyboardEvent) => unknown} */
		let handler;
		let oldTabIndex = -1;

		/** @param {import('./map').LocMap} map */
		const makeHandler = map => (/**@type {KeyboardEvent}*/ e) => {
			if (e.ctrlKey || e.altKey) return

			let shouldPrevent = true;
			const { key, shiftKey, timeStamp } = e;
			const { width, height } = map.getCanvas();
			const moveDelta = 75 * (shiftKey ? 3 : 1);
			const zoomDelta = 2 * (shiftKey ? 2 : 1);

			if (key === 'ArrowUp') {
				map.moveSmooth(0, moveDelta, timeStamp);
			} else if (key === 'ArrowDown') {
				map.moveSmooth(0, -moveDelta, timeStamp);
			} else if (key === 'ArrowLeft') {
				map.moveSmooth(moveDelta, 0, timeStamp);
			} else if (key === 'ArrowRight') {
				map.moveSmooth(-moveDelta, 0, timeStamp);
			} else if (key === '=' || key === '+') {
				map.zoomSmooth(width / 2, height / 2, zoomDelta, timeStamp);
			} else if (key === '-' || key === '_') {
				map.zoomSmooth(width / 2, height / 2, 1 / zoomDelta, timeStamp);
			} else {
				shouldPrevent = false;
			}

			if (shouldPrevent) e.preventDefault();
		};

		/** @param {import('./map').LocMap} map */
		this.register = map => {
			const wrap = map.getWrap();
			oldTabIndex = wrap.tabIndex;
			wrap.tabIndex = 1;
			if (outlineFix !== null) wrap.style.outline = outlineFix;
			handler = makeHandler(map);
			wrap.addEventListener('keydown', handler);
		};

		/** @param {import('./map').LocMap} map */
		this.unregister = map => {
			const wrap = map.getWrap();
			wrap.tabIndex = oldTabIndex;
			wrap.removeEventListener('keydown', handler);
		};
	}

	/**
	 * Layer for pointer (mouse/touch) and keyboard input.
	 * See {@linkcode PointerControlLayer} and {@linkcode KeyboardControlLayer}.
	 * @class
	 * @param {Parameters<typeof PointerControlLayer>[0]} [mouseOpts]
	 * @param {Parameters<typeof KeyboardControlLayer>[0]} [kbdOpts]
	 */
	function ControlLayer(mouseOpts, kbdOpts) {
		const items = [new PointerControlLayer(mouseOpts), new KeyboardControlLayer(kbdOpts)];

		/** @param {import('./map').LocMap} map */
		this.register = map => {
			for (const item of items) item.register(map);
		};

		/** @param {import('./map').LocMap} map */
		this.unregister = map => {
			for (const item of items) item.unregister(map);
		};
	}

	/**
	 * Should be used with `doNotInterfere:true` set on {@linkcode MouseControlLayer} or {@linkcode ControlLayer}.
	 * Shows a text over the map when user input is ignored.
	 * @class
	 * @param {string} controlText text to be shown when `Ctrl`/`⌘` key is required to zoom.
	 *   For example: `` `hold ${controlHintKeyName()} to zoom` ``.
	 * @param {string} twoFingersText text to be shown when two fingers are required to drag.
	 *   For example: `'use two fingers to drag'`.
	 * @param {{styles:Record<string,string>}} [opts] text box style overrides
	 */
	function ControlHintLayer(controlText, twoFingersText, opts) {
		const elem = document.createElement('div');
		elem.className = 'map-control-hint';
		const styles = {
			position: 'absolute',
			width: '100%',
			height: '100%',
			display: 'flex',
			alignItems: 'center',
			justifyContent: 'center',
			textAlign: 'center',
			color: 'rgba(0,0,0,0.7)',
			backgroundColor: 'rgba(127,127,127,0.7)',
			transition: 'opacity 0.25s ease',
			opacity: '0',
			pointerEvents: 'none',
			fontSize: '42px',
		};
		if (opts && opts.styles) Object.assign(styles, opts.styles);
		for (const name in styles) elem.style[name] = styles[name];

		let timeout = -1;
		function showHint(text) {
			clearTimeout(timeout);
			elem.textContent = text;
			elem.style.opacity = '1';
			timeout = window.setTimeout(hideHint, 1000);
		}
		function hideHint() {
			clearTimeout(timeout);
			elem.style.opacity = '0';
		}

		/** @param {import('./map').LocMap} map */
		this.register = map => {
			map.getWrap().appendChild(elem);
		};
		/** @param {import('./map').LocMap} map */
		this.unregister = map => {
			map.getWrap().removeChild(elem);
		};

		/** @type {import('./map').MapEventHandlers} */
		this.onEvent = {
			mapMove: hideHint,
			mapZoom: hideHint,
			controlHint(map, e) {
				switch (e.type) {
					case 'use_control_to_zoom':
						showHint(controlText);
						break
					case 'use_two_fingers':
						showHint(twoFingersText);
						break
				}
			},
		};
	}

	/**
	 * Returns `⌘` on MacOS/iOS and `Ctrl` on other platforms.
	 * Useful for {@linkcode ControlHintLayer}.
	 */
	function controlHintKeyName() {
		return navigator.userAgent.includes('Macintosh') ? '⌘' : 'Ctrl'
	}

	/**
	 * When `img` is `null`, the tile is considerend blank and not drawn (may be replaced by placeholder).
	 *
	 * When `img` is not `null`, the tile is considerend ready to be drawn.
	 *
	 * @template {HTMLImageElement|ImageBitmap|null} TImg
	 * @typedef {{img:TImg, clear:(()=>unknown)|null, x:number, y:number, z:number, appearAt:number, lastDrawIter:number}} Tile
	 */

	/** @typedef {Tile<null>} BlankTile */
	/** @typedef {Tile<HTMLImageElement>|Tile<ImageBitmap>} ImgTile */
	/** @typedef {BlankTile|ImgTile} AnyTile */

	/** @typedef {(img:HTMLImageElement|ImageBitmap|null, clear:()=>unknown) => unknown} TileUpdateFunc */
	/** @typedef {(x:number, y:number, z:number, onUpdate:TileUpdateFunc) => unknown} TileImgLoadFunc */
	/** @typedef {(x:number, y:number, z:number) => string} TilePathFunc */
	/** @typedef {(map:import('./map').LocMap, x:number, y:number, z:number, drawX:number, drawY:number, tileW:number, scale:number) => unknown} TilePlaceholderDrawFunc */

	/**
	 * @param {HTMLImageElement|ImageBitmap} img
	 * @returns {img is HTMLImageElement}
	 */
	function isHtmlImg(img) {
		return 'src' in img
	}

	/** @param {HTMLImageElement} img */
	function clearHtmlImg(img) {
		img.src = '';
	}
	/** @param {ImageBitmap} img */
	function clearBitmapImg(img) {
		img.close();
	}

	/**
	 * @param {HTMLImageElement|ImageBitmap} img
	 * @returns {number}
	 */
	function getImgWidth(img) {
		return isHtmlImg(img) ? img.naturalWidth : img.width
	}

	/**
	 * @param {number} x
	 * @param {number} y
	 * @param {number} z
	 * @returns {string}
	 */
	function getTileKey(x, y, z) {
		return `${x}|${y}|${z}`
	}

	/**
	 * Loads, caches and draws tiles with transitions. To be used with {@linkcode TileLayer}.
	 * @class
	 * @param {number} tileW tile display size
	 * @param {TileImgLoadFunc} tileLoadFunc loads tile image,
	 *   see {@linkcode loadTileImage} and maybe {@linkcode clampEarthTiles}
	 * @param {TilePlaceholderDrawFunc} [tilePlaceholderDrawFunc]
	 *   draws placeholder when tile is not ready or has failed to load
	 *   (for example, {@linkcode drawRectTilePlaceholder})
	 */
	function SmoothTileContainer(tileW, tileLoadFunc, tilePlaceholderDrawFunc) {
		const cache = /** @type {Map<string,AnyTile>} */ (new Map());

		let lastDrawnTiles = /**@type {Set<ImgTile>}*/ (new Set());
		const lastDrawnUnderLevelTilesArr = /**@type {ImgTile[]}*/ ([]);

		/** @type {[iFrom:number, jFrom:number, iCount:number, jCount:number, level:number]} */
		let prevTileRegion = [0, 0, 0, 0, 0];

		let drawIter = 0;

		/**
		 * @param {import('./map').LocMap} map
		 * @param {number} x
		 * @param {number} y
		 * @param {number} z
		 * @returns {AnyTile}
		 */
		function makeTile(map, x, y, z) {
			const tile = /** @type {AnyTile} */ ({
				img: null,
				clear: null,
				x,
				y,
				z,
				appearAt: 0,
				// writing here last iter (instead of 0), so if tile load will abort/fail,
				// this tile won't be the "oldest" one in the cache and won't be quickly removed
				lastDrawIter: drawIter,
			});
			tileLoadFunc(x, y, z, (img, clear) => {
				tile.img = img;
				tile.clear = clear;
				map.requestRedraw();
			});
			return tile
		}

		/**
		 * @param {import('./map').LocMap} map
		 * @param {number} i
		 * @param {number} j
		 * @param {number} level
		 * @param {boolean} loadIfMissing
		 */
		function findTile(map, i, j, level, loadIfMissing) {
			const key = getTileKey(i, j, level);
			let tile = cache.get(key);
			if (!tile && loadIfMissing) {
				tile = makeTile(map, i, j, level);
				cache.set(key, tile);
			}
			return tile
		}

		/**
		 * @param {import('./map').LocMap} map
		 * @param {number} i
		 * @param {number} j
		 * @param {number} level
		 * @param {boolean} useOpacity
		 */
		function canFullyDrawRecentTile(map, i, j, level, useOpacity) {
			const tile = findTile(map, i, j, level, false);
			return (
				!!tile &&
				!!tile.img &&
				// if tile not drawn recently, it will became transparent on next draw
				tileDrawnRecently(tile) &&
				(!useOpacity || getTileOpacity(tile) >= 1)
			)
		}

		/** @param {AnyTile} tile */
		function getTileOpacity(tile) {
			return (performance.now() - tile.appearAt) / 150
		}

		/** @param {AnyTile} tile */
		function tileDrawnRecently(tile) {
			return tile.lastDrawIter >= drawIter - 1
		}

		/** @param {AnyTile} tile */
		function tileWasOutsideOnCurLevel(tile) {
			const [iFrom, jFrom, iCount, jCount, level] = prevTileRegion;
			const { x, y, z } = tile;
			return z === level && (x < iFrom || x >= iFrom + iCount || y < jFrom || y >= jFrom + jCount)
		}

		/**
		 * @param {import('./map').LocMap} map
		 * @param {ImgTile} tile
		 * @param {boolean} withOpacity
		 * @param {number} sx
		 * @param {number} sy
		 * @param {number} sw
		 * @param {number} sh
		 * @param {number} x
		 * @param {number} y
		 * @param {number} w
		 * @param {number} h
		 */
		function drawTile(map, tile, withOpacity, sx, sy, sw, sh, x, y, w, h) {
			const rc = map.get2dContext();
			if (!rc) return

			if (!tileDrawnRecently(tile)) {
				// Preventing fade-in animation for loaded tiles which appeared on sides while moving the map.
				// This works only for tiles on current level but is simplier and is enough for most cases.
				if (tileWasOutsideOnCurLevel(tile)) tile.appearAt = 0;
				// making it "appear" a bit earlier, so now tile won't be fully transparent
				else tile.appearAt = performance.now() - 16;
			}
			tile.lastDrawIter = drawIter;
			lastDrawnTiles.add(tile);

			const s = devicePixelRatio;
			// rounding to real canvas pixels
			const rx = Math.round(x * s) / s;
			const ry = Math.round(y * s) / s;
			w = Math.round((x + w) * s) / s - rx;
			h = Math.round((y + h) * s) / s - ry;
			const alpha = withOpacity ? getTileOpacity(tile) : 1;

			if (alpha < 1) rc.globalAlpha = alpha;
			rc.drawImage(tile.img, sx, sy, sw, sh, rx, ry, w, h);
			// rc.fillText(tile.x + '/' + tile.y, rx, ry + 12)
			if (alpha < 1) {
				rc.globalAlpha = 1;
				map.requestRedraw();
			}
		}

		/**
		 * @param {import('./map').LocMap} map
		 * @param {number} x
		 * @param {number} y
		 * @param {number} scale
		 * @param {number} i
		 * @param {number} j
		 * @param {number} level
		 * @param {number} tileX
		 * @param {number} tileY
		 * @param {number} tileZ
		 * @param {boolean} loadIfMissing
		 * @param {boolean} useOpacity
		 * @returns {boolean}
		 */
		function tryDrawTile(map, x, y, scale, i, j, level, tileX, tileY, tileZ, loadIfMissing, useOpacity) {
			const tile = findTile(map, tileX, tileY, tileZ, loadIfMissing);
			return !!tile && tryDrawTileObj(map, tile, x, y, scale, i, j, level, useOpacity)
		}

		/**
		 * @param {import('./map').LocMap} map
		 * @param {AnyTile} tile
		 * @param {number} x
		 * @param {number} y
		 * @param {number} scale
		 * @param {number} i
		 * @param {number} j
		 * @param {number} level
		 * @param {boolean} useOpacity
		 * @returns {boolean}
		 */
		function tryDrawTileObj(map, tile, x, y, scale, i, j, level, useOpacity) {
			if (!tile.img) return false
			const dlevel = tile.z - level;
			const dzoom = 2 ** dlevel;
			const di = tile.x - i * dzoom;
			const dj = tile.y - j * dzoom;
			const imgW = getImgWidth(tile.img);

			let sx, sy, sw, dw;
			if (dlevel >= 0) {
				if (di < 0 || dj < 0 || di >= dzoom || dj >= dzoom) return false
				dw = (tileW * scale) / dzoom;
				x += di * dw;
				y += dj * dw;
				sx = 0;
				sy = 0;
				sw = imgW;
			} else {
				sw = imgW * dzoom;
				sx = -di * imgW;
				sy = -dj * imgW;
				if (sx < 0 || sy < 0 || sx >= imgW || sy >= imgW) return false
				dw = tileW * scale;
			}

			drawTile(map, tile, useOpacity,
			         sx,sy, sw,sw,
			         x,y, dw,dw); //prettier-ignore
			return true
		}

		/**
		 * @param {import('./map').LocMap} map
		 * @param {number} x
		 * @param {number} y
		 * @param {number} scale
		 * @param {number} i
		 * @param {number} j
		 * @param {number} level
		 * @param {boolean} shouldLoad
		 */
		function drawOneTile(map, x, y, scale, i, j, level, shouldLoad) {
			if (!canFullyDrawRecentTile(map, i, j, level, true)) {
				//prettier-ignore
				const canFillByQuaters =
					canFullyDrawRecentTile(map, i*2,   j*2,   level+1, false) &&
					canFullyDrawRecentTile(map, i*2,   j*2+1, level+1, false) &&
					canFullyDrawRecentTile(map, i*2+1, j*2,   level+1, false) &&
					canFullyDrawRecentTile(map, i*2+1, j*2+1, level+1, false);

				let upperTileDrawn = false;
				if (!canFillByQuaters) {
					// drawing upper tiles parts
					const topLevel = Math.max(level - 5, Math.log2(map.getZoomRange()[0] / tileW) - 1);
					for (let l = level - 1; l >= topLevel; l--) {
						const sub = level - l;
						upperTileDrawn = tryDrawTile(map, x,y,scale, i,j,level, i>>sub,j>>sub,level-sub, false, false); //prettier-ignore
						if (upperTileDrawn) break
					}
				}

				let lowerTilesDrawn = false;
				if (!upperTileDrawn) {
					tilePlaceholderDrawFunc?.(map, i, j, level, x, y, tileW, scale);
					if (canFillByQuaters) {
						// drawing lower tiles as 2x2
						for (let di = 0; di <= 1; di++)
							for (let dj = 0; dj <= 1; dj++)
								tryDrawTile(map, x, y, scale, i, j, level, i*2+di, j*2+dj, level+1, false, false); //prettier-ignore
						lowerTilesDrawn = true;
					}
				}

				// drawing additional (to 2x2) lower tiles from previous frames, useful for fast zoom-out animation.
				for (let k = 0; k < lastDrawnUnderLevelTilesArr.length; k++) {
					const tile = lastDrawnUnderLevelTilesArr[k];
					// skipping layer+1 if it was handled by upper 2x2
					if (!lowerTilesDrawn || tile.z >= level + 2)
						tryDrawTileObj(map, tile, x, y, scale, i, j, level, true);
				}
			}

			tryDrawTile(map, x, y, scale, i, j, level, i, j, level, shouldLoad, true);
		}

		/**
		 * @param {import('./map').LocMap} map
		 * @param {number} xShift
		 * @param {number} yShift
		 * @param {number} scale
		 * @param {number} iFrom
		 * @param {number} jFrom
		 * @param {number} iCount
		 * @param {number} jCount
		 * @param {number} level
		 * @param {boolean} shouldLoad
		 */
		this.draw = (map, xShift, yShift, scale, iFrom, jFrom, iCount, jCount, level, shouldLoad) => {
			const [mapViewWidth, mapViewheight] = map.getViewBoxSize();
			// view size in tiles (extended a bit: it's needed for larger lastDrawnUnderLevelTilesArr and drawOneTile())
			const tileViewSizeExt = Math.ceil(mapViewWidth / tileW + 1) * Math.ceil(mapViewheight / tileW + 1);

			// refilling recent tiles array
			lastDrawnUnderLevelTilesArr.length = 0;
			lastDrawnTiles.forEach(
				x =>
					x.z >= level + 1 &&
					lastDrawnUnderLevelTilesArr.length < tileViewSizeExt * 2 && //limiting max lower tile count, just in case
					lastDrawnUnderLevelTilesArr.push(x),
			);
			lastDrawnTiles.clear();
			drawIter++;

			// start loading some center tiles first, sometimes useful on slow connections
			if (shouldLoad)
				for (let i = (iCount / 3) | 0; i < (iCount * 2) / 3; i++)
					for (let j = (jCount / 3) | 0; j < (jCount * 2) / 3; j++) {
						findTile(map, iFrom + i, jFrom + j, level, true);
					}

			// drawing tiles
			for (let i = 0; i < iCount; i++)
				for (let j = 0; j < jCount; j++) {
					const x = xShift + i * tileW * scale;
					const y = yShift + j * tileW * scale;
					drawOneTile(map, x, y, scale, iFrom + i, jFrom + j, level, shouldLoad);
				}

			// limiting cache size
			const cacheMaxSize = (8 * tileViewSizeExt) | 0;
			for (let attempt = 0; attempt < 4 && cache.size > cacheMaxSize; attempt++) {
				let oldestIter = drawIter - 1; //must not affect recently drawn tiles
				cache.forEach(tile => (oldestIter = Math.min(oldestIter, tile.lastDrawIter)));
				cache.forEach((tile, key) => {
					if (tile.lastDrawIter === oldestIter) {
						cache.delete(key);
						lastDrawnTiles.delete(/**@type {ImgTile}*/ (tile));
						tile.clear?.();
					}
				});
			}

			prevTileRegion = [iFrom, jFrom, iCount, jCount, level];
		};

		this.getTileWidth = () => tileW;

		this.clearCache = () => {
			cache.forEach(x => x.clear?.());
			cache.clear();
			lastDrawnTiles.clear();
			lastDrawnUnderLevelTilesArr.length = 0;
		};
	}

	/**
	 * Loads image for {@linkcode TileContainer}s ({@linkcode SmoothTileContainer} for example).
	 * @param {TilePathFunc} pathFunc tile path func, for example:
	 *   ``(x, y, z) => `http://${oneOf('a', 'b', 'c')}.tile.openstreetmap.org/${z}/${x}/${y}.png` ``
	 * @returns {TileImgLoadFunc}
	 */
	function loadTileImage(pathFunc) {
		return (x, y, z, onUpdate) => {
			const img = new Image();
			img.src = pathFunc(x, y, z);
			const clearHtmlimg_ = () => clearHtmlImg(img);
			img.onload = () => {
				const createImageBitmap = window.createImageBitmap;
				if (createImageBitmap) {
					// trying no decode image in parallel thread,
					// if failed (beacuse of CORS for example) tryimg to show image anyway
					createImageBitmap(img).then(
						x => onUpdate(x, () => clearBitmapImg(x)),
						() => onUpdate(img, clearHtmlimg_),
					);
				} else {
					onUpdate(img, clearHtmlimg_);
				}
			};
			onUpdate(null, clearHtmlimg_);
		}
	}

	/**
	 * Wrapper for {@linkcode TilePathFunc} (like {@linkcode loadTileImage}).
	 * Skips loading tiles outside of the map square (1x1 on level 0, 2x2 on level 1, etc.).
	 *
	 * @param {TileImgLoadFunc} tileFunc
	 * @returns {TileImgLoadFunc}
	 */
	function clampEarthTiles(tileFunc) {
		return (x, y, z, onUpdate) => {
			const w = 2 ** z;
			if (z < 0 || x < 0 || x >= w || y < 0 || y >= w) return
			tileFunc(x, y, z, onUpdate);
		}
	}

	/**
	 * Draws simple tile placeholder (semi-transparent square).
	 *
	 * @param {import('./map').LocMap} map
	 * @param {number} x tile column index
	 * @param {number} y tile row index
	 * @param {number} z tile level
	 * @param {number} drawX location on canvas
	 * @param {number} drawY location on canvas
	 * @param {number} tileW current tile size
	 * @param {number} scale tile scale relative to it's regular size (displaying size is `tileW*scale`)
	 */
	function drawRectTilePlaceholder(map, x, y, z, drawX, drawY, tileW, scale) {
		const rc = map.get2dContext();
		if (rc === null) return
		const w = tileW * scale;
		const margin = 1.5;
		rc.strokeStyle = '#8883';
		rc.strokeRect(drawX + margin, drawY + margin, w - margin * 2, w - margin * 2);
	}

	/**
	 * @typedef {object} TileContainer
	 * @prop {() => unknown} clearCache
	 * @prop {() => number} getTileWidth
	 * @prop {(map:import('./map').LocMap,
	 *   xShift:number, yShift:number, scale:number,
	 *   iFrom:number, jFrom:number, iCount:number, jCount:number, level:number,
	 *   shouldLoad: boolean) => unknown} draw
	 */

	/**
	 * Loads and draw tiles using {@linkcode TileContainer}.
	 * Disables tile load while zooming.
	 * @class
	 * @param {TileContainer} tileContainer tile cache/drawer, for example {@linkcode SmoothTileContainer}
	 */
	function TileLayer(tileContainer) {
		let shouldLoadTiles = true;
		let lastZoomAt = 0;
		let curZoomTotalDelta = 1;
		let tileLoadOffTimeout = -1;
		let tileLoadPausedAt = 0;
		/**
		 * @param {import('./map').LocMap} map
		 * @param {number} durationMS
		 */
		function pauseTileLoad(map, durationMS) {
			if (shouldLoadTiles) {
				tileLoadPausedAt = performance.now();
				shouldLoadTiles = false;
			}
			clearTimeout(tileLoadOffTimeout);
			tileLoadOffTimeout = window.setTimeout(() => {
				shouldLoadTiles = true;
				map.requestRedraw();
			}, durationMS);
		}

		/** @param {import('./map').LocMap} map */
		this.unregister = map => {
			tileContainer.clearCache();
		};

		/** @param {import('./map').LocMap} map */
		this.redraw = map => {
			const tileW = tileContainer.getTileWidth();
			//extra level shift (not 0.5), or on half-level zoom text on tiles may be too small
			const level = Math.floor(Math.log2(map.getZoom() / tileW) + 0.4);
			const tileGridSize = 2 ** level;
			const scale = map.getZoom() / tileW / tileGridSize;
			const blockSize = tileW * scale;
			const [mapXShift, mapYShift] = map.getViewBoxShift();
			const [mapViewWidth, mapViewHeight] = map.getViewBoxSize();

			const iFrom = Math.floor(mapXShift / blockSize);
			const xShift = -mapXShift + iFrom * blockSize;

			const jFrom = Math.floor(mapYShift / blockSize);
			const yShift = -mapYShift + jFrom * blockSize;

			const iCount = (((mapViewWidth - xShift) / blockSize) | 0) + 1;
			const jCount = (((mapViewHeight - yShift) / blockSize) | 0) + 1;

			tileContainer.draw(map, xShift, yShift, scale, iFrom, jFrom, iCount, jCount, level, shouldLoadTiles);
		};

		/** @type {import('./map').MapEventHandlers} */
		this.onEvent = {
			mapZoom(map, { delta }) {
				const now = performance.now();
				const timeDelta = now - lastZoomAt;
				if (timeDelta > 250) curZoomTotalDelta = 1; //new zoom action started
				lastZoomAt = now;
				curZoomTotalDelta *= delta;

				// if zoomed enough
				if (curZoomTotalDelta < 1 / 1.2 || curZoomTotalDelta > 1.2) {
					// if fast enough
					const isFast = timeDelta === 0 || Math.abs(delta ** (1 / timeDelta) - 1) > 0.0005;
					if (isFast) {
						// unpausing periodically in case of long slow zooming
						if (shouldLoadTiles || now - tileLoadPausedAt > 1000) pauseTileLoad(map, 80);
					}
				}
			},
		};
	}

	/** @param {import('./map').LocMap} map */
	function applyHashLocation(map) {
		const t = location.hash.substr(1).split('/');
		const lon = parseFloat(t[0]);
		const lat = parseFloat(t[1]);
		const level = parseFloat(t[2]);
		if (isNaN(lon) || isNaN(lat) || isNaN(level)) return
		map.updateLocation(lon, lat, 2 ** level);
	}

	/**
	 * Saves current map position to `location.hash` as `#{lon}/{lat}/{level}`.
	 * Updates map position on `location.hash` change.
	 * @class
	 * @param {number} [lonLatPrec] location precision
	 * @param {number} [levelPrec] level precision
	 */
	function URLLayer(lonLatPrec = 9, levelPrec = 4) {
		let updateTimeout = -1;
		/** @param {import('./map').LocMap} map */
		function updateURL(map) {
			updateTimeout = -1;
			const lon = map.getLon().toFixed(lonLatPrec);
			const lat = map.getLat().toFixed(lonLatPrec);
			const z = Math.log2(map.getZoom()).toFixed(levelPrec);
			history.replaceState({}, '', `#${lon}/${lat}/${z}`);
		}

		/** @type {() => unknown} */
		let onHashChange;

		/** @param {import('./map').LocMap} map */
		this.register = map => {
			applyHashLocation(map);
			onHashChange = () => applyHashLocation(map);
			addEventListener('hashchange', onHashChange);
		};

		/** @param {import('./map').LocMap} map */
		this.unregister = map => {
			clearTimeout(updateTimeout);
			removeEventListener('hashchange', onHashChange);
		};

		/** @param {import('./map').LocMap} map */
		this.update = map => {
			clearTimeout(updateTimeout);
			updateTimeout = window.setTimeout(() => updateURL(map), 500);
		};
	}

	/**
	 * @param {CanvasRenderingContext2D} rc
	 * @param {number} w0
	 * @param {string} c0
	 * @param {number} w1
	 * @param {string} c1
	 */
	function strokeOutlined(rc, w0, c0, w1, c1) {
		rc.lineWidth = w0;
		rc.strokeStyle = c0;
		rc.stroke();
		rc.lineWidth = w1;
		rc.strokeStyle = c1;
		rc.stroke();
	}

	/**
	 * Watches current geolocation, draws a cross or a circle (depending on accuracy) on the map.
	 * @class
	 */
	function LocationLayer() {
		let lastLocation = /** @type {GeolocationCoordinates|null} */ (null);
		let watchID = /** @type {number|null} */ (null);

		/** @param {import('./map').LocMap} map */
		this.register = map => {
			watchID = navigator.geolocation.watchPosition(
				geoPos => {
					lastLocation = geoPos.coords;
					map.requestRedraw();
				},
				null,
				{ enableHighAccuracy: true },
			);
		};

		/** @param {import('./map').LocMap} map */
		this.unregister = map => {
			if (watchID !== null) navigator.geolocation.clearWatch(watchID);
			watchID = null;
		};

		/** @param {import('./map').LocMap} map */
		this.redraw = map => {
			if (!lastLocation) return
			const rc = map.get2dContext();
			if (rc === null) return

			const [mapXShift, mapYShift] = map.getViewBoxShift();
			const x = -mapXShift + map.lon2x(lastLocation.longitude);
			const y = -mapYShift + map.lat2y(lastLocation.latitude);

			const lineW = 4;
			const r = Math.max(lineW / 2, lastLocation.accuracy * map.meters2pixCoef(lastLocation.latitude));

			rc.save();

			rc.beginPath();
			rc.arc(x, y, r, 0, 3.1415927 * 2, false);
			rc.fillStyle = `rgba(230,200,120,0.3)`;
			rc.fill();
			strokeOutlined(rc, lineW, 'white', lineW / 2, 'black');

			const size = Math.min(...map.getViewBoxSize());
			const crossSize = size / 50;
			const innerCrossThresh = size / 4;
			const outerCrossThresh = size / 100;
			if (r > innerCrossThresh) {
				rc.beginPath();
				rc.moveTo(x - crossSize, y);
				rc.lineTo(x + crossSize, y);
				rc.moveTo(x, y - crossSize);
				rc.lineTo(x, y + crossSize);
				rc.lineCap = 'round';
				rc.globalAlpha = Math.min(1, ((r - innerCrossThresh) / innerCrossThresh) * 2);
				strokeOutlined(rc, lineW, 'white', lineW / 2, 'black');
			}
			if (r < outerCrossThresh) {
				rc.beginPath();
				for (const side of [-1, 1]) {
					const d0 = (r * 1.2 + lineW + size / 50) * side;
					const d1 = (r * 1.2 + lineW) * side;
					rc.moveTo(x + d0, y);
					rc.lineTo(x + d1, y);
					rc.moveTo(x, y + d0);
					rc.lineTo(x, y + d1);
				}
				rc.lineCap = 'round';
				rc.globalAlpha = Math.min(1, ((outerCrossThresh - r) / outerCrossThresh) * 2);
				strokeOutlined(rc, 4, 'white', 2, 'black');
			}

			rc.restore();
		};
	}

	document.documentElement.style.height = '100%';
	document.body.style.margin = '0';

	const mapWrap = document.createElement('div');
	mapWrap.style.position = 'relative';
	mapWrap.style.left = '0';
	mapWrap.style.top = '0';
	mapWrap.style.width = '100%';
	mapWrap.style.height = '100vh';
	document.body.appendChild(mapWrap);

	const footer = document.createElement('div');
	footer.style.position = 'relative';
	footer.style.left = '0';
	footer.style.top = '0';
	footer.style.height = '50vh';
	footer.style.display = 'flex';
	footer.style.alignItems = 'center';
	footer.style.justifyContent = 'center';
	footer.style.backgroundColor = 'lightgray';
	footer.style.fontSize = '32px';
	footer.textContent = 'More content';
	document.body.appendChild(footer);

	const map = new LocMap(mapWrap, ProjectionMercator);
	const tileContainer = new SmoothTileContainer(
		256,
		clampEarthTiles(
			loadTileImage(
				(x, y, z) => `https://${oneOf('a', 'b', 'c')}.tile.openstreetmap.org/${z}/${x}/${y}.png`,
			),
		),
		drawRectTilePlaceholder,
	);
	map.register(new TileLayer(tileContainer));
	let controlLayer = new ControlLayer();
	map.register(controlLayer);
	map.register(new ControlHintLayer(`hold ${controlHintKeyName()} to zoom`, 'use two fingers to drag'));
	map.register(new LocationLayer());
	map.register(new URLLayer());
	map.resize();
	const credit = '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';
	appendCredit(map.getWrap(), credit);
	map.getWrap().focus();
	window.onresize = map.resize;

	const uiWrap = document.createElement('div');
	uiWrap.style.position = 'absolute';
	uiWrap.style.top = '0';
	uiWrap.style.right = '0';
	uiWrap.style.padding = '5px';
	uiWrap.style.backgroundColor = 'rgba(255,255,255,0.8)';
	uiWrap.innerHTML = `
<label>
	<input class="ctrl-checkbox" type="checkbox"/>
	do not interfere with regular page interaction<br>
	<span style="color:gray">(require ${controlHintKeyName()} for wheel-zoom and two fingers for touch-drag)</span>
</label>`;
	mapWrap.appendChild(uiWrap);

	const $ = selector => uiWrap.querySelector(selector);
	$('.ctrl-checkbox').onchange = function () {
		map.unregister(controlLayer);
		controlLayer = new ControlLayer({ doNotInterfere: this.checked });
		map.register(controlLayer);
	};

	window.addEventListener('error', e => {
		if (e.message === 'Script error.' && e.filename === '') return
		alert(`${e.message} in ${e.filename}:${e.lineno}:${e.colno}`);
	});

}());
//# sourceMappingURL=bundle.b09dd494.js.map
