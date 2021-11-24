Simple modular canvas-based tile map engine.

5.6 KiB after min+gizp, [more](#size).

[Example](https://3bl3gamer.github.io/locmap/examples/)

## Usage

```js
import {
    LocMap, ControlLayer, ControlHintLayer, LocationLayer, URLLayer,
    TileContainer, TileLayer, ProjectionMercator, oneOf, appendCredit,
} from 'locmap'

const map = new LocMap(document.body, ProjectionMercator)
const tileContainer = new TileContainer(256, (x, y, z) =>
    `http://${oneOf('a', 'b', 'c')}.tile.openstreetmap.org/${z}/${x}/${y}.png`)
map.register(new TileLayer(tileContainer))
map.register(new ControlLayer())
appendCredit(document.body,
    '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors')
window.onresize = map.resize
```

## Size

```
        bundled minfied min+gz
base      22.9     6.6    2.9  KiB
regular   43.9    13.4    5.6  KiB
full      49.3    16.0    6.5  KiB
```