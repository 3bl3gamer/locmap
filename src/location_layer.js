/**
 * @param {CanvasRenderingContext2D} rc
 * @param {number} w0
 * @param {string} c0
 * @param {number} w1
 * @param {string} c1
 */
function strokeOutlined(rc, w0, c0, w1, c1) {
	rc.lineWidth = w0
	rc.strokeStyle = c0
	rc.stroke()
	rc.lineWidth = w1
	rc.strokeStyle = c1
	rc.stroke()
}

/** @class */
export function LocationLayer() {
	let lastLocation = /** @type {GeolocationCoordinates|null} */ (null)
	let watchID = /** @type {number|null} */ (null)

	/** @param {import('./map').LocMap} map */
	this.register = map => {
		watchID = navigator.geolocation.watchPosition(geoPos => {
			lastLocation = geoPos.coords
			map.requestRedraw()
		})
	}

	/** @param {import('./map').LocMap} map */
	this.unregister = map => {
		if (watchID !== null) navigator.geolocation.clearWatch(watchID)
		watchID = null
	}

	/** @param {import('./map').LocMap} map */
	this.redraw = map => {
		if (!lastLocation) return
		const rc = map.get2dContext()
		if (rc === null) return

		const x = -map.getTopLeftXShift() + map.lon2x(lastLocation.longitude)
		const y = -map.getTopLeftYShift() + map.lat2y(lastLocation.latitude)

		const lineW = 4
		const r = Math.max(lineW / 2, lastLocation.accuracy * map.meters2pixCoef(lastLocation.latitude))

		rc.save()

		rc.beginPath()
		rc.arc(x, y, r, 0, 3.1415927 * 2, false)
		rc.fillStyle = `rgba(230,200,120,0.3)`
		rc.fill()
		strokeOutlined(rc, lineW, 'white', lineW / 2, 'black')

		const size = Math.min(map.getWidth(), map.getHeight())
		const crossSize = size / 50
		const innerCrossThresh = size / 4
		const outerCrossThresh = size / 100
		if (r > innerCrossThresh) {
			rc.beginPath()
			rc.moveTo(x - crossSize, y)
			rc.lineTo(x + crossSize, y)
			rc.moveTo(x, y - crossSize)
			rc.lineTo(x, y + crossSize)
			rc.lineCap = 'round'
			rc.globalAlpha = Math.min(1, ((r - innerCrossThresh) / innerCrossThresh) * 2)
			strokeOutlined(rc, lineW, 'white', lineW / 2, 'black')
		}
		if (r < outerCrossThresh) {
			rc.beginPath()
			for (const side of [-1, 1]) {
				const d0 = (r * 1.2 + lineW + size / 50) * side
				const d1 = (r * 1.2 + lineW) * side
				rc.moveTo(x + d0, y)
				rc.lineTo(x + d1, y)
				rc.moveTo(x, y + d0)
				rc.lineTo(x, y + d1)
			}
			rc.lineCap = 'round'
			rc.globalAlpha = Math.min(1, ((outerCrossThresh - r) / outerCrossThresh) * 2)
			strokeOutlined(rc, 4, 'white', 2, 'black')
		}

		rc.restore()
	}
}
