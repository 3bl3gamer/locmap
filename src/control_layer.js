import { controlDouble } from 'js-control'

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
	let sumx = 0
	let sumy = 0
	let sumx2 = 0
	let sumxy = 0
	let n = 0
	const now = performance.now()
	let startI = items.length - 1
	for (let i = startI; i >= 0; i--) {
		const x = items[i].stamp
		if (now - x > 150) break
		const y = /**@type {number}*/ (items[i][attr])
		sumx += x
		sumy += y
		sumx2 += x * x
		sumxy += x * y
		n++
	}
	if (n <= 1) return 0
	const aDenom = n * sumx2 - sumx * sumx
	if (aDenom === 0) return 0
	const a = (n * sumxy - sumx * sumy) / aDenom
	// const b = (sumy - a * sumx) / n
	return a
}

/**
 * @class
 * @param {{doNotInterfere?:boolean}} [opts]
 */
export function ControlLayer(opts) {
	const { doNotInterfere } = opts || {}
	/** @type {{off():unknown}} */
	let control
	let mouseX = NaN
	let mouseY = NaN
	let mouseSingleDistance = 0

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
	/** @param {import('./map').LocMap} map */
	function applyInertia(map) {
		const frameDelta = map.getFrameTimeDelta()
		const now = performance.now()
		const dx = getApproximatedDelta(lastMoves, 'x') * frameDelta
		const dy = getApproximatedDelta(lastMoves, 'y') * frameDelta
		const dz = (getApproximatedDelta(lastZooms, 'dist') / lastDoubleTouch_dist) * frameDelta + 1
		map.applyMoveInertia(dx, dy)
		map.applyZoomInertia(mouseX, mouseY, dz)
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
		const timeDelta = stamp - lastDoubleTouch_stamp
		const duration = 150
		const k = Math.max(0, Math.min(1, ((duration - timeDelta) / duration) * 2))
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

	/** @param {import('./map').LocMap} map */
	const makeControl = map =>
		controlDouble({
			callbacks: {
				singleDown(e, id, x, y, isSwitching) {
					const isMouse = id === 'mouse'
					setCorrectedSinglePos(x, y, e.timeStamp)
					mouseSingleDistance = 0
					if (isSwitching) moveRecordedMousePos()
					if (!isSwitching) {
						recordMousePos(e.timeStamp)
						map.applyMoveInertia(0, 0)
						map.applyZoomInertia(0, 0, 1)
					}
					map.emit('singleDown', { x, y, id, isSwitching })
					return true
				},
				singleMove(e, id, x, y) {
					const isMouse = id === 'mouse'
					if (doNotInterfere && !isMouse && performance.now() - lastDoubleTouch_stamp > 1000) {
						map.emit('controlHint', { type: 'use_two_fingers' })
					} else {
						const oldX = mouseX
						const oldY = mouseY
						setCorrectedSinglePos(x, y, e.timeStamp)
						mouseSingleDistance += point_distance(oldX, oldY, mouseX, mouseY)
						map.move(mouseX - oldX, mouseY - oldY)
						recordMousePos(e.timeStamp)
						map.emit('singleMove', { x, y, id })
					}
					return true
				},
				singleUp(e, id, isSwitching) {
					const isMouse = id === 'mouse'
					if (!isSwitching) applyInertia(map)
					map.emit('singleUp', { x: mouseX, y: mouseY, id, isSwitching })
					if (mouseSingleDistance < 5 && !isSwitching)
						map.emit('singleClick', { x: mouseX, y: mouseY, id })
					return true
				},
				doubleDown(e, id0, x0, y0, id1, x1, y1, isSwitching) {
					mouseX = (x0 + x1) * 0.5
					mouseY = (y0 + y1) * 0.5
					lastDoubleTouch_dist = point_distance(x0, y0, x1, y1)
					if (isSwitching) moveRecordedMousePos()
					if (!isSwitching) {
						recordMousePos(e.timeStamp)
						recordTouchDist(e.timeStamp)
					}
					map.emit('doubleDown', { id0, x0, y0, id1, x1, y1, isSwitching })
					return true
				},
				doubleMove(e, id0, x0, y0, id1, x1, y1) {
					const cx = (x0 + x1) * 0.5
					const cy = (y0 + y1) * 0.5
					const cd = point_distance(x0, y0, x1, y1)
					if (doubleMoveHasChanged(cx, cy, cd, e.timeStamp)) {
						map.move(cx - mouseX, cy - mouseY)
						map.zoom(cx, cy, cd / lastDoubleTouch_dist)
						mouseX = cx
						mouseY = cy
						lastDoubleTouch_dist = cd
						recordMousePos(e.timeStamp)
						recordTouchDist(e.timeStamp)
						lastDoubleTouch_cx = cx
						lastDoubleTouch_cy = cy
						map.emit('doubleMove', { id0, x0, y0, id1, x1, y1 })
					}
					return true
				},
				doubleUp(e, id0, id1, isSwitching) {
					applyInertia(map)
					mouseX = mouseY = NaN
					lastDoubleTouch_dx = getApproximatedDelta(lastMoves, 'x')
					lastDoubleTouch_dy = getApproximatedDelta(lastMoves, 'y')
					lastDoubleTouch_stamp = e.timeStamp
					map.emit('doubleUp', { id0, id1, isSwitching })
					return true
				},
				wheelRot(e, deltaX, deltaY, deltaZ, x, y) {
					if (!doNotInterfere || e.ctrlKey || e.metaKey) {
						map.zoomSmooth(x, y, Math.pow(2, -deltaY / 250))
						return true
					} else {
						map.emit('controlHint', { type: 'use_control_to_zoom' })
						return false
					}
				},
				singleHover(e, x, y) {
					map.emit('singleHover', { x, y })
				},
			},
			startElem: map.getCanvas(),
		})

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
 * @class
 * @param {string} controlText
 * @param {string} twoFingersText
 * @param {{styles:Record<string,string>}} [opts ]
 */
export function ControlHintLayer(controlText, twoFingersText, opts) {
	const elem = document.createElement('div')
	const styles = {
		position: 'absolute',
		width: '100%',
		height: '100%',
		display: 'flex',
		textAlign: 'center',
		alignItems: 'center',
		justifyContent: 'center',
		color: 'rgba(0,0,0,0.7)',
		backgroundColor: 'rgba(127,127,127,0.7)',
		transition: 'opacity 0.25s ease',
		opacity: '0',
		pointerEvents: 'none',
		fontSize: '200%',
	}
	if (opts && opts.styles) Object.assign(styles, opts.styles)
	for (const name in styles) elem.style[name] = styles[name]

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

export function controlHintKeyName() {
	return navigator.userAgent.includes('Macintosh') ? '⌘' : 'Ctrl'
}
