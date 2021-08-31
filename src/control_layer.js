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

/** @typedef {{type: 'use_two_fingers'|'use_control_to_zoom'}} HintData */

/**
 * @param {{doNotInterfere?:boolean}} [opts]
 */
export function ControlLayer(opts) {
	const { doNotInterfere } = opts || {}
	/** @type {{off():unknown}} */
	let control
	let mouseX = NaN
	let mouseY = NaN
	let mouseIsDown = false
	let touchDist = 0
	let delayFingersHintUntil = 0

	let lastMoves = [
		{ dx: 0, dy: 0, stamp: 0 },
		{ dx: 0, dy: 0, stamp: 0 },
	]
	let lastZooms = [
		{ x: 0, y: 0, dz: 0, stamp: 0 },
		{ x: 0, y: 0, dz: 0, stamp: 0 },
	]
	// while (lastMoves.length < 2) lastMoves.push(Object.assign({}, lastMoves[0]))

	/**
	 * @param {import('./map').LocMap} map
	 * @param {number} newX
	 * @param {number} newY
	 * @param {number} stamp
	 */
	function applyMovement(map, newX, newY, stamp) {
		if (newX === mouseX && newY === mouseY) return //sometimes zero movements are received (in FF 91 with touch)
		/** @type {typeof lastMoves[number]} */
		const last = /** @type {*} */ (lastMoves.shift())
		lastMoves.push(last)
		last.dx = newX - mouseX
		last.dy = newY - mouseY
		last.stamp = stamp
		map.move(last.dx, last.dy)
	}
	/**
	 * @param {import('./map').LocMap} map
	 * @param {number} x
	 * @param {number} y
	 * @param {number} dz
	 * @param {number} stamp
	 */
	function applyZoom(map, x, y, dz, stamp) {
		if (dz === 1) return //sometimes zero movements are received (in FF 91 with touch)
		/** @type {typeof lastZooms[number]} */
		const last = /** @type {*} */ (lastZooms.shift())
		lastZooms.push(last)
		last.x = x
		last.y = y
		last.dz = dz
		last.stamp = stamp
		map.zoom(x, y, dz)
	}
	/** @param {import('./map').LocMap} map */
	function applyInertiaIfNeed(map) {
		// let sumDX = 0
		// let sumDY = 0
		// let count = 0
		// // ignoring last movement(s), it(they) may be slower than expected inertia motion
		// for (let i = lastMoves.length - 2; i >= 0; i--) {
		// 	const move = lastMoves[i]
		// 	if (performance.now() - move.stamp > 100) break
		// 	sumDX += move.dx
		// 	sumDY += move.dy
		// 	count += 1
		// }
		// if (count > 0) map.applyMoveInertia(sumDX / count, sumDY / count)

		// ignoring last movement(s), it(they) may be slower than expected inertia motion
		const move = lastMoves[0]
		if (performance.now() - move.stamp < 150) map.applyMoveInertia(move.dx, move.dy)

		const zoom = lastZooms[0]
		if (performance.now() - zoom.stamp < 150) map.applyZoomInertia(zoom.x, zoom.y, zoom.dz)
	}

	/** @param {import('./map').LocMap} map */
	const makeControl = map =>
		controlDouble({
			callbacks: {
				singleDown(e, id, x, y, isSwitching) {
					const isMouse = id === 'mouse'
					mouseIsDown = isMouse
					mouseX = x
					mouseY = y
					if (!isSwitching) {
						map.applyMoveInertia(0, 0)
						map.applyZoomInertia(0, 0, 1)
					}
					map.emit('singleDown', { x, y, isMouse, isSwitching })
					return true
				},
				singleMove(e, id, x, y) {
					const isMouse = id === 'mouse'
					if (doNotInterfere && !isMouse && Date.now() > delayFingersHintUntil) {
						map.emit('controlHint', /**@type {HintData}*/ ({ type: 'use_two_fingers' }))
					} else {
						if (mouseIsDown || !isMouse) applyMovement(map, x, y, e.timeStamp)
						mouseX = x
						mouseY = y
						map.emit('singleMove', { x, y, isMouse: isMouse, isDown: mouseIsDown })
					}
					return mouseIsDown || !isMouse
				},
				singleUp(e, id, isSwitching) {
					const isMouse = id === 'mouse'
					const wasDown = mouseIsDown
					mouseIsDown = false
					if ((wasDown || !isMouse) && !isSwitching) applyInertiaIfNeed(map)
					map.emit('singleUp', { x: mouseX, y: mouseY, isMouse, wasDown, isSwitching })
					return wasDown || !isMouse
				},
				doubleDown(e, id0, x0, y0, id1, x1, y1, isSwitching) {
					mouseX = (x0 + x1) * 0.5
					mouseY = (y0 + y1) * 0.5
					touchDist = point_distance(x0, y0, x1, y1)
					map.emit('doubleDown', {})
					return true
				},
				doubleMove(e, id0, x0, y0, id1, x1, y1) {
					const cx = (x0 + x1) * 0.5
					const cy = (y0 + y1) * 0.5
					const cd = point_distance(x0, y0, x1, y1)
					applyMovement(map, cx, cy, e.timeStamp)
					applyZoom(map, cx, cy, cd / touchDist, e.timeStamp)
					mouseX = cx
					mouseY = cy
					touchDist = cd
					map.emit('doubleMove', {})
					return true
				},
				doubleUp(e, id0, id1, isSwitching) {
					mouseX = mouseY = NaN
					delayFingersHintUntil = Date.now() + 1000
					map.emit('doubleUp', {})
					return true
				},
				wheelRot(e, deltaX, deltaY, deltaZ, x, y) {
					if (!doNotInterfere || e.ctrlKey) {
						map.zoomSmooth(x, y, Math.pow(2, -deltaY / 250))
						return true
					} else {
						map.emit('controlHint', /**@type {HintData}*/ ({ type: 'use_control_to_zoom' }))
						return false
					}
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

	this.onEvent = {
		mapMove: hideHint,
		mapZoom: hideHint,
		/**
		 * @param {import('./map').LocMap} map
		 * @param {HintData} e
		 */
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
