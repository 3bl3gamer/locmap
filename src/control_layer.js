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
 * @param {import('./map').LocMap} map
 * @param {{requireModKey?:boolean}} [opts]
 */
export function ControlLayer(map, opts) {
	const { requireModKey } = opts || {}
	let mouse_x = NaN
	let mouse_y = NaN
	let mouse_down = false
	let touch_dist
	let delay_fingers_hint_until = 0

	const control = controlDouble({
		callbacks: {
			singleDown(e, id, x, y, isSwitching) {
				const isMouse = id === 'mouse'
				mouse_down = isMouse
				mouse_x = x
				mouse_y = y
				map.emit('SingleDown', { x, y, isMouse, isSwitching })
				return mouse_down
			},
			singleMove(e, id, x, y) {
				const isMouse = id === 'mouse'
				if (requireModKey && !isMouse && Date.now() > delay_fingers_hint_until)
					map.emit('ControlHint', /**@type {HintData}*/ ({ type: 'use_two_fingers' }))
				if (mouse_down) map.move(x - mouse_x, y - mouse_y)
				mouse_x = x
				mouse_y = y
				map.emit('SingleMove', { x: x, y: y, isMouse: isMouse, isDown: mouse_down })
				return mouse_down
			},
			singleUp(e, isMouse, is_switching) {
				const was_down = mouse_down
				mouse_down = false
				if (was_down)
					map.emit('SingleUp', {
						x: mouse_x,
						y: mouse_y,
						isMouse: isMouse,
						wasDown: was_down,
						isSwitching: is_switching,
					})
				return was_down
			},
			doubleDown(e, x0, y0, x1, y1) {
				mouse_x = (x0 + x1) * 0.5
				mouse_y = (y0 + y1) * 0.5
				touch_dist = point_distance(x0, y0, x1, y1)
				map.emit('DoubleDown', {})
				return true
			},
			doubleMove(e, x0, y0, x1, y1) {
				const cx = (x0 + x1) * 0.5
				const cy = (y0 + y1) * 0.5
				const cd = point_distance(x0, y0, x1, y1)
				map.doZoom(cx, cy, cd / touch_dist)
				map.move(cx - mouse_x, cy - mouse_y)
				mouse_x = cx
				mouse_y = cy
				touch_dist = cd
				return true
			},
			doubleUp(e) {
				mouse_x = mouse_y = NaN
				delay_fingers_hint_until = Date.now() + 1000
				return true
			},
			wheelRot(e, deltaX, deltaY, deltaZ, x, y) {
				if (!requireModKey || e.ctrlKey) {
					map.doSmoothZoom(x, y, Math.pow(2, -deltaY / 250))
					return true
				} else {
					map.emit('ControlHint', /**@type {HintData}*/ ({ type: 'use_control_to_zoom' }))
					return false
				}
			},
		},
		startElem: map.getWrap(),
	})

	/** @param {import('./map').LocMap} map */
	this.onregister = function (map) {
		control.on()
	}

	/** @param {import('./map').LocMap} map */
	this.onunregister = function (map) {
		control.off()
	}

	/** @param {import('./map').LocMap} map */
	this.update = function (map) {}
	/** @param {import('./map').LocMap} map */
	this.redraw = function (map) {}
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

	let timeout = /** @type {number|null} */ (null)
	function showHint(text) {
		if (timeout !== null) clearTimeout(timeout)
		elem.textContent = text
		elem.style.opacity = '1'
		timeout = window.setTimeout(hideHint, 1000)
	}
	function hideHint() {
		if (timeout !== null) clearTimeout(timeout)
		elem.style.opacity = '0'
	}

	/** @param {import('./map').LocMap} map */
	this.onregister = map => {
		map.getWrap().appendChild(elem)
	}
	/** @param {import('./map').LocMap} map */
	this.onunregister = map => {
		map.getWrap().removeChild(elem)
	}
	/** @param {import('./map').LocMap} map */
	this.update = function (map) {}
	/** @param {import('./map').LocMap} map */
	this.redraw = function (map) {}

	/**
	 * @param {import('./map').LocMap} map
	 * @param {HintData} e
	 */
	this.onControlHint = function (map, e) {
		switch (e.type) {
			case 'use_control_to_zoom':
				showHint(controlText)
				break
			case 'use_two_fingers':
				showHint(twoFingersText)
				break
		}
	}

	this.onMapMove = hideHint
	this.onMapZoom = hideHint
}
