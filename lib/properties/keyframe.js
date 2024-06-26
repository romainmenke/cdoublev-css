
const properties = require('./names.js')

const exclude = [
    '-webkit-animation',
    '-webkit-animation-delay',
    '-webkit-animation-direction',
    '-webkit-animation-duration',
    '-webkit-animation-fill-mode',
    '-webkit-animation-iteration-count',
    '-webkit-animation-name',
    '-webkit-animation-play-state',
    'animation',
    'animation-delay',
    'animation-direction',
    'animation-duration',
    'animation-fill-mode',
    'animation-iteration-count',
    'animation-name',
    'animation-play-state',
    'animation-timeline',
]

const keyframeProperties = properties.filter(property => !exclude.includes(property))

module.exports = keyframeProperties
