import { controlDouble } from 'js-control'
import { applyStyles, clamp } from './utils.js'

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
	let sumx = 0
	let sumy = 0
	let sumx2 = 0
	let sumxy = 0
	let n = 0
	const len = items.length
	const now = performance.now()
	const last = items[len - 1]
	let cur = last
	for (let i = len - 1; i > 0; i--) {
		const prev = items[i - 1]
		if (now - prev.stamp > 150) break
		const dtime = cur.stamp - prev.stamp
		const dattr = cur[attr] - prev[attr]
		if (dtime === 0) continue

		const x = cur.stamp
		const y = /**@type {number}*/ (dattr / dtime)
		sumx += x
		sumy += y
		sumx2 += x * x
		sumxy += x * y
		n++
		cur = prev
	}

	if (n === 1) {
		// Got only two usable items (the last movement was too short),
		// just returning average speed between them.
		const dtime = last.stamp - cur.stamp
		const dattr = last[attr] - cur[attr]
		if (dtime < 4) return 0 //in case events are too close or have the same time
		return dattr / dtime
	}
	if (n === 0) return 0

	const aDenom = n * sumx2 - sumx * sumx
	if (aDenom === 0) return 0
	const a = (n * sumxy - sumx * sumy) / aDenom
	const b = (sumy - a * sumx) / n
	let k = a * timeStamp + b

	const dattr = last[attr] - cur[attr]
	if (k * dattr < 0) k = 0 //if acceleration changes the sign (i.e. flips direction), movement should be stopped
	return k
}

/**
 * "default timing in Windows is 500ms" https://stackoverflow.com/a/29917394
 */
export const DBL_CLICK_MAX_DELAY = 500

/**
 * Enables mouse and touch input: gragging, wheel- and pinch-zooming.
 * @class
 * @param {{doNotInterfere?:boolean}} [opts]
 */
export function PointerControlLayer(opts) {
	const { doNotInterfere } = opts || {}
	/** @type {{off():unknown}} */
	let control

	let mouseX = 0
	let mouseY = 0

	let moveDistance = 0
	let lastSingleClickAt = 0
	let lastDoubleTouchParams = /**@type {[number,number,number,number,number,number]|null}*/ (null)

	let lastDoubleTouch_cx = 0
	let lastDoubleTouch_cy = 0
	let lastDoubleTouch_dx = 0
	let lastDoubleTouch_dy = 0
	let lastDoubleTouch_dist = 1
	let lastDoubleTouch_stamp = 0

	let lastMoves = [{ x: 0, y: 0, stamp: 0 }]
	let lastZooms = [{ dist: 0, stamp: 0 }]
	for (const arr of [lastMoves, lastZooms])
		while (arr.length < 5) arr.push(Object.assign({}, /**@type {*}*/ (arr[0])))

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
		const last = arr[arr.length - 1]
		if (last.stamp === stamp) return last
		const newLast = /** @type {*} */ (arr.shift())
		arr.push(newLast)
		return newLast
	}
	/** @param {number} stamp */
	function recordMousePos(stamp) {
		const last = peekOrShift(lastMoves, stamp)
		last.x = mouseX
		last.y = mouseY
		last.stamp = stamp
	}
	/** Shifts all lastMoves so that the last recorded move will be at mouse(x,y) */
	function moveRecordedMousePos() {
		const last = lastMoves[lastMoves.length - 1]
		const dx = mouseX - last.x
		const dy = mouseY - last.y
		for (let i = 0; i < lastMoves.length; i++) {
			lastMoves[i].x += dx
			lastMoves[i].y += dy
		}
	}
	/** @param {number} stamp */
	function recordTouchDist(stamp) {
		const last = peekOrShift(lastZooms, stamp)
		last.dist = lastDoubleTouch_dist
		last.stamp = stamp
	}
	/**
	 * @param {import('./map').LocMap} map
	 * @param {number} timeStamp
	 */
	function applyInertia(map, timeStamp) {
		const dx = getApproximatedSpeed(lastMoves, 'x', timeStamp)
		const dy = getApproximatedSpeed(lastMoves, 'y', timeStamp)
		const dz = getApproximatedSpeed(lastZooms, 'dist', timeStamp) / lastDoubleTouch_dist + 1
		map.applyMoveInertia(dx, dy, lastMoves[lastMoves.length - 1].stamp)
		map.applyZoomInertia(mouseX, mouseY, dz, lastZooms[lastZooms.length - 1].stamp)
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
		const timeDelta = stamp - lastDoubleTouch_stamp
		const duration = 150
		const k = clamp(0, 1, ((duration - timeDelta) / duration) * 2)
		mouseX = (lastDoubleTouch_cx + lastDoubleTouch_dx * timeDelta) * k + x * (1 - k)
		mouseY = (lastDoubleTouch_cy + lastDoubleTouch_dy * timeDelta) * k + y * (1 - k)
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
	const makeControl = map => {
		const canvas = map.getCanvas()
		canvas.style.cursor = 'grab'

		return controlDouble({
			singleDown(e, id, x, y, isSwitching) {
				if (shouldShowTwoFingersHint(e, id)) return false
				map.getWrap().focus()
				setCorrectedSinglePos(x, y, e.timeStamp)
				if (isSwitching) moveRecordedMousePos()
				if (!isSwitching) {
					recordMousePos(e.timeStamp)
					map.applyMoveInertia(0, 0, 0)
					map.applyZoomInertia(0, 0, 1, 0)
					moveDistance = 0
					lastDoubleTouchParams = null
				}
				map.emit('singleDown', { x, y, id, isSwitching })
				canvas.style.cursor = 'grabbing'
				return true
			},
			singleMove(e, id, x, y) {
				if (shouldShowTwoFingersHint(e, id)) {
					map.emit('controlHint', { type: 'use_two_fingers' })
					return false
				}
				const oldX = mouseX
				const oldY = mouseY
				setCorrectedSinglePos(x, y, e.timeStamp)
				moveDistance += point_distance(oldX, oldY, mouseX, mouseY)
				map.move(mouseX - oldX, mouseY - oldY)
				recordMousePos(e.timeStamp)
				map.emit('singleMove', { x, y, id })
				return true
			},
			singleUp(e, id, isSwitching) {
				const stamp = e.timeStamp
				if (!isSwitching) applyInertia(map, stamp)
				map.emit('singleUp', { x: mouseX, y: mouseY, id, isSwitching })
				if (moveDistance < 5 && !isSwitching) {
					if (lastDoubleTouchParams) {
						map.zoomSmooth(mouseX, mouseY, 0.5, stamp)
						const [id0, x0, y0, id1, x1, y1] = lastDoubleTouchParams
						map.emit('doubleClick', { id0, x0, y0, id1, x1, y1 })
					} else {
						const isDbl = lastSingleClickAt > stamp - DBL_CLICK_MAX_DELAY
						lastSingleClickAt = stamp
						if (isDbl) map.zoomSmooth(mouseX, mouseY, 2, stamp)
						map.emit(isDbl ? 'dblClick' : 'singleClick', { x: mouseX, y: mouseY, id })
					}
				}
				canvas.style.cursor = 'grab'
				return true
			},
			doubleDown(e, id0, x0, y0, id1, x1, y1) {
				mouseX = (x0 + x1) * 0.5
				mouseY = (y0 + y1) * 0.5
				lastDoubleTouch_dist = point_distance(x0, y0, x1, y1)
				lastDoubleTouch_cx = mouseX
				lastDoubleTouch_cy = mouseY
				moveRecordedMousePos()
				lastDoubleTouchParams = [id0, x0, y0, id1, x1, y1]
				map.emit('doubleDown', { id0, x0, y0, id1, x1, y1 })
				return true
			},
			doubleMove(e, id0, x0, y0, id1, x1, y1) {
				const cx = (x0 + x1) * 0.5
				const cy = (y0 + y1) * 0.5
				const cd = point_distance(x0, y0, x1, y1)
				if (doubleMoveHasChanged(cx, cy, cd, e.timeStamp)) {
					map.move(cx - mouseX, cy - mouseY)
					map.zoom(cx, cy, cd / lastDoubleTouch_dist)
					moveDistance +=
						point_distance(mouseX, mouseY, cx, cy) + Math.abs(cd - lastDoubleTouch_dist)
					lastDoubleTouchParams = [id0, x0, y0, id1, x1, y1]
					mouseX = cx
					mouseY = cy
					lastDoubleTouch_dist = cd
					lastDoubleTouch_cx = cx
					lastDoubleTouch_cy = cy
					recordMousePos(e.timeStamp)
					recordTouchDist(e.timeStamp)
					map.emit('doubleMove', { id0, x0, y0, id1, x1, y1 })
				}
				return true
			},
			doubleUp(e, id0, id1) {
				const stamp = e.timeStamp
				lastDoubleTouch_dx = getApproximatedSpeed(lastMoves, 'x', stamp)
				lastDoubleTouch_dy = getApproximatedSpeed(lastMoves, 'y', stamp)
				lastDoubleTouch_stamp = e.timeStamp
				map.emit('doubleUp', { id0, id1 })
				return true
			},
			wheelRot(e, deltaX, deltaY, deltaZ, x, y) {
				if (!doNotInterfere || e.ctrlKey || e.metaKey) {
					map.zoomSmooth(x, y, Math.pow(2, -deltaY / 240), e.timeStamp)
					return true
				} else {
					map.emit('controlHint', { type: 'use_control_to_zoom' })
					return false
				}
			},
			singleHover(e, x, y) {
				map.emit('singleHover', { x, y })
			},
		}).on({
			// not map.getWrap(): so this layer will not prevent events from reaching other layers
			startElem: canvas,
		})
	}

	/** @param {import('./map').LocMap} map */
	this.register = map => {
		control = makeControl(map)
	}

	/** @param {import('./map').LocMap} map */
	this.unregister = map => {
		control.off()
	}
}

/**
 * Enables keyboard controls: arrows for movement, +/- for zoom. Shift can be used for speedup.
 * Makes map element focusable.
 * @class
 * @param {object} [opts]
 * @param {string|null} [opts.outlineFix] value that will be set to `map.getWrap().style.outline`.
 *   It's a workaround for mobile Safari 14 (at least) bug where `canvas` performance
 *   drops significantly after changing parent `tabIndex` attribute.
 *   'none' (default) seems fixing the issue.
 */
export function KeyboardControlLayer(opts) {
	const { outlineFix = 'none' } = opts || {}
	/** @type {(e:KeyboardEvent) => unknown} */
	let handler
	let oldTabIndex = -1

	/** @param {import('./map').LocMap} map */
	const makeHandler = map => (/**@type {KeyboardEvent}*/ e) => {
		if (e.ctrlKey || e.altKey) return

		let shouldPrevent = true
		const { key, shiftKey, timeStamp } = e
		const [width, height] = map.getViewBoxSize()
		const moveDelta = 75 * (shiftKey ? 3 : 1)
		const zoomDelta = 2 * (shiftKey ? 2 : 1)

		if (key === 'ArrowUp') {
			map.moveSmooth(0, moveDelta, timeStamp)
		} else if (key === 'ArrowDown') {
			map.moveSmooth(0, -moveDelta, timeStamp)
		} else if (key === 'ArrowLeft') {
			map.moveSmooth(moveDelta, 0, timeStamp)
		} else if (key === 'ArrowRight') {
			map.moveSmooth(-moveDelta, 0, timeStamp)
		} else if (key === '=' || key === '+') {
			map.zoomSmooth(width / 2, height / 2, zoomDelta, timeStamp)
		} else if (key === '-' || key === '_') {
			map.zoomSmooth(width / 2, height / 2, 1 / zoomDelta, timeStamp)
		} else {
			shouldPrevent = false
		}

		if (shouldPrevent) e.preventDefault()
	}

	/** @param {import('./map').LocMap} map */
	this.register = map => {
		const wrap = map.getWrap()
		oldTabIndex = wrap.tabIndex
		wrap.tabIndex = 1
		if (outlineFix !== null) wrap.style.outline = outlineFix
		handler = makeHandler(map)
		wrap.addEventListener('keydown', handler)
	}

	/** @param {import('./map').LocMap} map */
	this.unregister = map => {
		const wrap = map.getWrap()
		wrap.tabIndex = oldTabIndex
		wrap.removeEventListener('keydown', handler)
	}
}

/**
 * Layer for pointer (mouse/touch) and keyboard input.
 * See {@linkcode PointerControlLayer} and {@linkcode KeyboardControlLayer}.
 * @class
 * @param {Parameters<typeof PointerControlLayer>[0]} [mouseOpts]
 * @param {Parameters<typeof KeyboardControlLayer>[0]} [kbdOpts]
 */
export function ControlLayer(mouseOpts, kbdOpts) {
	const items = [new PointerControlLayer(mouseOpts), new KeyboardControlLayer(kbdOpts)]

	/** @param {import('./map').LocMap} map */
	this.register = map => {
		for (const item of items) item.register(map)
	}

	/** @param {import('./map').LocMap} map */
	this.unregister = map => {
		for (const item of items) item.unregister(map)
	}
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
export function ControlHintLayer(controlText, twoFingersText, opts) {
	const elem = document.createElement('div')
	elem.className = 'map-control-hint'
	applyStyles(elem, {
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
	})
	if (opts?.styles) applyStyles(elem, opts?.styles)

	let timeout = -1
	function showHint(text) {
		clearTimeout(timeout)
		elem.textContent = text
		elem.style.opacity = '1'
		timeout = window.setTimeout(hideHint, 1000)
	}
	function hideHint() {
		clearTimeout(timeout)
		elem.style.opacity = '0'
	}

	/** @param {import('./map').LocMap} map */
	this.register = map => {
		map.getWrap().appendChild(elem)
	}
	/** @param {import('./map').LocMap} map */
	this.unregister = map => {
		map.getWrap().removeChild(elem)
	}

	/** @type {import('./map').MapEventHandlers} */
	this.onEvent = {
		mapMove: hideHint,
		mapZoom: hideHint,
		controlHint(map, e) {
			switch (e.type) {
				case 'use_control_to_zoom':
					showHint(controlText)
					break
				case 'use_two_fingers':
					showHint(twoFingersText)
					break
			}
		},
	}
}

/**
 * Returns `⌘` on MacOS/iOS and `Ctrl` on other platforms.
 * Useful for {@linkcode ControlHintLayer}.
 */
export function controlHintKeyName() {
	return navigator.userAgent.includes('Macintosh') ? '⌘' : 'Ctrl'
}
