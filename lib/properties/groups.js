
/**
 * Ideally this should be defined in property definition tables.
 *
 * https://github.com/w3c/csswg-drafts/issues/9453
 */
const groupsByProperty = {
    'align-self': ['self-alignment'],
    'block-size': ['sizing'],
    'bottom': ['inset'],
    'height': ['sizing'],
    'inline-size': ['sizing'],
    'inset': ['inset'],
    'inset-block': ['inset'],
    'inset-block-end': ['inset'],
    'inset-block-start': ['inset'],
    'inset-inline': ['inset'],
    'inset-inline-end': ['inset'],
    'inset-inline-start': ['inset'],
    'justify-self': ['self-alignment'],
    'left': ['inset'],
    'margin': ['margin'],
    'margin-block': ['margin'],
    'margin-block-end': ['margin'],
    'margin-block-start': ['margin'],
    'margin-bottom': ['margin'],
    'margin-inline': ['margin'],
    'margin-inline-end': ['margin'],
    'margin-inline-start': ['margin'],
    'margin-left': ['margin'],
    'margin-right': ['margin'],
    'margin-top': ['margin'],
    'max-block-size': ['sizing'],
    'max-height': ['sizing'],
    'max-inline-size': ['sizing'],
    'max-width': ['sizing'],
    'min-block-size': ['sizing'],
    'min-height': ['sizing'],
    'min-inline-size': ['sizing'],
    'min-width': ['sizing'],
    'place-self': ['self-alignment'],
    'right': ['inset'],
    'top': ['inset'],
    'width': ['sizing'],
}

module.exports = { groupsByProperty }
