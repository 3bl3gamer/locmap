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
	 * @class
	 * @param {HTMLElement} wrap
	 * @param {ProjectionConverter} conv
	 */
	function LocMap(wrap, conv) {
		const rect = wrap.getBoundingClientRect();
		let curWidth = rect.width;
		let curHeight = rect.height;

		let lon = 0;
		let lat = 0;
		let level = 8;
		let xShift = 0;
		let yShift = 0;
		let zoom = Math.pow(2, level);
		let minZoom = 256;

		this.getLon = () => lon;
		this.getLat = () => lat;
		this.getLevel = () => level;
		this.getXShift = () => xShift;
		this.getYShift = () => yShift;
		this.getProjConv = () => conv;
		this.getZoom = () => zoom;
		this.getTopLeftXOffset = () => curWidth / 2;
		this.getTopLeftYOffset = () => curHeight / 2;
		this.getTopLeftXShift = () => xShift - curWidth / 2;
		this.getTopLeftYShift = () => yShift - curHeight / 2;
		this.getWidth = () => curWidth;
		this.getHeight = () => curHeight;

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
		this.lon2x = function (lon) {
			return conv.lon2x(lon, zoom)
		};
		/** @param {number} lat */
		this.lat2y = function (lat) {
			return conv.lat2y(lat, zoom)
		};
		/** @param {number} lat */
		this.meters2pixCoef = function (lat) {
			return conv.meters2pixCoef(lat, zoom)
		};
		/** @param {number} x */
		this.x2lon = function (x) {
			return conv.x2lon(x, zoom)
		};
		/** @param {number} y */
		this.y2lat = function (y) {
			return conv.y2lat(y, zoom)
		};

		//----------
		// core
		//----------

		const layers = /** @type {MapLayer[]} */ ([]);
		/** @param {MapLayer} layer */
		this.register = function (layer) {
			const pos = layers.indexOf(layer);
			if (pos != -1) throw new Error('already registered')
			layers.push(layer);
			if (layer.register) layer.register(this);
		};
		/** @param {MapLayer} layer */
		this.unregister = function (layer) {
			const pos = layers.indexOf(layer);
			if (pos == -1) throw new Error('not registered yet')
			layers.splice(pos, 1);
			if (layer.unregister) layer.unregister(this);
		};

		/**
		 * @param {number} _lon
		 * @param {number} _lat
		 * @param {number} _level
		 */
		this.updateLocation = (_lon, _lat, _level) => {
			lon = _lon;
			lat = _lat;
			level = Math.round(_level);
			zoom = Math.pow(2, _level);
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

		const zoomInertiaDeceleration = 0.993;
		const zoomInertiaMinSpeed = 0.0001; //zoom_change/ms
		let zoomInertiaPrevStamp = 0;
		let zoomInertiaDelta = 1;
		let zoomInertiaX = 0;
		let zoomInertiaY = 0;
		const zoomSmoothDeceleration = 0.983;
		let zoomSmoothDelta = 1;

		const moveInertiaDeceleration = 0.993; //relative speed decrease per 1ms
		const moveInertiaMinSpeed = 0.01; //pixels/ms
		let moveInertiaPrevStamp = 0;
		let moveInertiaX = 0;
		let moveInertiaY = 0;

		const smoothIfNecessary = () => {
			const now = performance.now();

			if (
				Math.abs(zoomSmoothDelta - 1) > zoomInertiaMinSpeed ||
				Math.abs(zoomInertiaDelta - 1) > zoomInertiaMinSpeed
			) {
				const elapsed = now - zoomInertiaPrevStamp;

				const smoothK = Math.pow(zoomSmoothDeceleration, elapsed);
				let newSmoothDelta = 1 + (zoomSmoothDelta - 1) * smoothK;
				if (Math.abs(newSmoothDelta - 1) <= zoomInertiaMinSpeed) newSmoothDelta = 1;

				const dz = Math.pow(zoomInertiaDelta, elapsed) * (zoomSmoothDelta / newSmoothDelta);
				this.zoom(zoomInertiaX, zoomInertiaY, dz);

				const inertiaK = Math.pow(zoomInertiaDeceleration, elapsed);
				zoomInertiaDelta = 1 + (zoomInertiaDelta - 1) * inertiaK;
				zoomSmoothDelta = newSmoothDelta;
				zoomInertiaPrevStamp = now;
			}

			if (Math.abs(moveInertiaX) > moveInertiaMinSpeed || Math.abs(moveInertiaY) > moveInertiaMinSpeed) {
				const elapsed = now - moveInertiaPrevStamp;
				this.move(moveInertiaX * elapsed, moveInertiaY * elapsed);
				const k = Math.pow(moveInertiaDeceleration, elapsed);
				moveInertiaX *= k;
				moveInertiaY *= k;
				moveInertiaPrevStamp = now;
			}
		};

		let animFrameRequested = false;
		function requestRedraw() {
			if (!animFrameRequested) {
				animFrameRequested = true;
				requestAnimationFrame(onAnimationFrame);
			}
		}
		/** @param {number} timeStamp */
		function onAnimationFrame(timeStamp) {
			animFrameRequested = false;
			drawLayers();
			smoothIfNecessary();
		}
		this.requestRedraw = requestRedraw;

		//-------------------
		// control inner
		//-------------------
		this.resize = () => {
			const rect = wrap.getBoundingClientRect();

			canvas.width = rect.width * devicePixelRatio;
			canvas.height = rect.height * devicePixelRatio;

			curWidth = rect.width;
			curHeight = rect.height;

			requestRedraw();
		};

		/**
		 * @param {number} x
		 * @param {number} y
		 * @param {number} delta
		 */
		this.zoom = (x, y, delta) => {
			zoom = Math.max(minZoom, zoom * delta);
			level = Math.round(Math.log2(zoom) - 0.1); //extra level shift, or on half-level zoom text on tiles may be too small
			xShift += (-x + curWidth / 2 - xShift) * (1 - delta);
			yShift += (-y + curHeight / 2 - yShift) * (1 - delta);
			pos_screen2map();

			updateLayers();
			requestRedraw();
			this.emit('mapZoom', { x, y, delta });
		};

		/**
		 * @param {number} x
		 * @param {number} y
		 * @param {number} d
		 */
		this.zoomSmooth = (x, y, d) => {
			zoomSmoothDelta = Math.max(minZoom / zoom, zoomSmoothDelta * d);
			zoomInertiaDelta = 1;
			zoomInertiaX = x;
			zoomInertiaY = y;
			zoomInertiaPrevStamp = performance.now();
			smoothIfNecessary();
		};

		/**
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
		 * @param {number} dx
		 * @param {number} dy
		 * @param {number} stamp
		 */
		this.applyMoveInertia = (dx, dy, stamp) => {
			moveInertiaX = dx;
			moveInertiaY = dy;
			moveInertiaPrevStamp = stamp;
			requestAnimationFrame(smoothIfNecessary);
		};
		/**
		 * @param {number} x
		 * @param {number} y
		 * @param {number} dz
		 * @param {number} stamp
		 */
		this.applyZoomInertia = (x, y, dz, stamp) => {
			zoomInertiaDelta = dz;
			zoomSmoothDelta = 1;
			zoomInertiaX = x;
			zoomInertiaY = y;
			zoomInertiaPrevStamp = stamp;
			requestAnimationFrame(smoothIfNecessary);
		};

		//------------
		// events
		//------------

		// TODO: if it could be overloaded, `K` may be `keyof MapEventHandlersMap`
		//       and editor will provide `name` completions (like with `addEventListener`)
		//       https://github.com/microsoft/TypeScript/issues/25590
		/**
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

		lon = 0;
		lat = 0;
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

	/** @typedef {[EventTarget, string, (e:any) => void]} Evt */

	/**
	 * @param {{
	 *   startElem: Element,
	 *   moveElem?: EventTarget|null,
	 *   offsetElem?: Element|null,
	 *   leaveElem?: EventTarget|null,
	 *   callbacks: {
	 *     singleDown?: (e:MouseEvent|TouchEvent, id:'mouse'|number, x:number, y:number, isSwitching:boolean) => boolean|void,
	 *     singleMove?: (e:MouseEvent|TouchEvent, id:'mouse'|number, x:number, y:number) => void|boolean,
	 *     singleUp?: (e:MouseEvent|TouchEvent, id:'mouse'|number, isSwitching:boolean) => void|boolean,
	 *     singleHover?: (e:MouseEvent, x:number, y:number) => void|boolean,
	 *     singleLeave?: (e:MouseEvent, x:number, y:number) => void|boolean,
	 *     doubleDown?: (e:TouchEvent, id0:number, x0:number, y0:number, id1:number, x1:number, y1:number, isSwitching:boolean) => void|boolean,
	 *     doubleMove?: (e:TouchEvent, id0:number, x0:number, y0:number, id1:number, x1:number, y1:number) => void|boolean,
	 *     doubleUp?: (e:TouchEvent, id0:number, id1:number, isSwitching:boolean) => void|boolean,
	 *     wheelRot?: (e:WheelEvent, deltaX:number, deltaY:number, deltaZ:number, x:number, y:number) => void|boolean,
	 *   },
	 * }} params
	 */
	function controlDouble(params) {
		const { startElem, callbacks } = params;
		const moveElem = params.moveElem ?? window;
		const offsetElem = params.offsetElem ?? startElem;
		const leaveElem = params.leaveElem ?? startElem;

		const { singleDown = noop, singleMove = noop, singleUp = noop } = callbacks;
		const { doubleDown = noop, doubleMove = noop, doubleUp = noop } = callbacks;
		const { singleHover = noop, singleLeave = noop, wheelRot = noop } = callbacks;

		const touchIds = /** @type {number[]} */ ([]);

		const wrap = makeOffsetWrapper(offsetElem);

		const mousedown = wrap(function mousedown(/** @type {MouseEvent} */ e, dx, dy) {
			if (e.button != 0) return false
			addListener(mouseMoveEvt);
			addListener(mouseUpEvt);
			removeListener(mouseHoverEvt);
			return singleDown(e, 'mouse', e.clientX + dx, e.clientY + dy, false)
		});

		const mousemove = wrap(function mousemove(/** @type {MouseEvent} */ e, dx, dy) {
			return singleMove(e, 'mouse', e.clientX + dx, e.clientY + dy)
		});

		const mouseup = wrap(function mouseup(/** @type {MouseEvent} */ e, dx, dy) {
			if (e.button != 0) return false
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
			const count = touchIds.length;
			if (count == 2) return false

			if (count == 0) {
				addListener(touchMoveEvt);
				addListener(touchEndEvt);
				addListener(touchCancelEvt);
			}

			if (count == 0 && e.changedTouches.length == 1) {
				const t = e.changedTouches[0];
				touchIds.push(t.identifier);
				return singleDown(e, touchIds[0], t.clientX + dx, t.clientY + dy, false)
			}
			if (count == 0 && e.changedTouches.length >= 2) {
				const ts = e.changedTouches;
				touchIds.push(ts[0].identifier);
				touchIds.push(ts[1].identifier);
				const x0 = ts[0].clientX + dx;
				const y0 = ts[0].clientY + dy;
				const x1 = ts[1].clientX + dx;
				const y1 = ts[1].clientY + dy;
				return doubleDown(e, touchIds[0], x0, y0, touchIds[1], x1, y1, false)
			}
			if (count == 1) {
				const t0 = mustFindTouch(e.touches, touchIds[0]);
				const t1 = e.changedTouches[0];
				touchIds.push(t1.identifier);
				const x0 = t0.clientX + dx;
				const y0 = t0.clientY + dy;
				const x1 = t1.clientX + dx;
				const y1 = t1.clientY + dy;
				const prevent0 = singleUp(e, touchIds[0], true);
				const prevent1 = doubleDown(e, touchIds[0], x0, y0, touchIds[1], x1, y1, true);
				return prevent0 || prevent1
			}
		});

		const touchmove = wrap(function touchmove(/** @type {TouchEvent} */ e, dx, dy) {
			const count = touchIds.length;
			if (count == 1) {
				const t0 = mustFindTouch(e.changedTouches, touchIds[0]);
				return singleMove(e, touchIds[0], t0.clientX + dx, t0.clientY + dy)
			}
			if (count == 2) {
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
			const count = touchIds.length;
			if (count === 0) return false

			releasedTouches.length = 0;
			for (let j = touchIds.length - 1; j >= 0; j--) {
				for (let i = 0; i < e.changedTouches.length; i++) {
					const t = e.changedTouches[i];
					if (t.identifier === touchIds[j]) {
						touchIds.splice(j, 1);
						releasedTouches.push(t);
					}
				}
			}

			if (count === releasedTouches.length) {
				removeListener(touchMoveEvt);
				removeListener(touchEndEvt);
				removeListener(touchCancelEvt);
			}

			if (count === 1 && releasedTouches.length === 1) {
				return singleUp(e, releasedTouches[0].identifier, false)
			}
			if (count == 2 && releasedTouches.length === 2) {
				return doubleUp(e, releasedTouches[0].identifier, releasedTouches[1].identifier, false)
			}
			if (count == 2 && releasedTouches.length === 1) {
				const id0 = touchIds[0];
				const t0 = mustFindTouch(e.touches, id0);
				const t1 = releasedTouches[0];
				const prevent0 = doubleUp(e, id0, t1.identifier, true);
				const prevent1 = singleDown(e, t0.identifier, t0.clientX + dx, t0.clientY + dy, true);
				return prevent0 || prevent1
			}
		});

		const touchcancel = wrap(function touchcancel(/** @type {TouchEvent} */ e, dx, dy) {
			touchend(e);
		});

		const mousewheel = makeWheelListener(wrap, wheelRot);

		const mouseDownEvt = /** @type {Evt} */ ([startElem, 'mousedown', mousedown]);
		const mouseMoveEvt = /** @type {Evt} */ ([moveElem, 'mousemove', mousemove]);
		const mouseUpEvt = /** @type {Evt} */ ([moveElem, 'mouseup', mouseup]);
		const wheelEvt = /** @type {Evt} */ ([startElem, 'wheel', mousewheel]);
		const mouseHoverEvt = /** @type {Evt} */ ([startElem, 'mousemove', mousemoveHover]);
		const mouseLeaveEvt = /** @type {Evt} */ ([leaveElem, 'mouseleave', mouseleave]);
		const touchStartEvt = /** @type {Evt} */ ([startElem, 'touchstart', touchstart]);
		const touchMoveEvt = /** @type {Evt} */ ([moveElem, 'touchmove', touchmove]);
		const touchEndEvt = /** @type {Evt} */ ([moveElem, 'touchend', touchend]);
		const touchCancelEvt = /** @type {Evt} */ ([moveElem, 'touchcancel', touchcancel]);
		// prettier-ignore
		const events = [
			mouseDownEvt, mouseMoveEvt, mouseUpEvt, mouseHoverEvt, mouseLeaveEvt, wheelEvt,
			touchStartEvt, touchMoveEvt, touchEndEvt, touchCancelEvt,
		];
		const autoOnEvents = [mouseDownEvt, touchStartEvt, mouseHoverEvt, mouseLeaveEvt, wheelEvt];

		return makeEventsToggler(events, autoOnEvents)
	}

	function noop() {}

	/**
	 * @param {Element|'no-offset'} offsetElem
	 */
	function makeOffsetWrapper(offsetElem) {
		/**
		 * @template {Event} T
		 * @param {(e:T, x:number, y:number) => boolean|void} func
		 * @returns {(e:T) => void}
		 */
		function wrap(func) {
			return e => {
				let dx = 0;
				let dy = 0;
				if (offsetElem !== 'no-offset') {
	({ left: dx, top: dy } = offsetElem.getBoundingClientRect());
				}
				func(e, -dx, -dy) && e.preventDefault();
			}
		}
		return wrap
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
	 * @param {Evt[]} allEents
	 * @param {Evt[]} autoOnEvents
	 */
	function makeEventsToggler(allEents, autoOnEvents) {
		let isOn = false;
		/** @param {boolean|null|undefined} on */
		function toggle(on) {
			on = on ?? !isOn;
			if (isOn === on) return
			if (on) autoOnEvents.map(addListener);
			else allEents.map(removeListener);
			isOn = on;
		}

		toggle(true);
		return {
			toggle,
			get isOn() {
				return isOn
			},
			on() {
				toggle(true);
			},
			off() {
				toggle(false);
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
	 * @param {number} x1
	 * @param {number} y1
	 * @param {number} x2
	 * @param {number} y2
	 */
	function point_distance(x1, y1, x2, y2) {
		return Math.sqrt((x2 - x1) * (x2 - x1) + (y2 - y1) * (y2 - y1))
	}

	/**
	 * @param {{stamp:number}[]} items
	 * @param {string} attr
	 */
	function getApproximatedDelta(items, attr) {
		// https://prog-cpp.ru/mnk/
		let sumx = 0;
		let sumy = 0;
		let sumx2 = 0;
		let sumxy = 0;
		let n = 0;
		const now = performance.now();
		let startI = items.length - 1;
		for (let i = startI; i >= 0; i--) {
			const x = items[i].stamp;
			if (now - x > 150) break
			const y = /**@type {number}*/ (items[i][attr]);
			sumx += x;
			sumy += y;
			sumx2 += x * x;
			sumxy += x * y;
			n++;
		}
		if (n <= 1) return 0
		const aDenom = n * sumx2 - sumx * sumx;
		if (aDenom === 0) return 0
		const a = (n * sumxy - sumx * sumy) / aDenom;
		// const b = (sumy - a * sumx) / n
		return a
	}

	/**
	 * "default timing in Windows is 500ms" https://stackoverflow.com/a/29917394
	 */
	const DBL_CLICK_MAX_DELAY = 500;

	/**
	 * @class
	 * @param {{doNotInterfere?:boolean}} [opts]
	 */
	function ControlLayer(opts) {
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
		/** @param {import('./map').LocMap} map */
		function applyInertia(map) {
			performance.now();
			const dx = getApproximatedDelta(lastMoves, 'x');
			const dy = getApproximatedDelta(lastMoves, 'y');
			const dz = getApproximatedDelta(lastZooms, 'dist') / lastDoubleTouch_dist + 1;
			map.applyMoveInertia(dx, dy, lastMoves[lastMoves.length - 1].stamp);
			map.applyZoomInertia(mouseX, mouseY, dz, lastZooms[lastZooms.length - 1].stamp);
		}

		/**
		 * Sets mouse(x,y) to (x,y) with special post-double-touch correction.
		 *
		 * Two fingers do not lift simultaneously, so there is always two-touches -> one-touch -> no touch.
		 * This may cause a problem if two touches move in opposite directions (zooming):
		 * while they both are down, there is a little movement,
		 * but when first touch lift, second (still down) starts to move map aside with significant speed.
		 * Then second touch lifts too and speed reduces again (because of smoothing and inertia).
		 * All that makes motion at the end of zoom gesture looks trembling.
		 *
		 * This function tries to fix that by continuing double-touch motion for a while.
		 * Used only for movement: zooming should remain smooth thanks to applyInertia() ath the end of doubleUp().
		 * @param {number} x
		 * @param {number} y
		 * @param {number} stamp
		 */
		function setCorrectedSinglePos(x, y, stamp) {
			const timeDelta = stamp - lastDoubleTouch_stamp;
			const duration = 150;
			const k = Math.max(0, Math.min(1, ((duration - timeDelta) / duration) * 2));
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

		/** @param {import('./map').LocMap} map */
		const makeControl = map =>
			controlDouble({
				callbacks: {
					singleDown(e, id, x, y, isSwitching) {
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
						const isMouse = id === 'mouse';
						if (doNotInterfere && !isMouse && performance.now() - lastDoubleTouch_stamp > 1000) {
							map.emit('controlHint', { type: 'use_two_fingers' });
						} else {
							const oldX = mouseX;
							const oldY = mouseY;
							setCorrectedSinglePos(x, y, e.timeStamp);
							moveDistance += point_distance(oldX, oldY, mouseX, mouseY);
							map.move(mouseX - oldX, mouseY - oldY);
							recordMousePos(e.timeStamp);
							map.emit('singleMove', { x, y, id });
						}
						return true
					},
					singleUp(e, id, isSwitching) {
						if (!isSwitching) applyInertia(map);
						map.emit('singleUp', { x: mouseX, y: mouseY, id, isSwitching });
						if (moveDistance < 5 && !isSwitching) {
							const stamp = e.timeStamp;
							if (lastDoubleTouchParams) {
								map.zoomSmooth(mouseX, mouseY, 0.5);
								const [id0, x0, y0, id1, x1, y1] = lastDoubleTouchParams;
								map.emit('doubleClick', { id0, x0, y0, id1, x1, y1 });
							} else {
								const isDbl = lastSingleClickAt > stamp - DBL_CLICK_MAX_DELAY;
								lastSingleClickAt = stamp;
								if (isDbl) map.zoomSmooth(mouseX, mouseY, 2);
								map.emit(isDbl ? 'dblClick' : 'singleClick', { x: mouseX, y: mouseY, id });
							}
						}
						return true
					},
					doubleDown(e, id0, x0, y0, id1, x1, y1, isSwitching) {
						mouseX = (x0 + x1) * 0.5;
						mouseY = (y0 + y1) * 0.5;
						lastDoubleTouch_dist = point_distance(x0, y0, x1, y1);
						lastDoubleTouch_cx = mouseX;
						lastDoubleTouch_cy = mouseY;
						if (isSwitching) moveRecordedMousePos();
						if (!isSwitching) {
							recordMousePos(e.timeStamp);
							recordTouchDist(e.timeStamp);
							moveDistance = 0;
						}
						lastDoubleTouchParams = [id0, x0, y0, id1, x1, y1];
						map.emit('doubleDown', { id0, x0, y0, id1, x1, y1, isSwitching });
						return true
					},
					doubleMove(e, id0, x0, y0, id1, x1, y1) {
						const cx = (x0 + x1) * 0.5;
						const cy = (y0 + y1) * 0.5;
						const cd = point_distance(x0, y0, x1, y1);
						if (doubleMoveHasChanged(cx, cy, cd, e.timeStamp)) {
							map.move(cx - mouseX, cy - mouseY);
							map.zoom(cx, cy, cd / lastDoubleTouch_dist);
							moveDistance += point_distance(mouseX, mouseY, cx, cy) + (cd - lastDoubleTouch_dist);
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
					doubleUp(e, id0, id1, isSwitching) {
						applyInertia(map);
						lastDoubleTouch_dx = getApproximatedDelta(lastMoves, 'x');
						lastDoubleTouch_dy = getApproximatedDelta(lastMoves, 'y');
						lastDoubleTouch_stamp = e.timeStamp;
						map.emit('doubleUp', { id0, id1, isSwitching });
						return true
					},
					wheelRot(e, deltaX, deltaY, deltaZ, x, y) {
						if (!doNotInterfere || e.ctrlKey || e.metaKey) {
							map.zoomSmooth(x, y, Math.pow(2, -deltaY / 240));
							return true
						} else {
							map.emit('controlHint', { type: 'use_control_to_zoom' });
							return false
						}
					},
					singleHover(e, x, y) {
						map.emit('singleHover', { x, y });
					},
				},
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
	 * @class
	 * @param {string} controlText
	 * @param {string} twoFingersText
	 * @param {{styles:Record<string,string>}} [opts ]
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
			color: 'rgba(0,0,0,0.7)',
			backgroundColor: 'rgba(127,127,127,0.7)',
			transition: 'opacity 0.25s ease',
			opacity: '0',
			pointerEvents: 'none',
			fontSize: '200%',
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

	function controlHintKeyName() {
		return navigator.userAgent.includes('Macintosh') ? '⌘' : 'Ctrl'
	}

	/** @param {HTMLImageElement} img */
	function isLoaded(img) {
		return img.complete && img.naturalWidth > 0
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
	 * @class
	 * @param {number} tileW
	 * @param {(x:number, y:number, z:number) => string} pathFunc
	 */
	function TileContainer(tileW, pathFunc) {
		const cache = /** @type {Map<string,HTMLImageElement>} */ (new Map());

		/**
		 * @param {import('./map').LocMap} map
		 * @param {number} x
		 * @param {number} y
		 * @param {number} z
		 */
		function getTileImg(map, x, y, z) {
			const img = new Image();
			img.src = pathFunc(x, y, z);
			function onLoad() {
				map.requestRedraw();
			}
			img.onload = () => {
				if ('createImageBitmap' in window) {
					// trying no decode image in parallel thread,
					// if failed (beacuse of CORS for example) tryimg to show image anyway
					createImageBitmap(img).then(onLoad, onLoad);
				} else {
					onLoad();
				}
			};
			return img
		}

		/**
		 * @param {import('./map').LocMap} map
		 * @param {HTMLImageElement} img
		 * @param {number} sx
		 * @param {number} sy
		 * @param {number} sw
		 * @param {number} sh
		 * @param {number} x
		 * @param {number} y
		 * @param {number} w
		 * @param {number} h
		 */
		function drawTile(map, img, sx, sy, sw, sh, x, y, w, h) {
			const s = devicePixelRatio;
			// rounding to real canvas pixels
			const rx = Math.round(x * s) / s;
			const ry = Math.round(y * s) / s;
			w = Math.round((x + w) * s) / s - rx;
			h = Math.round((y + h) * s) / s - ry;
			const rc = map.get2dContext();
			if (rc !== null) rc.drawImage(img, sx, sy, sw, sh, rx, ry, w, h);
		}

		/**
		 * @param {import('./map').LocMap} map
		 * @param {number} x
		 * @param {number} y
		 * @param {number} scale
		 * @param {number} i
		 * @param {number} j
		 * @param {number} level
		 * @param {boolean} loadIfMissing
		 */
		this.tryDrawTile = (map, x, y, scale, i, j, level, loadIfMissing) => {
			//console.log("drawing tile", x,y,scale, i,j,l)
			const key = getTileKey(i, j, level);
			const img = cache.get(key);
			if (img === undefined) {
				if (loadIfMissing) cache.set(key, getTileImg(map, i, j, level));
				return false
			} else {
				if (isLoaded(img)) {
					const w = tileW;
					drawTile(map, img,
					         0,0, w,w,
					         x,y, w*scale,w*scale); //prettier-ignore
				}
				return isLoaded(img)
			}
		};

		/**
		 * @param {import('./map').LocMap} map
		 * @param {number} x
		 * @param {number} y
		 * @param {number} scale
		 * @param {number} partN
		 * @param {number} partI
		 * @param {number} partJ
		 * @param {number} i
		 * @param {number} j
		 * @param {number} level
		 */
		this.tryDrawPart = (map, x, y, scale, partN, partI, partJ, i, j, level) => {
			const key = getTileKey(i, j, level);
			const img = cache.get(key);
			if (!img || !isLoaded(img)) return false
			const partW = tileW / partN;
			drawTile(map, img,
			         partI*partW,partJ*partW, partW,partW,
			         x,y, tileW*scale,tileW*scale); //prettier-ignore
			return true
		};

		/**
		 * @param {import('./map').LocMap} map
		 * @param {number} x
		 * @param {number} y
		 * @param {number} scale
		 * @param {number} qi
		 * @param {number} qj
		 * @param {number} i
		 * @param {number} j
		 * @param {number} level
		 */
		this.tryDrawAsQuarter = (map, x, y, scale, qi, qj, i, j, level) => {
			const key = getTileKey(i, j, level);
			const img = cache.get(key);
			if (!img || !isLoaded(img)) return false
			const w = (tileW / 2) * scale;
			drawTile(map, img,
			         0,0, tileW,tileW,
			         x+qi*w,y+qj*w, w,w); //prettier-ignore
			return true
		};

		this.getTileWidth = () => tileW;

		this.clearCache = () => {
			cache.clear();
		};
	}

	/**
	 * @class
	 * @param {import('./tile_container').TileContainer} tileHost
	 */
	function TileLayer(tileHost) {
		const levelDifference = -Math.log2(tileHost.getTileWidth());
		const zoomDifference = 1 / tileHost.getTileWidth();

		let scale = 1;
		let draw_x_shift;
		let draw_y_shift;
		let draw_i_from;
		let draw_j_from;
		let draw_i_numb;
		let draw_j_numb;
		/** @param {import('./map').LocMap} map */
		function updateDrawParams(map) {
			const level_grid_width = 1 << (map.getLevel() + levelDifference);
			scale = (map.getZoom() * zoomDifference) / level_grid_width;
			const block_size = tileHost.getTileWidth() * scale;
			const x_shift = -map.getProjConv().lon2x(map.getLon(), map.getZoom()) + map.getTopLeftXOffset();
			const y_shift = -map.getProjConv().lat2y(map.getLat(), map.getZoom()) + map.getTopLeftYOffset();

			if (x_shift < 0) {
				draw_x_shift = x_shift % block_size;
				draw_i_from = (-x_shift / block_size) | 0;
			} else {
				draw_x_shift = x_shift;
				draw_i_from = 0;
			}
			if (y_shift < 0) {
				draw_y_shift = y_shift % block_size;
				draw_j_from = (-y_shift / block_size) | 0;
			} else {
				draw_y_shift = y_shift;
				draw_j_from = 0;
			}

			draw_i_numb = Math.min(level_grid_width-draw_i_from, ((map.getWidth() -draw_x_shift)/block_size|0)+1); //prettier-ignore
			draw_j_numb = Math.min(level_grid_width-draw_j_from, ((map.getHeight()-draw_y_shift)/block_size|0)+1); //prettier-ignore
			//console.log(scale, draw_i_from, draw_j_from, draw_i_numb, draw_j_numb)
		}

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

		/**
		 * @param {import('./map').LocMap} map
		 * @param {number} x
		 * @param {number} y
		 * @param {number} scale
		 */
		function drawTilePlaceholder(map, x, y, scale) {
			const rc = map.get2dContext();
			if (rc === null) return
			const w = tileHost.getTileWidth() * scale;
			const margin = 1.5;
			rc.strokeStyle = '#eee';
			rc.strokeRect(x + margin, y + margin, w - margin * 2, w - margin * 2);
		}

		/**
		 * @param {import('./map').LocMap} map
		 * @param {number} x
		 * @param {number} y
		 * @param {number} scale
		 * @param {number} i
		 * @param {number} j
		 */
		function drawOneTile(map, x, y, scale, i, j) {
			const level = map.getLevel() + levelDifference;

			let drawn = tileHost.tryDrawTile(map, x, y, scale, i, j, level, shouldLoadTiles);
			if (drawn) return

			for (let sub = 1; sub <= 2; sub++) {
				const n = 1 << sub;
				drawn = tileHost.tryDrawPart(map, x, y, scale, n, i%n, j%n, i>>sub, j>>sub, level - sub); //prettier-ignore
				if (drawn) return
			}

			drawTilePlaceholder(map, x, y, scale);

			tileHost.tryDrawAsQuarter(map, x,y,scale, 0,0, i*2  ,j*2  , level+1); //prettier-ignore
			tileHost.tryDrawAsQuarter(map, x,y,scale, 0,1, i*2  ,j*2+1, level+1); //prettier-ignore
			tileHost.tryDrawAsQuarter(map, x,y,scale, 1,0, i*2+1,j*2  , level+1); //prettier-ignore
			tileHost.tryDrawAsQuarter(map, x,y,scale, 1,1, i*2+1,j*2+1, level+1); //prettier-ignore
		}

		/** @param {import('./map').LocMap} map */
		this.unregister = map => {
			tileHost.clearCache();
		};

		/** @param {import('./map').LocMap} map */
		this.redraw = map => {
			const rc = map.get2dContext();
			if (rc === null) return
			rc.save();

			updateDrawParams(map);

			for (let i = 0; i < draw_i_numb; i++)
				for (let j = 0; j < draw_j_numb; j++) {
					const dx = draw_x_shift + i * tileHost.getTileWidth() * scale;
					const dy = draw_y_shift + j * tileHost.getTileWidth() * scale;
					drawOneTile(map, dx, dy, scale, draw_i_from + i, draw_j_from + j);
				}

			rc.restore();
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
					const isFast = timeDelta === 0 || Math.abs(Math.pow(delta, 1 / timeDelta) - 1) > 0.0005;
					if (isFast) {
						// unpausing periodically in case of long slow zooming
						if (shouldLoadTiles || now - tileLoadPausedAt < 1000) pauseTileLoad(map, 80);
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
		map.updateLocation(lon, lat, level);
	}

	/** @class */
	function URLLayer() {
		let updateTimeout = -1;
		/** @param {import('./map').LocMap} map */
		function updateURL(map) {
			updateTimeout = -1;
			const lon = map.getLon().toFixed(9);
			const lat = map.getLat().toFixed(9);
			const z = (Math.log(map.getZoom()) / Math.LN2).toFixed(4);
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

	/** @class */
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

			const x = -map.getTopLeftXShift() + map.lon2x(lastLocation.longitude);
			const y = -map.getTopLeftYShift() + map.lat2y(lastLocation.latitude);

			const lineW = 4;
			const r = Math.max(lineW / 2, lastLocation.accuracy * map.meters2pixCoef(lastLocation.latitude));

			rc.save();

			rc.beginPath();
			rc.arc(x, y, r, 0, 3.1415927 * 2, false);
			rc.fillStyle = `rgba(230,200,120,0.3)`;
			rc.fill();
			strokeOutlined(rc, lineW, 'white', lineW / 2, 'black');

			const size = Math.min(map.getWidth(), map.getHeight());
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

	/**
	 * @template T
	 * @param  {...T} args
	 * @returns {T}
	 */
	function oneOf(...args) {
		return args[(args.length * Math.random()) | 0]
	}

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
	 * @param {HTMLElement} wrap
	 * @param {string} html
	 * @param {Partial<CSSStyleDeclaration>} [style=CREDIT_BOTTOM_RIGHT]
	 */
	function appendCredit(wrap, html, style = CREDIT_BOTTOM_RIGHT) {
		const elem = document.createElement('div');
		elem.className = 'map-credit';
		elem.innerHTML = html;
		for (const name in style) elem.style[name] = /**@type {string}*/ (style[name]);
		wrap.appendChild(elem);
	}

	document.documentElement.style.height = '100%';
	document.body.style.position = 'relative';
	document.body.style.width = '100%';
	document.body.style.height = '100%';
	document.body.style.margin = '0';

	const map = new LocMap(document.body, ProjectionMercator);
	const tileContainer = new TileContainer(
		256,
		(x, y, z) => `https://${oneOf('a', 'b', 'c')}.tile.openstreetmap.org/${z}/${x}/${y}.png`,
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
	document.body.appendChild(uiWrap);

	const $ = selector => uiWrap.querySelector(selector);
	$('.ctrl-checkbox').onchange = function () {
		map.unregister(controlLayer);
		controlLayer = new ControlLayer({ doNotInterfere: this.checked });
		map.register(controlLayer);
	};

}());
//# sourceMappingURL=bundle.a2a6fbd1.js.map
