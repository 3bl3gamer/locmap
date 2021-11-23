import {
	LocMap,
	ControlLayer,
	ControlHintLayer,
	TileContainer,
	TileLayer,
	ProjectionMercator,
	LocationLayer,
	URLLayer,
	oneOf,
	appendCredit,
	controlHintKeyName,
} from '../../src'

document.documentElement.style.height = '100%'
document.body.style.margin = '0'

const mapWrap = document.createElement('div')
mapWrap.style.position = 'relative'
mapWrap.style.left = '0'
mapWrap.style.top = '0'
mapWrap.style.width = '100%'
mapWrap.style.height = '100vh'
document.body.appendChild(mapWrap)

const footer = document.createElement('div')
footer.style.position = 'relative'
footer.style.left = '0'
footer.style.top = '0'
footer.style.height = '50vh'
footer.style.display = 'flex'
footer.style.alignItems = 'center'
footer.style.justifyContent = 'center'
footer.style.backgroundColor = 'lightgray'
footer.style.fontSize = '32px'
footer.textContent = 'More content'
document.body.appendChild(footer)

const map = new LocMap(mapWrap, ProjectionMercator)
const tileContainer = new TileContainer(
	256,
	(x, y, z) => `https://${oneOf('a', 'b', 'c')}.tile.openstreetmap.org/${z}/${x}/${y}.png`,
)
map.register(new TileLayer(tileContainer))
let controlLayer = new ControlLayer()
map.register(controlLayer)
map.register(new ControlHintLayer(`hold ${controlHintKeyName()} to zoom`, 'use two fingers to drag'))
map.register(new LocationLayer())
map.register(new URLLayer())
map.resize()
const credit = '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
appendCredit(map.getWrap(), credit)
map.getWrap().focus()
window.onresize = map.resize

const uiWrap = document.createElement('div')
uiWrap.style.position = 'absolute'
uiWrap.style.top = '0'
uiWrap.style.right = '0'
uiWrap.style.padding = '5px'
uiWrap.style.backgroundColor = 'rgba(255,255,255,0.8)'
uiWrap.innerHTML = `
<label>
	<input class="ctrl-checkbox" type="checkbox"/>
	do not interfere with regular page interaction<br>
	<span style="color:gray">(require ${controlHintKeyName()} for wheel-zoom and two fingers for touch-drag)</span>
</label>`
mapWrap.appendChild(uiWrap)

const $ = selector => uiWrap.querySelector(selector)
$('.ctrl-checkbox').onchange = function () {
	map.unregister(controlLayer)
	controlLayer = new ControlLayer({ doNotInterfere: this.checked })
	map.register(controlLayer)
}

window.addEventListener('error', e => {
	if (e.message === 'Script error.' && e.filename === '') return
	alert(`${e.message} in ${e.filename}:${e.lineno}:${e.colno}`)
})
