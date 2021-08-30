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

	/** @param {import('./map').LocMap} map */
	const makeControl = map =>
		controlDouble({
			callbacks: {
				singleDown(e, id, x, y, isSwitching) {
					const isMouse = id === 'mouse'
					mouseIsDown = isMouse
					mouseX = x
					mouseY = y
					map.emit('singleDown', { x, y, isMouse, isSwitching })
					return mouseIsDown
				},
				singleMove(e, id, x, y) {
					const isMouse = id === 'mouse'
					if (doNotInterfere && !isMouse && Date.now() > delayFingersHintUntil)
						map.emit('controlHint', /**@type {HintData}*/ ({ type: 'use_two_fingers' }))
					if (mouseIsDown) map.move(x - mouseX, y - mouseY)
					mouseX = x
					mouseY = y
					map.emit('singleMove', { x: x, y: y, isMouse: isMouse, isDown: mouseIsDown })
					return mouseIsDown
				},
				singleUp(e, isMouse, is_switching) {
					const was_down = mouseIsDown
					mouseIsDown = false
					if (was_down)
						map.emit('singleUp', {
							x: mouseX,
							y: mouseY,
							isMouse: isMouse,
							wasDown: was_down,
							isSwitching: is_switching,
						})
					return was_down
				},
				doubleDown(e, x0, y0, x1, y1) {
					mouseX = (x0 + x1) * 0.5
					mouseY = (y0 + y1) * 0.5
					touchDist = point_distance(x0, y0, x1, y1)
					map.emit('doubleDown', {})
					return true
				},
				doubleMove(e, x0, y0, x1, y1) {
					const cx = (x0 + x1) * 0.5
					const cy = (y0 + y1) * 0.5
					const cd = point_distance(x0, y0, x1, y1)
					map.doZoom(cx, cy, cd / touchDist)
					map.move(cx - mouseX, cy - mouseY)
					mouseX = cx
					mouseY = cy
					touchDist = cd
					return true
				},
				doubleUp(e) {
					mouseX = mouseY = NaN
					delayFingersHintUntil = Date.now() + 1000
					return true
				},
				wheelRot(e, deltaX, deltaY, deltaZ, x, y) {
					if (!doNotInterfere || e.ctrlKey) {
						map.doSmoothZoom(x, y, Math.pow(2, -deltaY / 250))
						return true
					} else {
						map.emit('controlHint', /**@type {HintData}*/ ({ type: 'use_control_to_zoom' }))
						return false
					}
				},
			},
			startElem: map.getWrap(),
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
