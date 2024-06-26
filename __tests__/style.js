
const {
    cssom: {
        CSSFontFaceDescriptors,
        CSSKeyframeProperties,
        CSSMarginDescriptors,
        CSSPageDescriptors,
        CSSPositionTryDescriptors,
        CSSStyleProperties,
        CSSStyleSheet,
    },
    install,
} = require('../lib/index.js')
// Do not import CSSOM implementations before the above import
const { UPDATE_COMPUTED_STYLE_DECLARATION_ERROR } = require('../lib/cssom/CSSStyleDeclaration-impl.js')
const compatibility = require('../lib/compatibility.js')
const { cssPropertyToIDLAttribute } = require('../lib/utils/string.js')
const display = require('../lib/values/display.js')
const properties = require('../lib/properties/definitions.js')
const propertyNames = require('../lib/properties/names.js')
const shorthands = require('../lib/properties/shorthands.js')
const substitutions = require('../lib/values/substitutions.js')
const whiteSpace = require('../lib/values/white-space.js')

/**
 * @param {object} [privateData]
 * @returns {CSSStyleDeclaration}
 */
function createStyleBlock(privateData = {}) {
    return CSSStyleProperties.create(globalThis, undefined, privateData)
}

// Helper to get initial property value (with better readability)
function initial(property) {
    return properties[property].initial.serialized
}

install()

const rules = `
    @font-face {}
    @keyframes myAnimation { 0% {} }
    @page { @top-left {} }
    @position-try --custom {}
`
const styleSheet = CSSStyleSheet.createImpl(globalThis, undefined, { rules })
const { _rules: [fontFaceRule, keyframesRule, pageRule, positionTryRule] } = styleSheet
const { _rules: [keyframeRule] } = keyframesRule
const { _rules: [marginRule] } = pageRule

describe('CSSStyleDeclaration', () => {
    it('has all properties and methods', () => {

        const style = createStyleBlock()
        const prototype = Object.getPrototypeOf(style)

        // Camel/kebab/pascal cased attributes
        propertyNames.forEach(property => {

            const prefixed = property.startsWith('-webkit-')
            const attribute = cssPropertyToIDLAttribute(property, prefixed)

            // Kebab case
            expect(Object.getOwnPropertyDescriptor(prototype, property).get).toBeDefined()
            expect(Object.getOwnPropertyDescriptor(prototype, property).set).toBeDefined()
            // Camel case
            expect(Object.getOwnPropertyDescriptor(prototype, attribute).get).toBeDefined()
            expect(Object.getOwnPropertyDescriptor(prototype, attribute).set).toBeDefined()
            // Pascal case (only `-webkit` prefixed legacy name aliases and property mappings)
            if (prefixed) {
                const attribute = cssPropertyToIDLAttribute(property)
                expect(Object.getOwnPropertyDescriptor(prototype, attribute).get).toBeDefined()
                expect(Object.getOwnPropertyDescriptor(prototype, attribute).set).toBeDefined()
            }
        })

        // Camel and kebab case attributes mirroring
        style.borderTopColor = 'red'
        expect(style.borderTopColor).toBe('red')
        expect(style['border-top-color']).toBe('red')
        style['border-top-color'] = 'green'
        expect(style.borderTopColor).toBe('green')
        expect(style['border-top-color']).toBe('green')

        // Custom property
        style['--custom'] = 'blue'
        expect(style.getPropertyValue('--custom')).toBe('')
        style.setProperty('--custom', 'red')
        expect(style.getPropertyValue('--Custom')).toBe('')
        expect(style.getPropertyValue('--custom')).toBe('red')
        style.cssText = '--custom: green'
        expect(style.getPropertyValue('--custom')).toBe('green')
        style.removeProperty('--custom')
        expect(style.getPropertyValue('--custom')).toBe('')

        // Longhand property alias
        style.order = '1'
        expect(style.order).toBe('1')
        expect(style['-webkit-order']).toBe('1')
        expect(style.webkitOrder).toBe('1')
        expect(style.WebkitOrder).toBe('1')
        style.webkitOrder = '2'
        expect(style.order).toBe('2')
        expect(style['-webkit-order']).toBe('2')
        expect(style.webkitOrder).toBe('2')
        expect(style.WebkitOrder).toBe('2')
        style.WebkitOrder = '3'
        expect(style.order).toBe('3')
        expect(style['-webkit-order']).toBe('3')
        expect(style.webkitOrder).toBe('3')
        expect(style.WebkitOrder).toBe('3')

        // Shorthand property alias
        style.gap = 'normal'
        expect(style.gap).toBe('normal')
        expect(style.gridGap).toBe('normal')
        style.gridGap = '1px'
        expect(style.gap).toBe('1px')
        expect(style.gridGap).toBe('1px')

        // Mapped longhand property
        style['-webkit-box-align'] = 'start'
        expect(style['-webkit-box-align']).toBe('start')
        expect(style.webkitBoxAlign).toBe('start')
        expect(style.WebkitBoxAlign).toBe('start')
        expect(style['align-items']).toBe('')
        style.webkitBoxAlign = 'center'
        expect(style['-webkit-box-align']).toBe('center')
        expect(style.webkitBoxAlign).toBe('center')
        expect(style.WebkitBoxAlign).toBe('center')
        expect(style['align-items']).toBe('')
        style.WebkitBoxAlign = 'end'
        expect(style['-webkit-box-align']).toBe('end')
        expect(style.webkitBoxAlign).toBe('end')
        expect(style.WebkitBoxAlign).toBe('end')
        expect(style['align-items']).toBe('')

        // Property indices map to the corresponding declaration name
        expect(style[0]).toBe('order')
        expect(style.item(0)).toBe('order')
        expect(style[1]).toBe('row-gap')
        expect(style.item(1)).toBe('row-gap')
        expect(style[2]).toBe('column-gap')
        expect(style.item(2)).toBe('column-gap')
        expect(style[3]).toBe('-webkit-box-align')
        expect(style.item(3)).toBe('-webkit-box-align')
        expect(style[4]).toBeUndefined()
        expect(style.item(4)).toBe('')
        expect(style).toHaveLength(4)

        // Create/read/update/delete declaration value(s)
        style.borderTopColor = ''
        expect(style.getPropertyValue('border-top-color')).toBe('')
        expect(style).toHaveLength(4)
        expect(style[0]).toBe('order')
        expect(style.item(0)).toBe('order')
        style.setProperty('order', '')
        expect(style).toHaveLength(3)
        expect(style[0]).toBe('row-gap')
        expect(style.item(0)).toBe('row-gap')
        style.cssText = ''
        expect(style.cssText).toBe('')
        expect(style).toHaveLength(0)
        expect(style[0]).toBeUndefined()
        style.cssText = 'font-size: 16px; font-size: 20px !important; font-size: 24px'
        expect(style.cssText).toBe('font-size: 20px !important;')
        expect(style.fontSize).toBe('20px')
        style.setProperty('font-size', '10px', 'important')
        expect(style.fontSize).toBe('10px')
        expect(style.getPropertyValue('font-size')).toBe('10px')
        expect(style.getPropertyPriority('font-size')).toBe('important')
        expect(style.cssText).toBe('font-size: 10px !important;')
        style.setProperty('font-size', '10px')
        expect(style.getPropertyPriority('font-size')).toBe('')
        expect(style.cssText).toBe('font-size: 10px;')
        style.removeProperty('font-size')
        expect(style.fontSize).toBe('')
        expect(style.cssText).toBe('')
    })
    it('constructs a new instance with a reference to a parent CSS rule', () => {
        const parentRule = {}
        const style = createStyleBlock({ parentRule })
        expect(style.parentRule).toBe(parentRule)
    })
    it('constructs a new instance with declarations resulting from parsing `Element.style`', () => {
        const element = {
            getAttribute() {
                return 'color: green !important; color: orange;'
            },
        }
        const style = createStyleBlock({ ownerNode: element })
        expect(style.color).toBe('green')
    })
    it('does not throw when failing to parse `cssText`', () => {
        const style = createStyleBlock()
        style.color = 'black'
        expect(style.cssText).toBe('color: black;')
        style.cssText = 'color: '
        expect(style.cssText).toBe('')
    })
    it('ignores a rule in `cssText`', () => {
        const style = createStyleBlock()
        style.cssText = 'color: green; @page { color: red }; .selector { color: red }; font-size: 12px'
        expect(style.cssText).toBe('color: green; font-size: 12px;')
    })
    it('stores declarations in the order specified in `cssText`', () => {
        const style = createStyleBlock()
        style.cssText = 'color: orange; width: 1px; color: green'
        expect(style.cssText).toBe('width: 1px; color: green;')
        style.cssText = 'color: green !important; width: 1px; color: orange'
        expect(style.cssText).toBe('color: green !important; width: 1px;')
    })
    it('does not store a declaration for an invalid property specified with `setProperty()`', () => {
        const style = createStyleBlock()
        style.setProperty(' font-size', '1px')
        expect(style.fontSize).toBe('')
        style.setProperty('font-size', '1px !important')
        expect(style.fontSize).toBe('')
        style.setProperty('fontSize', '1px')
        expect(style.fontSize).toBe('')
    })
    it('does not store a declaration value specified with a priority with `setProperty()`', () => {
        const style = createStyleBlock()
        style.setProperty('font-size', '1px !important')
        expect(style.fontSize).toBe('')
    })
    it('normalizes a declaration property to lowercase with `setProperty()`', () => {
        const style = createStyleBlock()
        style.setProperty('FoNt-SiZe', '12px')
        expect(style.fontSize).toBe('12px')
        expect(style.getPropertyValue('font-size')).toBe('12px')
    })
    it('throws an error when declaring a value that cannot be converted to string', () => {
        const style = createStyleBlock()
        expect(() => (style.opacity = Symbol('0')))
            .toThrow("Failed to set the 'opacity' property on 'CSSStyleProperties': The provided value is a symbol, which cannot be converted to a string.")
        expect(() => (style.opacity = { toString: () => [0] }))
            .toThrow('Cannot convert object to primitive value')
    })
    it('declares a non-string value that can be converted to string', () => {

        const style = createStyleBlock()

        style.opacity = { toString: () => '0' }
        expect(style.opacity).toBe('0')

        style.opacity = { toString: () => 1 }
        expect(style.opacity).toBe('1')

        style.opacity = BigInt(0)
        expect(style.opacity).toBe('0')
        style.opacity = { toString: () => BigInt(1) }
        expect(style.opacity).toBe('1')

        style.setProperty('--custom', [0])
        expect(style.getPropertyValue('--custom')).toBe('0')

        style.setProperty('--custom', null)
        expect(style.getPropertyValue('--custom')).toBe('')
        style.setProperty('--custom', { toString: () => null })
        expect(style.getPropertyValue('--custom')).toBe('null')

        style.setProperty('--custom', undefined)
        expect(style.getPropertyValue('--custom')).toBe('undefined')
        style.setProperty('--custom', null)
        style.setProperty('--custom', { toString: () => undefined })
        expect(style.getPropertyValue('--custom')).toBe('undefined')

        style.setProperty('--custom', false)
        expect(style.getPropertyValue('--custom')).toBe('false')
        style.setProperty('--custom', { toString: () => true })
        expect(style.getPropertyValue('--custom')).toBe('true')
    })
    it('updates a declaration not preceded by a declaration for a property of the same logical property group', () => {

        const style = createStyleBlock()

        style.borderTopColor = 'orange'
        style.width = '1px'

        style.borderTopColor = 'orange'
        expect(style.cssText).toBe('border-top-color: orange; width: 1px;')

        style.borderTopColor = 'green'
        expect(style.cssText).toBe('border-top-color: green; width: 1px;')

        style.setProperty('border-top-color', 'green', 'important')
        expect(style.cssText).toBe('border-top-color: green !important; width: 1px;')
    })
    it('removes then append a declaration followed by a declaration for a property of the same logical property group and with a different mapping', () => {

        const style = createStyleBlock()

        style.borderTopColor = 'green'
        style.borderBlockStartColor = 'orange'

        style.borderTopColor = 'green'
        expect(style.cssText).toBe('border-block-start-color: orange; border-top-color: green;')

        style.borderBlockStartColor = 'green'
        expect(style.cssText).toBe('border-top-color: green; border-block-start-color: green;')
    })
})

describe('CSSFontFaceDescriptors', () => {
    it('does not store an invalid declaration', () => {

        const style = CSSFontFaceDescriptors.create(globalThis, undefined, { parentRule: fontFaceRule })

        // Invalid name
        style.setProperty('font-size-adjust', 'none')
        expect(style.getPropertyValue('font-size-adjust')).toBe('')
        expect(style.fontSizeAdjust).toBeUndefined()

        // Priority
        style.setProperty('font-weight', '400', 'important')
        expect(style.fontWeight).toBe('')

        // CSS-wide keyword
        style.fontWeight = 'initial'
        expect(style.fontWeight).toBe('')

        // Custom variable
        style.fontWeight = 'var(--custom)'
        expect(style.fontWeight).toBe('')
    })
    it('stores a valid declaration', () => {

        const style = CSSFontFaceDescriptors.create(globalThis, undefined, { parentRule: fontFaceRule })

        // Standalone descriptor
        style.fontDisplay = 'auto'
        expect(style.fontDisplay).toBe('auto')

        // Descriptor bearing the same name as a property
        style.fontWeight = '100 200'
        expect(style.fontWeight).toBe('100 200')

        // Specific serialization rules
        style.ascentOverride = '1% 1%'
        expect(style.ascentOverride).toBe('1%')
        style.descentOverride = '1% 1%'
        expect(style.descentOverride).toBe('1%')
        style.fontSize = '1 1'
        expect(style.fontSize).toBe('1')
        style.fontWidth = 'normal normal'
        expect(style.fontWidth).toBe('normal')
        style.fontStyle = 'oblique 14deg'
        expect(style.fontStyle).toBe('oblique')
        style.fontStyle = 'oblique 1deg 1deg'
        expect(style.fontStyle).toBe('oblique 1deg')
        style.fontWeight = 'normal normal'
        expect(style.fontWeight).toBe('normal')
        style.lineGapOverride = '1% 1%'
        expect(style.lineGapOverride).toBe('1%')
        style.subscriptPositionOverride = '1% 1%'
        expect(style.subscriptPositionOverride).toBe('1%')
        style.subscriptSizeOverride = '1% 1%'
        expect(style.subscriptSizeOverride).toBe('1%')
        style.subscriptPositionOverride = '1% 1%'
        expect(style.subscriptPositionOverride).toBe('1%')

        // Descriptor alias
        expect(style.fontStretch).toBe(style.fontWidth)
        style.fontStretch = 'condensed'
        expect(style.fontStretch).toBe('condensed')
        expect(style.fontWidth).toBe('condensed')
    })
})
describe('CSSKeyframeProperties', () => {
    it('does not store an invalid declaration', () => {

        const style = CSSKeyframeProperties.create(globalThis, undefined, { parentRule: keyframeRule })

        // Invalid name
        style.setProperty('animation-delay', '1s')
        expect(style.getPropertyValue('animation-delay')).toBe('')
        expect(style.animationDelay).toBeUndefined()

        // Priority
        style.setProperty('color', 'red', 'important')
        expect(style.color).toBe('')
    })
    it('stores a valid declaration', () => {

        const style = CSSKeyframeProperties.create(globalThis, undefined, { parentRule: keyframeRule })

        // Specific property value
        style.color = 'green'
        expect(style.color).toBe('green')

        // CSS-wide keyword
        style.color = 'initial'
        expect(style.color).toBe('initial')

        // Custom variable
        style.color = 'var(--red)'
        expect(style.color).toBe('var(--red)')
    })
})
describe('CSSMarginDescriptors', () => {
    it('does not store an invalid declaration', () => {

        const style = CSSMarginDescriptors.create(globalThis, undefined, { parentRule: marginRule })

        // Invalid name
        style.setProperty('top', '1px')
        expect(style.getPropertyValue('top')).toBe('')
        expect(style.top).toBeUndefined()
    })
    it('stores a valid declaration', () => {

        const style = CSSMarginDescriptors.create(globalThis, undefined, { parentRule: marginRule })

        // Descriptor bearing the same name and value definition as a property
        style.color = 'green'
        expect(style.color).toBe('green')

        // Priority
        style.setProperty('color', 'orange', 'important')
        expect(style.color).toBe('orange')
        expect(style.getPropertyPriority('color')).toBe('important')

        // CSS-wide keyword
        style.color = 'initial'
        expect(style.color).toBe('initial')

        // Custom variable
        style.color = 'var(--red)'
        expect(style.color).toBe('var(--red)')
    })
})
describe('CSSPageDescriptors', () => {
    it('does not store an invalid declaration', () => {

        const style = CSSPageDescriptors.create(globalThis, undefined, { parentRule: pageRule })

        // Invalid name
        style.setProperty('top', '1px')
        expect(style.getPropertyValue('top')).toBe('')
        expect(style.top).toBeUndefined()

        // CSS-wide keyword
        style.size = 'initial'
        expect(style.size).toBe('')

        // Custom variable
        style.size = 'var(--custom)'
        expect(style.size).toBe('')
    })
    it('stores a valid declaration', () => {

        const style = CSSPageDescriptors.create(globalThis, undefined, { parentRule: pageRule })

        // Standalone descriptor
        style.setProperty('size', '1px')
        expect(style.size).toBe('1px')

        // Descriptor bearing the same name and value definition as a property
        style.color = 'green'
        expect(style.color).toBe('green')

        // Priority
        style.setProperty('size', '1px', 'important')
        expect(style.size).toBe('1px')
        expect(style.getPropertyPriority('size')).toBe('important')

        // CSS-wide keyword
        style.color = 'initial'
        expect(style.color).toBe('initial')

        // Custom variable
        style.color = 'var(--red)'
        expect(style.color).toBe('var(--red)')

        // Specific serialization rules
        style.size = '1px 1px'
        expect(style.size).toBe('1px')
    })
})
describe('CSSPositionTryDescriptors', () => {
    it('does not store an invalid declaration', () => {

        const style = CSSPositionTryDescriptors.create(globalThis, undefined, { parentRule: positionTryRule })

        // Invalid name
        style.setProperty('color', 'red')
        expect(style.getPropertyValue('color')).toBe('')
        expect(style.color).toBeUndefined()

        // Priority
        style.setProperty('top', '1px', 'important')
        expect(style.top).toBe('')
    })
    it('stores a valid declaration', () => {

        const style = CSSPositionTryDescriptors.create(globalThis, undefined, { parentRule: positionTryRule })

        // Specific property value
        style.top = '1px'
        expect(style.top).toBe('1px')

        // CSS-wide keyword
        style.top = 'initial'
        expect(style.top).toBe('initial')

        // Custom variable
        style.top = 'var(--custom)'
        expect(style.top).toBe('var(--custom)')
    })
})

describe('CSS-wide keyword', () => {
    it('parses and serializes a valid value', () => {
        const style = createStyleBlock()
        substitutions.property.keywords.forEach(input => {
            style.opacity = input.toUpperCase()
            expect(style.opacity).toBe(input)
        })
    })
})
describe('arbitrary substitution', () => {
    it('fails to parse an invalid value', () => {
        const style = createStyleBlock()
        style.setProperty('--custom', 'src(var(--))')
        expect(style.getPropertyValue('--custom')).toBe('')
    })
    it('parses and serializes a valid value', () => {
        const style = createStyleBlock()
        const valid = [
            // <attr()>
            ['attr(title', 'attr(title)'],
            ['attr(title, attr(alt))'],
            ['fn(attr(title))'],
            ['  /**/  attr(  title, /**/ "title"  )  ', 'attr(title, "title")'],
            ['attr(title string, "")', 'attr(title)'],
            ['attr(quantity number, "")'],
            // <env()>
            ['env(ab-test-color', 'env(ab-test-color)'],
            ['env(ab-test-color, env(ab-test-2))'],
            ['fn(env(ab-test-color))'],
            ['  /**/  env(  ab-test-color/*, 1 */, 0, 1e0  )  ', 'env(ab-test-color, 0, 1)'],
            // <random-item()>
            ['random-item(--key; 1; 2', 'random-item(--key; 1; 2)'],
            ['random-item(--key; 1; random-item(--key; 2; 3))'],
            ['fn(random-item(per-element; 1; 2))'],
            ['  /**/  random-item(  --key/*; 1 */; 0; 1e0  )  ', 'random-item(--key; 0; 1)'],
            // <var()>
            ['var(--custom', 'var(--custom)'],
            ['var(--custom, var(--fallback))'],
            ['fn(var(--custom))'],
            ['  /**/  var(  --PROPerty, /**/ 1e0 /**/)  ', 'var(--PROPerty, 1)'],
            ['var(--custom,)', 'var(--custom,)'],
            ['var(--custom, )', 'var(--custom,)'],
        ]
        valid.forEach(([input, expected = input]) => {
            style.opacity = input
            expect(style.opacity).toBe(expected)
        })
    })
})
describe('<whole-value>', () => {
    it('fails to parse an invalid value', () => {
        const style = createStyleBlock()
        const invalid = [
            // Not the <whole-value>
            ['first-valid(0) 1', '--custom'],
            ['mix(50%; 0; 1) 2', '--custom'],
            ['mix(50%; 0; first-valid(1) 2)', '--custom'],
            ['toggle(0; 1) 2', '--custom'],
            ['toggle(0; first-valid(1) 2)', '--custom'],
            // Invalid value for the property
            ['mix(50%; red; invalid)', 'color'],
            ['toggle(red; invalid)', 'color'],
            // Non-animatable property
            ['mix(50%; 1s; 2s)', 'animation-duration'],
            // Nested <toggle()>
            ['toggle(mix(50%; toggle(0; 1); 2); 3)', '--custom'],
        ]
        invalid.forEach(([substitution, property]) => {
            style.setProperty(property, substitution)
            expect(style.getPropertyValue(property)).toBe('')
        })
    })
    it('parses and serializes a valid value', () => {
        const style = createStyleBlock()
        const valid = [
            ['  /**/  first-valid(  0; /**/ 1e0 /**/)  ', 'first-valid(0; 1)'],
            ['  /**/  mix(  50%; 0; /**/ 1e0 /**/)  ', 'mix(50%; 0; 1)'],
            ['  /**/  toggle(0; /**/ 1e0 /**/)  ', 'toggle(0; 1)'],
            ['first-valid(0; first-valid(1; 2))'],
            ['mix(50%; 0; mix(50%; 1; 2))'],
            // Invalid only at computed value time
            ['first-valid(invalid)'],
            // Omitted value
            ['toggle(;)', 'toggle(;)', '--custom'],
        ]
        valid.forEach(([input, expected = input, property = 'opacity']) => {
            style.setProperty(property, input)
            expect(style.getPropertyValue(property)).toBe(expected)
        })
    })
})

describe('--*', () => {
    it('parses and serializes a valid value', () => {
        const style = createStyleBlock()
        const valid = [
            // Whitespaces and comments
            ['  /**/  Red  ,  (  orange  /**/  )  ,  green  /**/  ', 'Red  ,  (  orange  /**/  )  ,  green'],
            // Guaranteed-invalid value (initial)
            ['  /**/  ', ''],
            [''],
            // Substitutions
            ['initial'],
            ['mix(50;/**/; 1e0 )  ', 'mix(50;/**/; 1e0 )'],
            ['var(  --PROPerty, /**/ 1e0 /**/  )  ', 'var(  --PROPerty, /**/ 1e0 /**/  )'],
        ]
        valid.forEach(([input, expected = input]) => {
            style.cssText = `--custom: ${input}`
            expect(style.getPropertyValue('--custom')).toBe(expected)
            expect(style.cssText).toBe(`--custom: ${expected};`)
        })
    })
})
describe('animation-range-start, animation-range-end', () => {
    it('parses and serializes a valid value', () => {
        const style = createStyleBlock()
        style.animationRangeStart = 'entry 0%'
        expect(style.animationRangeStart).toBe('entry')
    })
})
describe('background-position', () => {
    it('parses and serializes a valid value', () => {
        const style = createStyleBlock()
        const valid = [
            ['left', 'left center'],
            ['top', 'center top'],
            ['center', 'center center'],
            ['0px', '0px center'],
        ]
        valid.forEach(([input, expected = input]) => {
            style.backgroundPosition = input
            expect(style.backgroundPosition).toBe(expected)
            expect(style.cssText).toBe(`background-position: ${expected};`)
        })
    })
})
describe('background-size', () => {
    it('parses and serializes a valid value', () => {
        const style = createStyleBlock()
        style.backgroundSize = '100% auto'
        expect(style.backgroundSize).toBe('100%')
    })
})
describe('border-end-end-radius, border-end-start-radius, border-bottom-left-radius, border-bottom-right-radius, border-start-end-radius, border-start-start-radius, border-top-left-radius, border-top-right-radius', () => {
    it('parses and serializes a valid value', () => {
        const style = createStyleBlock()
        style.borderBottomLeftRadius = '1px 1px'
        expect(style.borderBottomLeftRadius).toBe('1px')
        style.borderBottomLeftRadius = '1px 2px'
        expect(style.borderBottomLeftRadius).toBe('1px 2px')
    })
})
describe('border-image-outset, mask-border-outset', () => {
    it('parses and serializes a valid value', () => {
        const style = createStyleBlock()
        const valid = [
            ['0 1 2 2'],
            ['0 1 2 1', '0 1 2'],
            ['0 1 0', '0 1'],
            ['0 0', '0'],
        ]
        valid.forEach(([input, expected = input]) => {
            style.borderImageOutset = input
            expect(style.borderImageOutset).toBe(expected)
        })
    })
})
describe('border-image-repeat, mask-border-repeat', () => {
    it('parses and serializes a valid value', () => {
        const style = createStyleBlock()
        style.borderImageRepeat = 'stretch stretch'
        expect(style.borderImageRepeat).toBe('stretch')
    })
})
describe('border-image-slice, mask-border-slice', () => {
    it('parses and serializes a valid value', () => {
        const style = createStyleBlock()
        const valid = [
            ['0 1 2 2 fill'],
            ['0 1 2 1', '0 1 2'],
            ['0 1 0 fill', '0 1 fill'],
            ['0 0', '0'],
        ]
        valid.forEach(([input, expected = input]) => {
            style.borderImageSlice = input
            expect(style.borderImageSlice).toBe(expected)
        })
    })
})
describe('border-image-width, mask-border-width', () => {
    it('parses and serializes a valid value', () => {
        const style = createStyleBlock()
        const valid = [
            ['0 1 2 2'],
            ['0 1 2 1', '0 1 2'],
            ['0 1 0', '0 1'],
            ['0 0', '0'],
        ]
        valid.forEach(([input, expected = input]) => {
            style.borderImageWidth = input
            expect(style.borderImageWidth).toBe(expected)
        })
    })
})
describe('border-spacing', () => {
    it('parses and serializes a valid value', () => {
        const style = createStyleBlock()
        style.borderSpacing = '1px 1px'
        expect(style.borderSpacing).toBe('1px')
    })
})
describe('break-after, break-before, page-break-after, page-break-before', () => {
    it('fails to parse an invalid value', () => {

        const style = createStyleBlock()

        // Unmapped target value
        style.pageBreakAfter = 'recto'
        expect(style.breakAfter).toBe('')
        expect(style.pageBreakAfter).toBe('')
        expect(style.cssText).toBe('')
    })
    it('parses and serializes a valid value', () => {

        const style = createStyleBlock()

        // Unmapped value
        style.breakAfter = 'recto'
        expect(style.breakAfter).toBe('recto')
        expect(style.pageBreakAfter).toBe('')
        expect(style.cssText).toBe('break-after: recto;')

        // Legacy mapped value
        style.breakAfter = 'page'
        expect(style.breakAfter).toBe('page')
        expect(style.pageBreakAfter).toBe('always')
        expect(style.cssText).toBe('break-after: page;')
        style.cssText = ''
        style.pageBreakAfter = 'always'
        expect(style.breakAfter).toBe('page')
        expect(style.pageBreakAfter).toBe('always')
        expect(style.cssText).toBe('break-after: page;')

        // Substitution-value
        style.breakAfter = 'var(--custom)'
        expect(style.breakAfter).toBe('var(--custom)')
        expect(style.pageBreakAfter).toBe('var(--custom)')
        expect(style.cssText).toBe('break-after: var(--custom);')
        style.cssText = ''
        style.pageBreakAfter = 'var(--custom)'
        expect(style.breakAfter).toBe('var(--custom)')
        expect(style.pageBreakAfter).toBe('var(--custom)')
        expect(style.cssText).toBe('break-after: var(--custom);')
    })
})
describe('break-inside, page-break-inside', () => {
    it('fails to parse an invalid value', () => {

        const style = createStyleBlock()

        // Unmapped target value
        style.pageBreakInside = 'avoid-page'
        expect(style.breakInside).toBe('')
        expect(style.pageBreakInside).toBe('')
        expect(style.cssText).toBe('')
    })
    it('parses and serializes a valid value', () => {

        const style = createStyleBlock()

        // Unmapped value
        style.breakInside = 'avoid-page'
        expect(style.breakInside).toBe('avoid-page')
        expect(style.pageBreakInside).toBe('')
        expect(style.cssText).toBe('break-inside: avoid-page;')

        // Substitution-value
        style.breakInside = 'var(--custom)'
        expect(style.breakInside).toBe('var(--custom)')
        expect(style.pageBreakInside).toBe('var(--custom)')
        expect(style.cssText).toBe('break-inside: var(--custom);')
        style.cssText = ''
        style.pageBreakInside = 'var(--custom)'
        expect(style.breakInside).toBe('var(--custom)')
        expect(style.pageBreakInside).toBe('var(--custom)')
        expect(style.cssText).toBe('break-inside: var(--custom);')
    })
})
describe('clip-path', () => {
    it('parses and serializes a valid value', () => {
        const style = createStyleBlock()
        style.clipPath = 'inset(1px) border-box'
        expect(style.clipPath).toBe('inset(1px)')
    })
})
describe('color-scheme', () => {
    it('fails to parse an invalid value', () => {
        const style = createStyleBlock()
        style.colorScheme = 'NORMAL only'
        expect(style.colorScheme).toBe('')
        style.colorScheme = 'only only'
        expect(style.colorScheme).toBe('')
    })
})
describe('counter-increment, counter-set', () => {
    it('parses and serializes a valid value', () => {
        const style = createStyleBlock()
        style.counterIncrement = 'counter 1'
        expect(style.counterIncrement).toBe('counter')
    })
})
describe('counter-reset', () => {
    it('parses and serializes a valid value', () => {
        const style = createStyleBlock()
        style.counterReset = 'counter 0'
        expect(style.counterReset).toBe('counter')
    })
})
describe('container-name', () => {
    it('fails to parse an invalid value', () => {
        const style = createStyleBlock()
        const invalid = [
            'AND',
            'or',
            'not',
            'name none',
        ]
        invalid.forEach(input => {
            style.containerName = input
            expect(style.containerName).toBe('')
        })
    })
    it('parses and serializes a valid value', () => {
        const style = createStyleBlock()
        style.containerName = 'none'
        expect(style.containerName).toBe('none')
    })
})
describe('cue-after, cue-before', () => {
    it('parses and serializes a valid value', () => {
        const style = createStyleBlock()
        style.cueAfter = 'url("icon.wav") 0db'
        expect(style.cueAfter).toBe('url("icon.wav")')
        // tmp
        style.cueAfter = 'url("icon.wav") 1db'
        expect(style.cueAfter).toBe('url("icon.wav") 1db')
    })
})
describe('display', () => {
    it('parses and serializes a valid value', () => {
        const style = createStyleBlock()
        // Alias value
        display.aliases.forEach((to, from) => {
            style.display = from
            expect(style.display).toBe(to)
        })
        // Legacy mapped value
        compatibility.values['display'].forEach(replacement =>
            replacement.mappings.forEach(mapping => {
                style.display = mapping
                expect(style.display).toBe(mapping)
            }))
    })
})
describe('float', () => {
    it('mirrors cssFloat', () => {
        const style = createStyleBlock()
        style.cssFloat = 'left'
        expect(style.float).toBe('left')
        expect(style.cssText).toBe('float: left;')
        style.setProperty('float', 'right')
        expect(style.cssFloat).toBe('right')
    })
})
describe('flow-into', () => {
    it('fails to parse an invalid value', () => {
        const style = createStyleBlock()
        style.flowInto = 'AUTO'
        expect(style.flowInto).toBe('')
        style.flowInto = 'none element'
        expect(style.flowInto).toBe('')
    })
})
describe('font-style', () => {
    it('parses and serializes a valid value', () => {
        const style = createStyleBlock()
        style.fontStyle = 'oblique 14deg'
        expect(style.fontStyle).toBe('oblique')
    })
})
describe('glyph-orientation-vertical, text-orientation', () => {
    it('fails to parse an invalid value', () => {

        const style = createStyleBlock()
        const invalid = [
            '1',
            '1deg',
            '0rad',
            'calc(0deg)',
        ]

        invalid.forEach(value => {
            style.glyphOrientationVertical = value
            expect(style.textOrientation).toBe('')
            expect(style.glyphOrientationVertical).toBe('')
        })
    })
    it('parses and serializes a valid value', () => {

        const style = createStyleBlock()

        // Legacy mapped value
        const mapping = [
            ['mixed', 'auto'],
            ['upright', '0', '0deg'],
            ['upright', '0deg'],
            ['sideways', '90', '90deg'],
            ['sideways', '90deg'],
        ]
        mapping.forEach(([value, legacy, mapped = legacy]) => {
            style.textOrientation = value
            expect(style.textOrientation).toBe(value)
            expect(style.glyphOrientationVertical).toBe(mapped)
            expect(style.cssText).toBe(`text-orientation: ${value};`)
            style.cssText = ''
            style.glyphOrientationVertical = legacy
            expect(style.textOrientation).toBe(value)
            expect(style.glyphOrientationVertical).toBe(mapped)
            expect(style.cssText).toBe(`text-orientation: ${value};`)
        })

        // Substitution-value
        style.textOrientation = 'var(--custom)'
        expect(style.textOrientation).toBe('var(--custom)')
        expect(style.glyphOrientationVertical).toBe('var(--custom)')
        expect(style.cssText).toBe('text-orientation: var(--custom);')
        style.glyphOrientationVertical = 'var(--custom)'
        expect(style.textOrientation).toBe('var(--custom)')
        expect(style.glyphOrientationVertical).toBe('var(--custom)')
        expect(style.cssText).toBe('text-orientation: var(--custom);')
    })
})
describe('grid-auto-flow', () => {
    it('parses and serializes a valid value', () => {
        const style = createStyleBlock()
        style.gridAutoFlow = 'row dense'
        expect(style.gridAutoFlow).toBe('dense')
    })
})
describe('grid-template-areas', () => {
    it('fails to parse an invalid value', () => {
        const style = createStyleBlock()
        const invalid = [
            // Trash token
            '"a !"',
            // Empty row
            '" "',
            // Non-equal column length
            '".  " ". ."',
            '". ." ".  "',
            // Non-rectangular area
            '"a . a"',
            '"a b a"',
            '"a" "." "a"',
            '"a" "b" "a"',
            '"a ." "a a"',
            '"a ." ". a"',
            '"a a" "a ."',
            '". a" "a a"',
            '". a" "a ."',
        ]
        invalid.forEach(input => {
            style.gridTemplateAreas = input
            expect(style.gridTemplateAreas).toBe('')
        })
    })
    it('parses and serializes a valid value', () => {
        const style = createStyleBlock()
        style.gridTemplateAreas = '"  a  .b.  c  " "a . . . c'
        expect(style.gridTemplateAreas).toBe('"a . b . c" "a . . . c"')
    })
})
describe('grid-template-columns, grid-template-rows', () => {
    it('parses and serializes a valid value', () => {
        const style = createStyleBlock()
        const valid = [
            // Empty line names are omitted except for subgrid axis (browser conformance)
            ['subgrid [] repeat(1, [] [a] [])'],
            ['[] 1px [] repeat(1, [] 1px []) [] repeat(1, [] 1fr [])', '1px repeat(1, 1px) repeat(1, 1fr)'],
            ['[] repeat(auto-fill, [] 1px []) []', 'repeat(auto-fill, 1px)'],
        ]
        valid.forEach(([input, expected = input]) => {
            style.gridTemplateRows = input
            expect(style.gridTemplateRows).toBe(expected)
        })
    })
})
describe('hyphenate-limit-chars', () => {
    it('parses and serializes a valid value', () => {
        const style = createStyleBlock()
        style.hyphenateLimitChars = '0 1 1'
        expect(style.hyphenateLimitChars).toBe('0 1')
        style.hyphenateLimitChars = '0 auto auto'
        expect(style.hyphenateLimitChars).toBe('0')
    })
})
describe('image-rendering', () => {
    it('parses and serializes a valid value', () => {
        const style = createStyleBlock()
        // Legacy mapped value
        style.imageRendering = 'optimizeSpeed'
        expect(style.imageRendering).toBe('optimizespeed')
        style.imageRendering = 'optimizeQuality'
        expect(style.imageRendering).toBe('optimizequality')
    })
})
describe('image-resolution', () => {
    it('parses and serializss a valid value', () => {
        const style = createStyleBlock()
        style.imageResolution = 'from-image 1dppx'
        expect(style.imageResolution).toBe('from-image')
    })
})
describe('initial-letter', () => {
    it('parses and serializes a valid value', () => {
        const style = createStyleBlock()
        style.initialLetter = '1 drop'
        expect(style.initialLetter).toBe('1')
    })
})
describe('masonry-auto-flow', () => {
    it('parses and serializes a valid value', () => {
        const style = createStyleBlock()
        const valid = [
            ['pack definite-first', 'pack'],
            ['pack ordered', 'ordered'],
            ['next definite-first', 'next'],
        ]
        valid.forEach(([input, expected = input]) => {
            style.masonryAutoFlow = input
            expect(style.masonryAutoFlow).toBe(expected)
        })
    })
})
describe('object-fit', () => {
    it('parses and serializes a valid value', () => {
        const style = createStyleBlock()
        style.objectFit = 'contain scale-down'
        expect(style.objectFit).toBe('scale-down')
    })
})
describe('offset-path', () => {
    it('parses and serializes a valid value', () => {
        const style = createStyleBlock()
        style.offsetPath = 'url("path.svg") border-box'
        expect(style.offsetPath).toBe('url("path.svg")')
        style.offsetPath = 'path(evenodd, "M0 0")'
        expect(style.offsetPath).toBe('path("M0 0")')
    })
})
describe('offset-rotate', () => {
    it('parses and serializes a valid value', () => {
        const style = createStyleBlock()
        const valid = [
            ['auto 0deg', 'auto'],
            ['auto 180deg', 'reverse'],
            ['auto -180deg', 'reverse'],
            ['reverse 0deg', 'reverse'],
            ['reverse 180deg', 'auto'],
            ['reverse -180deg', 'auto'],
        ]
        valid.forEach(([input, expected]) => {
            style.offsetRotate = input
            expect(style.offsetRotate).toBe(expected)
        })
    })
})
describe('overflow-clip-margin-block-end, overflow-clip-margin-block-start, overflow-clip-margin-bottom, overflow-clip-margin-inline-end, overflow-clip-margin-inline-starty, overflow-clip-margin-left, overflow-clip-margin-right, overflow-clip-margin-top', () => {
    it('parses and serializes a valid value', () => {
        const style = createStyleBlock()
        style.overflowClipMarginBlockEnd = 'content-box 0px'
        expect(style.overflowClipMarginBlockEnd).toBe('content-box')
    })
})
describe('paint-order', () => {
    it('parses and serializes a valid value', () => {
        const style = createStyleBlock()
        const valid = [
            ['fill', 'normal'],
            ['fill stroke', 'normal'],
            ['fill stroke markers', 'normal'],
            ['fill markers stroke', 'fill markers'],
            ['stroke fill', 'stroke'],
            ['stroke fill markers', 'stroke'],
            ['markers fill', 'markers'],
            ['markers fill stroke', 'markers'],
        ]
        valid.forEach(([input, expected]) => {
            style.paintOrder = input
            expect(style.paintOrder).toBe(expected)
        })
    })
})
describe('scale', () => {
    it('parses and serializes a valid value', () => {
        const style = createStyleBlock()
        style.scale = '100% 100% 1'
        expect(style.scale).toBe('100%')
    })
})
describe('scroll-snap-align', () => {
    it('parses and serializes a valid value', () => {
        const style = createStyleBlock()
        style.scrollSnapAlign = 'none none'
        expect(style.scrollSnapAlign).toBe('none')
    })
})
describe('scroll-snap-type', () => {
    it('parses and serializes a valid value', () => {
        const style = createStyleBlock()
        style.scrollSnapType = 'x proximity'
        expect(style.scrollSnapType).toBe('x')
    })
})
describe('shape-outside', () => {
    it('parses and serializes a valid value', () => {
        const style = createStyleBlock()
        style.shapeOutside = 'inset(1px) margin-box'
        expect(style.shapeOutside).toBe('inset(1px)')
    })
})
describe('text-emphasis-position', () => {
    it('parses and serializes a valid value', () => {
        const style = createStyleBlock()
        style.textEmphasisPosition = 'over right'
        expect(style.textEmphasisPosition).toBe('over')
    })
})
describe('text-align-all', () => {
    it('fails to parse an invalid value', () => {
        const style = createStyleBlock()
        style.textAlignAll = '"12"'
        expect(style.textAlignAll).toBe('')
    })
})
describe('text-justify', () => {
    it('parses and serializes a valid value', () => {
        const style = createStyleBlock()
        // Legacy value alias
        style.textJustify = 'distribute'
        expect(style.textJustify).toBe('inter-character')
    })
})
describe('translate', () => {
    it('parses and serializes a valid value', () => {
        const style = createStyleBlock()
        style.translate = '0px 0px 0px'
        expect(style.translate).toBe('0px')
    })
})
describe('view-transition-name', () => {
    it('fails to parse an invalid value', () => {
        const style = createStyleBlock()
        style.viewTransitionName = 'AUTO'
        expect(style.viewTransitionName).toBe('')
    })
})
describe('voice-pitch, voice-range', () => {
    it('parses and serializes a valid value', () => {
        const style = createStyleBlock()
        style.voicePitch = 'x-low 100%'
        expect(style.voicePitch).toBe('x-low')
        // tmp
        style.voicePitch = '100%'
        expect(style.voicePitch).toBe('100%')
    })
})
describe('voice-rate', () => {
    it('parses and serializes a valid value', () => {
        const style = createStyleBlock()
        style.voiceRate = 'normal 100%'
        expect(style.voiceRate).toBe('normal')
        style.voiceRate = '100%'
        expect(style.voiceRate).toBe('100%')
    })
})

describe('-webkit-line-clamp', () => {

    const longhands = shorthands.get('-webkit-line-clamp')

    it('parses longhand declarations from a shorthand value', () => {

        const style = createStyleBlock()

        // Initial longhand values (not all longhands can be explicitly declared)
        style.webkitLineClamp = 'none'
        expect(style).toHaveLength(longhands.length)
        expect(style.maxLines).toBe('none')
        expect(style.blockEllipsis).toBe('auto')
        expect(style.continue).toBe('auto')
        expect(style.webkitLineClamp).toBe('none')
        expect(style.cssText).toBe('-webkit-line-clamp: none;')

        // Missing longhand values
        style.webkitLineClamp = '1'
        expect(style.maxLines).toBe('1')
        expect(style.blockEllipsis).toBe('auto')
        expect(style.continue).toBe('-webkit-discard')
        expect(style.webkitLineClamp).toBe('1')
        expect(style.cssText).toBe('-webkit-line-clamp: 1;')
    })
    it('serializes a shorthand value from the declarations of its longhands', () => {

        const style = createStyleBlock()

        // Initial longhand values
        longhands.forEach(longhand => style[longhand] = initial(longhand))
        expect(style.webkitLineClamp).toBe('')
        expect(style.cssText).toBe('line-clamp: none;')

        // All longhands cannot always be represented
        style.blockEllipsis = 'auto'
        expect(style.webkitLineClamp).toBe('none')
        expect(style.cssText).toBe('-webkit-line-clamp: none;')
        style.continue = '-webkit-discard'
        expect(style.webkitLineClamp).toBe('')
        expect(style.cssText).toBe('max-lines: none; block-ellipsis: auto; continue: -webkit-discard;')
        style.maxLines = '1'
        expect(style.webkitLineClamp).toBe('1')
        expect(style.cssText).toBe('-webkit-line-clamp: 1;')
        style.blockEllipsis = 'auto'
        style.continue = initial('continue')
        expect(style.webkitLineClamp).toBe('')
        expect(style.cssText).toBe('max-lines: 1; block-ellipsis: auto; continue: auto;')
    })
})
describe('-webkit-text-stroke', () => {

    const longhands = shorthands.get('-webkit-text-stroke')

    it('parses longhand declarations from a shorthand value', () => {

        const style = createStyleBlock()

        // Initial longhand values
        style.webkitTextStroke = '0px currentColor'
        expect(style).toHaveLength(longhands.length)
        longhands.forEach(longhand => expect(style[longhand]).toBe(initial(longhand)))
        expect(style.webkitTextStroke).toBe('0px')
        expect(style.cssText).toBe('-webkit-text-stroke: 0px;')

        // Missing longhand values
        style.webkitTextStroke = '0px'
        longhands.forEach(longhand => expect(style[longhand]).toBe(initial(longhand)))
        expect(style.webkitTextStroke).toBe('0px')
        expect(style.cssText).toBe('-webkit-text-stroke: 0px;')
    })
    it('serializes a shorthand value from the declarations of its longhands', () => {

        const style = createStyleBlock()

        // Initial longhand values
        longhands.forEach(longhand => style[longhand] = initial(longhand))
        expect(style.webkitTextStroke).toBe('0px')
        expect(style.cssText).toBe('-webkit-text-stroke: 0px;')
    })
})
describe('all', () => {

    const longhands = shorthands.get('all')

    it('parses longhand declarations from a shorthand value', () => {

        const style = createStyleBlock()

        style.all = 'initial'
        expect(style).toHaveLength(longhands.length)
        expect(style[longhands[0]]).toBe('initial')
        expect(style.all).toBe('initial')
        expect(style.cssText).toBe('all: initial;')
        expect(style.direction).toBe('')
        expect(style.unicodeBidi).toBe('')
    })
    it('serializes a shorthand value from the declarations of its longhands', () => {

        const style = createStyleBlock()

        // All equal longhand values
        longhands.forEach(longhand => style[longhand] = 'initial')
        expect(style.all).toBe('initial')
        expect(style.cssText).toBe('all: initial;')

        // Not all equal longhand values
        const [head, ...tail] = longhands
        const excluded = ['all', 'border', 'text-wrap']
        const initial = tail.reduce(
            (properties, property) => {
                for (const [shorthand, longhands] of shorthands) {
                    if (longhands.length === 1 || excluded.includes(shorthand)) {
                        continue
                    }
                    if (longhands.includes(property)) {
                        properties.add(shorthand)
                        return properties
                    }
                }
                return properties.add(property)
            },
            new Set())
        style[head] = 'inherit'
        expect(style.all).toBe('')
        expect(style.cssText).toBe(`${head}: inherit; ${[...initial].map(name => `${name}: initial`).join('; ')};`)
    })
})
describe('animation', () => {

    const longhands = shorthands.get('animation')
    const animation = 'auto ease 0s 1 normal none running none auto'

    it('parses longhand declarations from a shorthand value', () => {

        const style = createStyleBlock()

        // Initial longhand values
        style.animation = animation
        expect(style).toHaveLength(longhands.length)
        longhands.forEach(longhand => expect(style[longhand]).toBe(initial(longhand)))
        expect(style.animation).toBe(animation)
        expect(style.cssText).toBe(`animation: ${animation};`)

        // Missing longhand values
        style.animation = 'auto'
        longhands.forEach(longhand => expect(style[longhand]).toBe(initial(longhand)))
        expect(style.animation).toBe(animation)
        expect(style.cssText).toBe(`animation: ${animation};`)

        // Repeated longhand values
        const repeated = `${animation}, ${animation}`
        style.animation = repeated
        longhands.forEach(longhand =>
            expect(style[longhand]).toBe(shorthands.resetOnly.animation.includes(longhand)
                ? initial(longhand)
                : `${initial(longhand)}, ${initial(longhand)}`))
        expect(style.animation).toBe(repeated)
        expect(style.cssText).toBe(`animation: ${repeated};`)
    })
    it('serializes a shorthand value from the declarations of its longhands', () => {

        const style = createStyleBlock()

        // Initial longhand values
        longhands.forEach(longhand => style[longhand] = initial(longhand))
        expect(style.animation).toBe(animation)
        expect(style.cssText).toBe(`animation: ${animation};`)

        // Different lengths of longhand values
        style.animationName = 'none, none'
        expect(style.animation).toBe('')
        expect(style.cssText).toBe('animation-duration: auto; animation-timing-function: ease; animation-delay: 0s; animation-iteration-count: 1; animation-direction: normal; animation-fill-mode: none; animation-play-state: running; animation-name: none, none; animation-timeline: auto; animation-range: normal;')
    })
})
describe('animation-range', () => {

    const longhands = shorthands.get('animation-range')

    it('parses longhand declarations from a shorthand value', () => {

        const style = createStyleBlock()

        // Initial longhand values
        style.animationRange = 'normal normal'
        expect(style).toHaveLength(longhands.length)
        longhands.forEach(longhand => expect(style[longhand]).toBe(initial(longhand)))
        expect(style.animationRange).toBe('normal')
        expect(style.cssText).toBe('animation-range: normal;')

        // Missing longhand values
        const values = [
            ['normal'],
            ['0%', '0%', 'normal'],
            ['entry'],
            ['entry 10%', 'entry 10%', 'entry'],
            ['10% entry', '10%', 'entry'],
        ]
        values.forEach(([shorthand, start = shorthand, end = shorthand]) => {
            style.animationRange = shorthand
            expect(style.animationRangeStart).toBe(start)
            expect(style.animationRangeEnd).toBe(end)
            expect(style.animationRange).toBe(shorthand)
            expect(style.cssText).toBe(`animation-range: ${shorthand};`)
        })

        // Repeated longhand values
        style.animationRange = 'normal, normal'
        longhands.forEach(longhand => expect(style[longhand]).toBe(`${initial(longhand)}, ${initial(longhand)}`))
        expect(style.animationRange).toBe('normal, normal')
        expect(style.cssText).toBe('animation-range: normal, normal;')
    })
    it('serializes a shorthand value from the declarations of its longhands', () => {

        const style = createStyleBlock()

        // Initial longhand values
        longhands.forEach(longhand => style[longhand] = initial(longhand))
        expect(style.animationRange).toBe('normal')
        expect(style.cssText).toBe('animation-range: normal;')

        // Different lengths of longhand values
        style.animationRangeStart = 'normal, normal'
        expect(style.animationRange).toBe('')
        expect(style.cssText).toBe('animation-range-start: normal, normal; animation-range-end: normal;')

        // Shared <timeline-range-name>
        style.animationRangeStart = 'entry'
        style.animationRangeEnd = 'entry'
        expect(style.animationRange).toBe('entry')
        expect(style.cssText).toBe('animation-range: entry;')

        // Ambiguous <length-percentage>
        style.animationRangeEnd = '100%'
        expect(style.animationRange).toBe('entry 0% 100%')
        expect(style.cssText).toBe(`animation-range: entry 0% 100%;`)
    })
})
describe('background', () => {

    const longhands = shorthands.get('background')

    it('parses longhand declarations from a shorthand value', () => {

        const style = createStyleBlock()
        const background = 'none 0% 0% / auto repeat scroll padding-box border-box transparent'

        // Initial longhand values
        style.background = background
        expect(style).toHaveLength(longhands.length)
        longhands.forEach(longhand => expect(style[longhand]).toBe(initial(longhand)))
        expect(style.background).toBe('none')
        expect(style.cssText).toBe('background: none;')

        // Empty string
        style.background = ''
        longhands.forEach(longhand => expect(style[longhand]).toBe(''))
        expect(style.background).toBe('')
        expect(style.cssText).toBe('')

        // Missing longhand values + important
        style.cssText = 'background: none !important'
        longhands.forEach(longhand => {
            expect(style[longhand]).toBe(initial(longhand))
            expect(style.getPropertyPriority(longhand)).toBe('important')
        })
        expect(style.background).toBe('none')
        expect(style.cssText).toBe('background: none !important;')
        expect(style.getPropertyPriority('background')).toBe('important')

        // CSS-wide keyword
        style.background = 'initial'
        longhands.forEach(longhand => expect(style[longhand]).toBe('initial'))
        expect(style.background).toBe('initial')
        expect(style.cssText).toBe('background: initial;')

        // Pending substitution value
        style.background = 'var(--custom)'
        longhands.forEach(longhand => expect(style[longhand]).toBe(''))
        expect(style.background).toBe('var(--custom)')
        expect(style.cssText).toBe('background: var(--custom);')
        style.background = 'first-valid(value)'
        longhands.forEach(longhand => expect(style[longhand]).toBe(''))
        expect(style.background).toBe('first-valid(value)')
        expect(style.cssText).toBe('background: first-valid(value);')

        // Repeated longhand values
        style.background = `${background.replace(' transparent', '')}, ${background}`
        longhands.forEach(longhand =>
            expect(style[longhand]).toBe(
                (longhand === 'background-color' || shorthands.resetOnly.background.includes(longhand))
                    ? initial(longhand)
                    : `${initial(longhand)}, ${initial(longhand)}`))
        expect(style.background).toBe('none, none')
        expect(style.cssText).toBe('background: none, none;')

        // Single <visual-box>
        style.background = 'content-box'
        longhands.forEach(longhand =>
            expect(style[longhand])
                .toBe((longhand === 'background-origin' || longhand === 'background-clip')
                    ? 'content-box'
                    : initial(longhand)))
        expect(style.background).toBe('content-box')
        expect(style.cssText).toBe('background: content-box;')

        // Same <visual-box>
        style.background = 'content-box content-box'
        longhands.forEach(longhand =>
            expect(style[longhand])
                .toBe((longhand === 'background-origin' || longhand === 'background-clip')
                    ? 'content-box'
                    : initial(longhand)))
        expect(style.background).toBe('content-box')
        expect(style.cssText).toBe('background: content-box;')
    })
    it('serializes a shorthand value from the declarations of its longhands', () => {

        const style = createStyleBlock()

        // Initial longhand values
        longhands.forEach(longhand => style[longhand] = initial(longhand))
        expect(style.background).toBe('none')
        expect(style.cssText).toBe('background: none;')

        // Different lengths of longhand values
        style.backgroundImage = 'none, none'
        expect(style.background).toBe('')
        expect(style.cssText).toBe('background-image: none, none; background-position: 0% 0%; background-size: auto; background-repeat: repeat; background-attachment: scroll; background-origin: padding-box; background-clip: border-box; background-color: transparent; background-blend-mode: normal;')

        // Missing longhand declaration
        style.backgroundImage = ''
        expect(style.background).toBe('')
        expect(style.cssText).toBe('background-position: 0% 0%; background-size: auto; background-repeat: repeat; background-attachment: scroll; background-origin: padding-box; background-clip: border-box; background-color: transparent; background-blend-mode: normal;')
        style.backgroundImage = initial('background-image')

        // Important
        longhands.forEach(longhand => style.setProperty(longhand, initial(longhand), 'important'))
        expect(style.background).toBe('none')
        expect(style.cssText).toBe('background: none !important;')
        style.backgroundImage = ''
        expect(style.background).toBe('')
        expect(style.cssText).toBe('background-position: 0% 0% !important; background-size: auto !important; background-repeat: repeat !important; background-attachment: scroll !important; background-origin: padding-box !important; background-clip: border-box !important; background-color: transparent !important; background-blend-mode: normal !important;')

        // CSS-wide keyword
        longhands.forEach(longhand => style[longhand] = 'initial')
        expect(style.background).toBe('initial')
        expect(style.cssText).toBe('background: initial;')
        style.backgroundImage = ''
        expect(style.background).toBe('')
        expect(style.cssText).toBe('background-position: initial; background-size: initial; background-repeat: initial; background-attachment: initial; background-origin: initial; background-clip: initial; background-color: initial; background-blend-mode: initial;')

        // Pending substitution value
        longhands.forEach(longhand => style[longhand] = 'var(--custom)')
        expect(style.background).toBe('')
        expect(style.cssText).toBe('background-position: var(--custom); background-size: var(--custom); background-repeat: var(--custom); background-attachment: var(--custom); background-origin: var(--custom); background-clip: var(--custom); background-color: var(--custom); background-blend-mode: var(--custom); background-image: var(--custom);')
        style.background = 'var(--custom)'
        style.backgroundImage = 'var(--custom)'
        expect(style.background).toBe('')
        expect(style.cssText).toBe('background-position: ; background-size: ; background-repeat: ; background-attachment: ; background-origin: ; background-clip: ; background-color: ; background-blend-mode: ; background-image: var(--custom);')
    })
})
describe('block-step', () => {

    const longhands = shorthands.get('block-step')

    it('parses longhand declarations from a shorthand value', () => {

        const style = createStyleBlock()

        // Initial longhand values
        style.blockStep = 'none margin auto up'
        expect(style).toHaveLength(longhands.length)
        longhands.forEach(longhand => expect(style[longhand]).toBe(initial(longhand)))
        expect(style.blockStep).toBe('none')
        expect(style.cssText).toBe('block-step: none;')

        // Missing longhand values
        style.blockStep = 'none'
        longhands.forEach(longhand => expect(style[longhand]).toBe(initial(longhand)))
        expect(style.blockStep).toBe('none')
        expect(style.cssText).toBe('block-step: none;')
    })
    it('serializes a shorthand value from the declarations of its longhands', () => {

        const style = createStyleBlock()

        // Initial longhand values
        longhands.forEach(longhand => style[longhand] = initial(longhand))
        expect(style.blockStep).toBe('none')
        expect(style.cssText).toBe('block-step: none;')
    })
})
describe('border', () => {

    const longhands = shorthands.get('border')

    it('parses longhand declarations from a shorthand value', () => {

        const style = createStyleBlock()

        // Initial longhand values
        style.border = 'medium none currentColor'
        expect(style).toHaveLength(longhands.length)
        longhands.forEach(longhand => expect(style[longhand]).toBe(initial(longhand)))
        expect(style.border).toBe('medium')
        expect(style.cssText).toBe('border: medium;')

        // Missing longhand values
        style.border = 'medium'
        longhands.forEach(longhand => expect(style[longhand]).toBe(initial(longhand)))
        expect(style.border).toBe('medium')
        expect(style.cssText).toBe('border: medium;')
    })
    it('serializes a shorthand value from the declarations of its longhands', () => {

        const style = createStyleBlock()

        // Initial longhand values
        longhands.forEach(longhand => style[longhand] = initial(longhand))
        expect(style.border).toBe('medium')
        expect(style.cssText).toBe('border: medium;')

        // Non-initial reset-only sub-property
        style.borderImageWidth = '1px'
        expect(style.border).toBe('')
        expect(style.cssText).toBe('border-width: medium; border-style: none; border-color: currentcolor; border-image: 100% / 1px;')

        // Interleaved logical property declaration
        style.cssText = 'border: 1px solid red; border-block-start-width: 2px; border-block-end-width: 2px; border-color: green'
        expect(style.border).toBe('1px solid green')
        expect(style.cssText).toBe('border: 1px solid green; border-block-width: 2px;')
        style.cssText = 'border: 1px solid red; border-block-start-color: orange; border-block-end-color: orange; border-color: green'
        expect(style.border).toBe('1px solid green')
        /* (Ideally) expect(style.cssText).toBe('border-block-color: orange; border: 1px solid green;') */
        expect(style.cssText).toBe('border-width: 1px; border-style: solid; border-image: none; border-block-color: orange; border-color: green;')
        style.cssText = 'border: 1px solid red; border-block-start-color: orange; border-block-start-width: 1px; border-color: green'
        expect(style.border).toBe('1px solid green')
        /* (Ideally) expect(style.cssText).toBe('border-block-start-color: orange; border: 1px solid green; border-block-start-width: 1px;') */
        expect(style.cssText).toBe('border-width: 1px; border-style: solid; border-image: none; border-block-start-color: orange; border-block-start-width: 1px; border-color: green;')
    })
})
describe('border-block, border-inline', () => {

    const longhands = shorthands.get('border-block')

    it('parses longhand declarations from a shorthand value', () => {

        const style = createStyleBlock()

        // Initial longhand values
        style.borderBlock = 'medium none currentColor'
        expect(style).toHaveLength(longhands.length)
        longhands.forEach(longhand => expect(style[longhand]).toBe(initial(longhand)))
        expect(style.borderBlock).toBe('medium')
        expect(style.cssText).toBe('border-block: medium;')

        // Missing longhand values
        style.borderBlock = 'medium'
        longhands.forEach(longhand => expect(style[longhand]).toBe(initial(longhand)))
        expect(style.borderBlock).toBe('medium')
        expect(style.cssText).toBe('border-block: medium;')
    })
    it('serializes a shorthand value from the declarations of its longhands', () => {

        const style = createStyleBlock()

        // Initial longhand values
        longhands.forEach(longhand => style[longhand] = initial(longhand))
        expect(style.borderBlock).toBe('medium')
        expect(style.cssText).toBe('border-block: medium;')

        // Interleaved logical property declaration
        style.cssText = 'border-block-width: 1px; border-top-width: 2px; border-block-style: solid; border-block-color: green'
        expect(style.borderBlock).toBe('1px solid green')
        expect(style.cssText).toBe('border-block: 1px solid green; border-top-width: 2px;')
        style.cssText = 'border-block-width: 1px; border-top-style: none; border-block-style: solid; border-block-color: green'
        expect(style.borderBlock).toBe('1px solid green')
        /* (Ideally) expect(style.cssText).toBe('border-top-style: none; border-block: 1px solid green;') */
        expect(style.cssText).toBe('border-block-width: 1px; border-top-style: none; border-block-style: solid; border-block-color: green;')
        style.cssText = 'border-block-width: 1px; border-top-width: 2px; border-top-style: none; border-block-style: solid; border-block-color: green'
        expect(style.borderBlock).toBe('1px solid green')
        /* (Ideally) expect(style.cssText).toBe('border-top-style: none; border-block: 1px solid green; border-top-width: 2px;') */
        expect(style.cssText).toBe('border-block-width: 1px; border-top-width: 2px; border-top-style: none; border-block-style: solid; border-block-color: green;')
    })
})
describe('border-block-color, border-inline-color', () => {

    const longhands = shorthands.get('border-block-color')

    it('parses longhand declarations from a shorthand value', () => {

        const style = createStyleBlock()

        // Initial longhand values
        style.borderBlockColor = 'currentColor currentColor'
        expect(style).toHaveLength(longhands.length)
        longhands.forEach(longhand => expect(style[longhand]).toBe(initial(longhand)))
        expect(style.borderBlockColor).toBe('currentcolor')
        expect(style.cssText).toBe('border-block-color: currentcolor;')

        // Missing longhand values
        style.borderBlockColor = 'green'
        longhands.forEach(longhand => expect(style[longhand]).toBe('green'))
        expect(style.borderBlockColor).toBe('green')
        expect(style.cssText).toBe('border-block-color: green;')
    })
    it('serializes a shorthand value from the declarations of its longhands', () => {

        const style = createStyleBlock()

        // Initial longhand values
        longhands.forEach(longhand => style[longhand] = initial(longhand))
        expect(style.borderBlockColor).toBe('currentcolor')
        expect(style.cssText).toBe('border-block-color: currentcolor;')
    })
})
describe('border-block-end-radius, border-block-start-radius, border-bottom-radius, border-inline-end-radius, border-inline-start-radius, border-left-radius, border-right-radius, border-top-radius', () => {

    const longhands = shorthands.get('border-block-end-radius')

    it('parses longhand declarations from a shorthand value', () => {

        const style = createStyleBlock()

        // Initial longhand values
        style.borderBlockEndRadius = '0 0 / 0 0'
        expect(style).toHaveLength(longhands.length)
        longhands.forEach(longhand => expect(style[longhand]).toBe(initial(longhand)))
        expect(style.borderBlockEndRadius).toBe('0px')
        expect(style.cssText).toBe('border-block-end-radius: 0px;')

        // Missing longhand values
        style.borderBlockEndRadius = '1px'
        longhands.forEach(longhand => expect(style[longhand]).toBe('1px'))
        expect(style.borderBlockEndRadius).toBe('1px')
        expect(style.cssText).toBe('border-block-end-radius: 1px;')
        style.borderBlockEndRadius = '1px / calc(1px)'
        longhands.forEach(longhand => expect(style[longhand]).toBe('1px calc(1px)'))
        expect(style.borderBlockEndRadius).toBe('1px / calc(1px)')
        expect(style.cssText).toBe('border-block-end-radius: 1px / calc(1px);')
        style.borderBlockEndRadius = '1px / 2px'
        longhands.forEach(longhand => expect(style[longhand]).toBe('1px 2px'))
        expect(style.borderBlockEndRadius).toBe('1px / 2px')
        expect(style.cssText).toBe('border-block-end-radius: 1px / 2px;')
        style.borderBlockEndRadius = '1px 2px / 1px'
        expect(style.borderEndStartRadius).toBe('1px')
        expect(style.borderEndEndRadius).toBe('2px 1px')
        expect(style.borderBlockEndRadius).toBe('1px 2px / 1px')
        expect(style.cssText).toBe('border-block-end-radius: 1px 2px / 1px;')
    })
    it('serializes a shorthand value from the declarations of its longhands', () => {

        const style = createStyleBlock()

        // Initial longhand values
        longhands.forEach(longhand => style[longhand] = initial(longhand))
        expect(style.borderBlockEndRadius).toBe('0px')
        expect(style.cssText).toBe('border-block-end-radius: 0px;')
    })
})
describe('border-block-style, border-inline-style', () => {

    const longhands = shorthands.get('border-block-style')

    it('parses longhand declarations from a shorthand value', () => {

        const style = createStyleBlock()

        // Initial longhand values
        style.borderBlockStyle = 'none none'
        expect(style).toHaveLength(longhands.length)
        longhands.forEach(longhand => expect(style[longhand]).toBe(initial(longhand)))
        expect(style.borderBlockStyle).toBe('none')
        expect(style.cssText).toBe('border-block-style: none;')

        // Missing longhand values
        style.borderBlockStyle = 'solid'
        longhands.forEach(longhand => expect(style[longhand]).toBe('solid'))
        expect(style.borderBlockStyle).toBe('solid')
        expect(style.cssText).toBe('border-block-style: solid;')
    })
    it('serializes a shorthand value from the declarations of its longhands', () => {

        const style = createStyleBlock()

        // Initial longhand values
        longhands.forEach(longhand => style[longhand] = initial(longhand))
        expect(style.borderBlockStyle).toBe('none')
        expect(style.cssText).toBe('border-block-style: none;')
    })
})
describe('border-block-width, border-inline-width', () => {

    const longhands = shorthands.get('border-block-width')

    it('parses longhand declarations from a shorthand value', () => {

        const style = createStyleBlock()

        // Initial longhand values
        style.borderBlockWidth = 'medium medium'
        expect(style).toHaveLength(longhands.length)
        longhands.forEach(longhand => expect(style[longhand]).toBe(initial(longhand)))
        expect(style.borderBlockWidth).toBe('medium')
        expect(style.cssText).toBe('border-block-width: medium;')

        // Missing longhand values
        style.borderBlockWidth = '1px'
        longhands.forEach(longhand => expect(style[longhand]).toBe('1px'))
        expect(style.borderBlockWidth).toBe('1px')
        expect(style.cssText).toBe('border-block-width: 1px;')
    })
    it('serializes a shorthand value from the declarations of its longhands', () => {

        const style = createStyleBlock()

        // Initial longhand values
        longhands.forEach(longhand => style[longhand] = initial(longhand))
        expect(style.borderBlockWidth).toBe('medium')
        expect(style.cssText).toBe('border-block-width: medium;')
    })
})
describe('border-bottom, border-left, border-right, border-top', () => {

    const longhands = shorthands.get('border-top')

    it('parses longhand declarations from a shorthand value', () => {

        const style = createStyleBlock()

        // Initial longhand values
        style.borderTop = 'medium none currentColor'
        expect(style).toHaveLength(longhands.length)
        longhands.forEach(longhand => expect(style[longhand]).toBe(initial(longhand)))
        expect(style.borderTop).toBe('medium')
        expect(style.cssText).toBe('border-top: medium;')

        // Missing longhand values
        style.borderTop = 'medium'
        longhands.forEach(longhand => expect(style[longhand]).toBe(initial(longhand)))
        expect(style.borderTop).toBe('medium')
        expect(style.cssText).toBe('border-top: medium;')
    })
    it('serializes a shorthand value from the declarations of its longhands', () => {

        const style = createStyleBlock()

        // Initial longhand values
        longhands.forEach(longhand => style[longhand] = initial(longhand))
        expect(style.borderTop).toBe('medium')
        expect(style.cssText).toBe('border-top: medium;')
    })
})
describe('border-clip', () => {

    const longhands = shorthands.get('border-clip')

    it('parses longhand declarations from a shorthand value', () => {

        const style = createStyleBlock()

        style.borderClip = 'normal'
        expect(style).toHaveLength(longhands.length)
        longhands.forEach(longhand => expect(style[longhand]).toBe(initial(longhand)))
        expect(style.borderClip).toBe('normal')
        expect(style.cssText).toBe('border-clip: normal;')
    })
    it('serializes a shorthand value from the declarations of its longhands', () => {

        const style = createStyleBlock()

        // All equal longhand values
        longhands.forEach(longhand => style[longhand] = initial(longhand))
        expect(style.borderClip).toBe('normal')
        expect(style.cssText).toBe('border-clip: normal;')

        // Not all equal longhand values
        style.borderClipTop = '1px'
        expect(style.borderClip).toBe('')
        expect(style.cssText).toBe('border-clip-top: 1px; border-clip-right: normal; border-clip-bottom: normal; border-clip-left: normal;')
    })
})
describe('border-color', () => {

    const longhands = shorthands.get('border-color')

    it('parses longhand declarations from a shorthand value', () => {

        const style = createStyleBlock()

        // Initial longhand values
        style.borderColor = 'currentColor currentColor currentColor currentColor'
        expect(style).toHaveLength(longhands.length)
        longhands.forEach(longhand => expect(style[longhand]).toBe(initial(longhand)))
        expect(style.borderColor).toBe('currentcolor')
        expect(style.cssText).toBe('border-color: currentcolor;')

        // Missing longhand values
        const values = ['red', 'orange', 'green']
        style.borderColor = 'red'
        longhands.forEach(longhand => expect(style[longhand]).toBe('red'))
        expect(style.borderColor).toBe('red')
        expect(style.cssText).toBe('border-color: red;')
        style.borderColor = 'red orange'
        longhands.forEach((longhand, i) => expect(style[longhand]).toBe(values[i % 2]))
        expect(style.borderColor).toBe('red orange')
        expect(style.cssText).toBe('border-color: red orange;')
        style.borderColor = 'red orange green'
        longhands.forEach((longhand, i) => expect(style[longhand]).toBe(values[i === 3 ? 1 : i]))
        expect(style.borderColor).toBe('red orange green')
        expect(style.cssText).toBe('border-color: red orange green;')
    })
    it('serializes a shorthand value from the declarations of its longhands', () => {

        const style = createStyleBlock()

        // Initial longhand values
        longhands.forEach(longhand => style[longhand] = initial(longhand))
        expect(style.borderColor).toBe('currentcolor')
        expect(style.cssText).toBe('border-color: currentcolor;')

        // Interleaved logical property declaration
        style.cssText = 'border-top-color: green; border-block-start-color: orange; border-right-color: green; border-bottom-color: green; border-left-color: green'
        expect(style.borderColor).toBe('green')
        expect(style.cssText).toBe('border-top-color: green; border-block-start-color: orange; border-right-color: green; border-bottom-color: green; border-left-color: green;')
        style.cssText = 'border-top-color: green; border-block-start-width: 1px; border-right-color: green; border-bottom-color: green; border-left-color: green'
        expect(style.borderColor).toBe('green')
        expect(style.cssText).toBe('border-color: green; border-block-start-width: 1px;')
    })
})
describe('border-image', () => {

    const longhands = shorthands.get('border-image')

    it('parses longhand declarations from a shorthand value', () => {

        const style = createStyleBlock()

        // Initial longhand values
        style.borderImage = 'none 100% / 1 / 0 stretch'
        expect(style).toHaveLength(longhands.length)
        longhands.forEach(longhand => expect(style[longhand]).toBe(initial(longhand)))
        expect(style.borderImage).toBe('none')
        expect(style.cssText).toBe('border-image: none;')

        // Missing longhand values
        style.borderImage = 'none'
        longhands.forEach(longhand => expect(style[longhand]).toBe(initial(longhand)))
        expect(style.borderImage).toBe('none')
        expect(style.cssText).toBe('border-image: none;')
    })
    it('serializes a shorthand value from the declarations of its longhands', () => {

        const style = createStyleBlock()

        // Initial longhand values
        longhands.forEach(longhand => style[longhand] = initial(longhand))
        expect(style.borderImage).toBe('none')
        expect(style.cssText).toBe('border-image: none;')
    })
})
describe('border-radius', () => {

    const longhands = shorthands.get('border-radius')

    it('parses longhand declarations from a shorthand value', () => {

        const style = createStyleBlock()

        // Initial longhand values
        style.borderRadius = '0 0 0 0 / 0 0 0 0'
        expect(style).toHaveLength(longhands.length)
        longhands.forEach(longhand => expect(style[longhand]).toBe(initial(longhand)))
        expect(style.borderRadius).toBe('0px')
        expect(style.cssText).toBe('border-radius: 0px;')

        // Missing longhand values
        style.borderRadius = '1px'
        longhands.forEach(longhand => expect(style[longhand]).toBe('1px'))
        expect(style.borderRadius).toBe('1px')
        expect(style.cssText).toBe('border-radius: 1px;')
        style.borderRadius = '1px / calc(1px)'
        longhands.forEach(longhand => expect(style[longhand]).toBe('1px calc(1px)'))
        expect(style.borderRadius).toBe('1px / calc(1px)')
        expect(style.cssText).toBe('border-radius: 1px / calc(1px);')
        style.borderRadius = '1px / 2px'
        longhands.forEach(longhand => expect(style[longhand]).toBe('1px 2px'))
        expect(style.borderRadius).toBe('1px / 2px')
        expect(style.cssText).toBe('border-radius: 1px / 2px;')
        style.borderRadius = '1px 2px 3px 4px / 1px 2px'
        expect(style.borderTopLeftRadius).toBe('1px')
        expect(style.borderTopRightRadius).toBe('2px')
        expect(style.borderBottomRightRadius).toBe('3px 1px')
        expect(style.borderBottomLeftRadius).toBe('4px 2px')
        expect(style.borderRadius).toBe('1px 2px 3px 4px / 1px 2px')
        expect(style.cssText).toBe('border-radius: 1px 2px 3px 4px / 1px 2px;')
    })
    it('serializes a shorthand value from the declarations of its longhands', () => {

        const style = createStyleBlock()

        // Initial longhand values
        longhands.forEach(longhand => style[longhand] = initial(longhand))
        expect(style.borderRadius).toBe('0px')
        expect(style.cssText).toBe('border-radius: 0px;')
    })
})
describe('border-style', () => {

    const longhands = shorthands.get('border-style')

    it('parses longhand declarations from a shorthand value', () => {

        const style = createStyleBlock()

        // Initial longhand values
        style.borderStyle = 'none none none none'
        expect(style).toHaveLength(longhands.length)
        longhands.forEach(longhand => expect(style[longhand]).toBe(initial(longhand)))
        expect(style.borderStyle).toBe('none')
        expect(style.cssText).toBe('border-style: none;')

        // Missing longhand values
        const values = ['dotted', 'dashed', 'solid']
        style.borderStyle = 'dotted'
        longhands.forEach(longhand => expect(style[longhand]).toBe('dotted'))
        expect(style.borderStyle).toBe('dotted')
        expect(style.cssText).toBe('border-style: dotted;')
        style.borderStyle = 'dotted dashed'
        longhands.forEach((longhand, i) => expect(style[longhand]).toBe(values[i % 2]))
        expect(style.borderStyle).toBe('dotted dashed')
        expect(style.cssText).toBe('border-style: dotted dashed;')
        style.borderStyle = 'dotted dashed solid'
        longhands.forEach((longhand, i) => expect(style[longhand]).toBe(values[i === 3 ? 1 : i]))
        expect(style.borderStyle).toBe('dotted dashed solid')
        expect(style.cssText).toBe('border-style: dotted dashed solid;')
    })
    it('serializes a shorthand value from the declarations of its longhands', () => {

        const style = createStyleBlock()

        // Initial longhand values
        longhands.forEach(longhand => style[longhand] = initial(longhand))
        expect(style.borderStyle).toBe('none')
        expect(style.cssText).toBe('border-style: none;')
    })
})
describe('border-width', () => {

    const longhands = shorthands.get('border-width')

    it('parses longhand declarations from a shorthand value', () => {

        const style = createStyleBlock()

        // Initial longhand values
        style.borderWidth = 'medium medium medium medium'
        expect(style).toHaveLength(longhands.length)
        longhands.forEach(longhand => expect(style[longhand]).toBe(initial(longhand)))
        expect(style.borderWidth).toBe('medium')
        expect(style.cssText).toBe('border-width: medium;')

        // Missing longhand values
        const values = ['0px', '1px', '2px']
        style.borderWidth = '0px'
        longhands.forEach(longhand => expect(style[longhand]).toBe('0px'))
        expect(style.borderWidth).toBe('0px')
        expect(style.cssText).toBe('border-width: 0px;')
        style.borderWidth = '0px 1px'
        longhands.forEach((longhand, i) => expect(style[longhand]).toBe(values[i % 2]))
        expect(style.borderWidth).toBe('0px 1px')
        expect(style.cssText).toBe('border-width: 0px 1px;')
        style.borderWidth = '0px 1px 2px'
        longhands.forEach((longhand, i) => expect(style[longhand]).toBe(values[i === 3 ? 1 : i]))
        expect(style.borderWidth).toBe('0px 1px 2px')
        expect(style.cssText).toBe('border-width: 0px 1px 2px;')
    })
    it('serializes a shorthand value from the declarations of its longhands', () => {

        const style = createStyleBlock()

        // Initial longhand values
        longhands.forEach(longhand => style[longhand] = initial(longhand))
        expect(style.borderWidth).toBe('medium')
        expect(style.cssText).toBe('border-width: medium;')
    })
})
describe('box-shadow', () => {

    const longhands = shorthands.get('box-shadow')
    const shadow = 'currentcolor none 0px 0px outset'

    it('parses longhand declarations from a shorthand value', () => {

        const style = createStyleBlock()

        // Initial longhand values
        style.boxShadow = 'currentColor none 0 0 outset'
        expect(style).toHaveLength(longhands.length)
        longhands.forEach(longhand => expect(style[longhand]).toBe(initial(longhand)))
        expect(style.boxShadow).toBe('currentcolor none')
        expect(style.cssText).toBe('box-shadow: currentcolor none;')

        // Missing longhand values
        style.boxShadow = 'none'
        expect(style).toHaveLength(longhands.length)
        longhands.forEach(longhand => expect(style[longhand])
            .toBe(longhand === 'box-shadow-color'
                ? 'transparent'
                : initial(longhand)))
        expect(style.boxShadow).toBe('none')
        expect(style.cssText).toBe('box-shadow: none;')
        style.boxShadow = '0px 0px'
        expect(style).toHaveLength(longhands.length)
        longhands.forEach(longhand => expect(style[longhand])
            .toBe(longhand === 'box-shadow-offset'
                ? '0px 0px'
                : initial(longhand)))
        expect(style.boxShadow).toBe('0px 0px')
        expect(style.cssText).toBe('box-shadow: 0px 0px;')

        // Repeated longhand values
        style.boxShadow = `${shadow}, ${shadow}`
        longhands.forEach(longhand => expect(style[longhand]).toBe(`${initial(longhand)}, ${initial(longhand)}`))
        expect(style.boxShadow).toBe('currentcolor none, currentcolor none')
        expect(style.cssText).toBe('box-shadow: currentcolor none, currentcolor none;')
    })
    it('serializes a shorthand value from the declarations of its longhands', () => {

        const style = createStyleBlock()

        // Initial longhand values
        longhands.forEach(longhand => style[longhand] = initial(longhand))
        expect(style.boxShadow).toBe('currentcolor none')
        expect(style.cssText).toBe('box-shadow: currentcolor none;')

        // Different lengths of longhand values
        style.boxShadowOffset = '0px 0px, 0px 0px'
        expect(style.boxShadow).toBe('')
        expect(style.cssText).toBe('box-shadow-color: currentcolor; box-shadow-offset: 0px 0px, 0px 0px; box-shadow-blur: 0px; box-shadow-spread: 0px; box-shadow-position: outset;')
    })
})
describe('caret', () => {

    const longhands = shorthands.get('caret')

    it('parses longhand declarations from a shorthand value', () => {

        const style = createStyleBlock()

        // Initial longhand values
        style.caret = 'auto auto auto'
        expect(style).toHaveLength(longhands.length)
        longhands.forEach(longhand => expect(style[longhand]).toBe(initial(longhand)))
        expect(style.caret).toBe('auto')
        expect(style.cssText).toBe('caret: auto;')

        // Missing longhand values
        style.caret = 'auto'
        longhands.forEach(longhand => expect(style[longhand]).toBe(initial(longhand)))
        expect(style.caret).toBe('auto')
        expect(style.cssText).toBe('caret: auto;')
    })
    it('serializes a shorthand value from the declarations of its longhands', () => {

        const style = createStyleBlock()

        // Initial longhand values
        longhands.forEach(longhand => style[longhand] = initial(longhand))
        expect(style.caret).toBe('auto')
        expect(style.cssText).toBe('caret: auto;')
    })
})
describe('column-rule', () => {

    const longhands = shorthands.get('column-rule')

    it('parses longhand declarations from a shorthand value', () => {

        const style = createStyleBlock()

        // Initial longhand values
        style.columnRule = 'medium none currentColor'
        expect(style).toHaveLength(longhands.length)
        longhands.forEach(longhand => expect(style[longhand]).toBe(initial(longhand)))
        expect(style.columnRule).toBe('medium')
        expect(style.cssText).toBe('column-rule: medium;')

        // Missing longhand values
        style.columnRule = 'medium'
        longhands.forEach(longhand => expect(style[longhand]).toBe(initial(longhand)))
        expect(style.columnRule).toBe('medium')
        expect(style.cssText).toBe('column-rule: medium;')
    })
    it('serializes a shorthand value from the declarations of its longhands', () => {

        const style = createStyleBlock()

        // Initial longhand values
        longhands.forEach(longhand => style[longhand] = initial(longhand))
        expect(style.columnRule).toBe('medium')
        expect(style.cssText).toBe('column-rule: medium;')
    })
})
describe('columns', () => {

    const longhands = shorthands.get('columns')

    it('parses longhand declarations from a shorthand value', () => {

        const style = createStyleBlock()

        // Initial longhand values
        style.columns = 'auto auto'
        expect(style).toHaveLength(longhands.length)
        longhands.forEach(longhand => expect(style[longhand]).toBe(initial(longhand)))
        expect(style.columns).toBe('auto')
        expect(style.cssText).toBe('columns: auto;')

        // Missing longhand values
        style.columns = 'auto'
        longhands.forEach(longhand => expect(style[longhand]).toBe(initial(longhand)))
        expect(style.columns).toBe('auto')
        expect(style.cssText).toBe('columns: auto;')
    })
    it('serializes a shorthand value from the declarations of its longhands', () => {

        const style = createStyleBlock()

        // Initial longhand values
        longhands.forEach(longhand => style[longhand] = initial(longhand))
        expect(style.columns).toBe('auto')
        expect(style.cssText).toBe('columns: auto;')
    })
})
describe('contain-intrinsic-size', () => {

    const longhands = shorthands.get('contain-intrinsic-size')

    it('parses longhand declarations from a shorthand value', () => {

        const style = createStyleBlock()

        // Initial longhand values
        style.containIntrinsicSize = 'none none'
        expect(style).toHaveLength(longhands.length)
        longhands.forEach(longhand => expect(style[longhand]).toBe(initial(longhand)))
        expect(style.containIntrinsicSize).toBe('none')
        expect(style.cssText).toBe('contain-intrinsic-size: none;')

        // Missing longhand values
        style.containIntrinsicSize = '1px'
        longhands.forEach(longhand => expect(style[longhand]).toBe('1px'))
        expect(style.containIntrinsicSize).toBe('1px')
        expect(style.cssText).toBe('contain-intrinsic-size: 1px;')
    })
    it('serializes a shorthand value from the declarations of its longhands', () => {

        const style = createStyleBlock()

        // Initial longhand values
        longhands.forEach(longhand => style[longhand] = initial(longhand))
        expect(style.containIntrinsicSize).toBe('none')
        expect(style.cssText).toBe('contain-intrinsic-size: none;')
    })
})
describe('container', () => {

    const longhands = shorthands.get('container')

    it('parses longhand declarations from a shorthand value', () => {

        const style = createStyleBlock()

        // Initial longhand values
        style.container = 'none / normal'
        expect(style).toHaveLength(longhands.length)
        longhands.forEach(longhand => expect(style[longhand]).toBe(initial(longhand)))
        expect(style.container).toBe('none')
        expect(style.cssText).toBe('container: none;')

        // Missing longhand values
        style.container = 'none'
        longhands.forEach(longhand => expect(style[longhand]).toBe(initial(longhand)))
        expect(style.container).toBe('none')
        expect(style.cssText).toBe('container: none;')
    })
    it('serializes a shorthand value from the declarations of its longhands', () => {

        const style = createStyleBlock()

        // Initial longhand values
        longhands.forEach(longhand => style[longhand] = initial(longhand))
        expect(style.container).toBe('none')
        expect(style.cssText).toBe('container: none;')
    })
})
describe('corners', () => {

    const longhands = shorthands.get('corners')

    it('parses longhand declarations from a shorthand value', () => {

        const style = createStyleBlock()

        // Initial longhand values
        style.corners = 'round 0'
        expect(style).toHaveLength(longhands.length)
        longhands.forEach(longhand => expect(style[longhand]).toBe(initial(longhand)))
        expect(style.corners).toBe('round')
        expect(style.cssText).toBe('corners: round;')

        // Missing longhand values
        style.corners = 'angle'
        longhands.forEach(longhand =>
            expect(style[longhand])
                .toBe(longhand === 'corner-shape'
                    ? 'angle'
                    : initial(longhand)))
        expect(style.corners).toBe('angle')
        expect(style.cssText).toBe('corners: angle;')
        style.corners = '1px'
        longhands.forEach(longhand =>
            expect(style[longhand])
                .toBe(longhand === 'corner-shape'
                    ? initial(longhand)
                    : '1px'))
        expect(style.corners).toBe('1px')
        expect(style.cssText).toBe('corners: 1px;')
    })
    it('serializes a shorthand value from the declarations of its longhands', () => {

        const style = createStyleBlock()

        // Initial longhand values
        longhands.forEach(longhand => style[longhand] = initial(longhand))
        expect(style.corners).toBe('round')
        expect(style.cssText).toBe('corners: round;')
    })
})
describe('cue, pause, rest', () => {

    const longhands = shorthands.get('cue')

    it('parses longhand declarations from a shorthand value', () => {

        const style = createStyleBlock()

        // Initial longhand values
        style.cue = 'none none'
        expect(style).toHaveLength(longhands.length)
        longhands.forEach(longhand => expect(style[longhand]).toBe(initial(longhand)))
        expect(style.cue).toBe('none')
        expect(style.cssText).toBe('cue: none;')

        // Missing longhand values
        style.cue = 'url("icon.wav")'
        longhands.forEach(longhand => expect(style[longhand]).toBe('url("icon.wav")'))
        expect(style.cue).toBe('url("icon.wav")')
        expect(style.cssText).toBe('cue: url("icon.wav");')
    })
    it('serializes a shorthand value from the declarations of its longhands', () => {

        const style = createStyleBlock()

        // Initial longhand values
        longhands.forEach(longhand => style[longhand] = initial(longhand))
        expect(style.cue).toBe('none')
        expect(style.cssText).toBe('cue: none;')
    })
})
describe('flex', () => {

    const longhands = shorthands.get('flex')

    it('parses longhand declarations from a shorthand value', () => {

        const style = createStyleBlock()

        // Initial longhand values
        style.flex = '0 1 auto'
        expect(style).toHaveLength(longhands.length)
        expect(style.flexGrow).toBe('0')
        expect(style.flexShrink).toBe('1')
        expect(style.flexBasis).toBe('auto')
        expect(style.flex).toBe('0 auto')
        expect(style.cssText).toBe('flex: 0 auto;')

        // Missing longhand values
        style.flex = '1'
        expect(style.flexGrow).toBe('1')
        expect(style.flexShrink).toBe('1')
        expect(style.flexBasis).toBe('0px')
        expect(style.flex).toBe('1')
        expect(style.cssText).toBe('flex: 1;')
        style.flex = '1 1'
        expect(style.flexGrow).toBe('1')
        expect(style.flexShrink).toBe('1')
        expect(style.flexBasis).toBe('0px')
        expect(style.flex).toBe('1')
        expect(style.cssText).toBe('flex: 1;')
        style.flex = '0px'
        expect(style.flexGrow).toBe('1')
        expect(style.flexShrink).toBe('1')
        expect(style.flexBasis).toBe('0px')
        expect(style.flex).toBe('1')
        expect(style.cssText).toBe('flex: 1;')

        // none
        style.flex = 'none'
        expect(style.flexGrow).toBe('0')
        expect(style.flexShrink).toBe('0')
        expect(style.flexBasis).toBe('auto')
        expect(style.flex).toBe('none')
        expect(style.cssText).toBe('flex: none;')
    })
    it('serializes a shorthand value from the declarations of its longhands', () => {

        const style = createStyleBlock()

        // Initial longhand values
        longhands.forEach(longhand => style[longhand] = initial(longhand))
        expect(style.flex).toBe('0 auto')
        expect(style.cssText).toBe('flex: 0 auto;')
    })
})
describe('flex-flow', () => {

    const longhands = shorthands.get('flex-flow')

    it('parses longhand declarations from a shorthand value', () => {

        const style = createStyleBlock()

        // Initial longhand values
        style.flexFlow = 'row nowrap'
        expect(style).toHaveLength(longhands.length)
        longhands.forEach(longhand => expect(style[longhand]).toBe(initial(longhand)))
        expect(style.flexFlow).toBe('row')
        expect(style.cssText).toBe('flex-flow: row;')

        // Missing longhand values
        style.flexFlow = 'row'
        longhands.forEach(longhand => expect(style[longhand]).toBe(initial(longhand)))
        expect(style.flexFlow).toBe('row')
        expect(style.cssText).toBe('flex-flow: row;')
    })
    it('serializes a shorthand value from the declarations of its longhands', () => {

        const style = createStyleBlock()

        // Initial longhand values
        longhands.forEach(longhand => style[longhand] = initial(longhand))
        expect(style.flexFlow).toBe('row')
        expect(style.cssText).toBe('flex-flow: row;')
    })
})
describe('font', () => {

    const longhands = shorthands.get('font')

    it('parses longhand declarations from a shorthand value', () => {

        const style = createStyleBlock()

        // Initial longhand values
        style.font = 'normal normal normal normal medium / normal monospace'
        expect(style).toHaveLength(longhands.length)
        longhands.forEach(longhand => expect(style[longhand]).toBe(initial(longhand)))
        expect(style.font).toBe('medium monospace')
        expect(style.cssText).toBe('font: medium monospace;')

        // Missing longhand values
        style.font = 'medium monospace'
        longhands.forEach(longhand => expect(style[longhand]).toBe(initial(longhand)))
        expect(style.font).toBe('medium monospace')
        expect(style.cssText).toBe('font: medium monospace;')

        // System font
        style.font = 'caption'
        longhands.forEach(longhand =>
            expect(style[longhand])
                .toBe(shorthands.resetOnly.font.includes(longhand)
                    ? initial(longhand)
                    : ''))
        expect(style.font).toBe('caption')
        expect(style.cssText).toBe('font: caption;')
        style.fontStyle = 'italic'
        expect(style.font).toBe('')
        expect(style.cssText).toBe('font-style: italic; font-variant-ligatures: ; font-variant-caps: ; font-variant-alternates: ; font-variant-numeric: ; font-variant-east-asian: ; font-variant-position: ; font-variant-emoji: ; font-weight: ; font-width: ; font-size: ; line-height: ; font-family: ; font-feature-settings: normal; font-kerning: auto; font-language-override: normal; font-optical-sizing: auto; font-size-adjust: none; font-variation-settings: normal;')
    })
    it('serializes a shorthand value from the declarations of its longhands', () => {

        const style = createStyleBlock()

        // Initial longhand values
        longhands.forEach(longhand => style[longhand] = initial(longhand))
        expect(style.font).toBe('medium monospace')
        expect(style.cssText).toBe('font: medium monospace;')

        // Non CSS2 font-variant property
        style.fontVariantCaps = 'all-petite-caps'
        expect(style.font).toBe('')
        expect(style.cssText).toBe('font-style: normal; font-variant: all-petite-caps; font-weight: normal; font-width: normal; font-size: medium; line-height: normal; font-family: monospace; font-feature-settings: normal; font-kerning: auto; font-language-override: normal; font-optical-sizing: auto; font-size-adjust: none; font-variation-settings: normal;')
        style.fontVariantCaps = initial('font-variant-caps')

        // Non CSS3 font-width property
        style.fontWidth = '110%'
        expect(style.font).toBe('')
        expect(style.cssText).toBe('font-style: normal; font-variant: normal; font-weight: normal; font-width: 110%; font-size: medium; line-height: normal; font-family: monospace; font-feature-settings: normal; font-kerning: auto; font-language-override: normal; font-optical-sizing: auto; font-size-adjust: none; font-variation-settings: normal;')
    })
})
describe('font-variant', () => {

    const longhands = shorthands.get('font-variant')

    it('parses longhand declarations from a shorthand value', () => {

        const style = createStyleBlock()

        // Initial longhand values
        style.fontVariant = 'normal'
        expect(style).toHaveLength(longhands.length)
        longhands.forEach(longhand => expect(style[longhand]).toBe(initial(longhand)))
        expect(style.fontVariant).toBe('normal')
        expect(style.cssText).toBe('font-variant: normal;')

        // Missing longhand values
        style.fontVariant = 'normal'
        longhands.forEach(longhand => expect(style[longhand]).toBe(initial(longhand)))
        expect(style.fontVariant).toBe('normal')
        expect(style.cssText).toBe('font-variant: normal;')

        // none
        style.fontVariant = 'none'
        longhands.forEach(longhand =>
            expect(style[longhand])
                .toBe(longhand === 'font-variant-ligatures'
                    ? 'none'
                    : initial(longhand)))
        expect(style.fontVariant).toBe('none')
        expect(style.cssText).toBe('font-variant: none;')
    })
    it('serializes a shorthand value from the declarations of its longhands', () => {

        const style = createStyleBlock()

        // Initial longhand values
        longhands.forEach(longhand => style[longhand] = initial(longhand))
        expect(style.fontVariant).toBe('normal')
        expect(style.cssText).toBe('font-variant: normal;')
    })
})
describe('font-synthesis', () => {

    const longhands = shorthands.get('font-synthesis')

    it('parses longhand declarations from a shorthand value', () => {

        const style = createStyleBlock()

        // Initial longhand values
        style.fontSynthesis = 'weight style small-caps position'
        expect(style).toHaveLength(longhands.length)
        longhands.forEach(longhand => expect(style[longhand]).toBe(initial(longhand)))
        expect(style.fontSynthesis).toBe('weight style small-caps position')
        expect(style.cssText).toBe('font-synthesis: weight style small-caps position;')

        // Missing longhand values
        const values = [
            ['none', ['none', 'none', 'none', 'none']],
            ['weight', ['auto', 'none', 'none', 'none']],
            ['style', ['none', 'auto', 'none', 'none']],
            ['small-caps', ['none', 'none', 'auto', 'none']],
            ['position', ['none', 'none', 'none', 'auto']],
            ['weight style', ['auto', 'auto', 'none', 'none']],
            ['weight small-caps', ['auto', 'none', 'auto', 'none']],
            ['weight position', ['auto', 'none', 'none', 'auto']],
            ['style small-caps', ['none', 'auto', 'auto', 'none']],
            ['style position', ['none', 'auto', 'none', 'auto']],
            ['weight style small-caps', ['auto', 'auto', 'auto', 'none']],
            ['weight style position', ['auto', 'auto', 'none', 'auto']],
            ['weight small-caps position', ['auto', 'none', 'auto', 'auto']],
            ['style small-caps position', ['none', 'auto', 'auto', 'auto']],
        ]
        values.forEach(([input, expected]) => {
            style.fontSynthesis = input
            longhands.forEach((longhand, i) => expect(style[longhand]).toBe(expected[i]))
            expect(style.fontSynthesis).toBe(input)
            expect(style.cssText).toBe(`font-synthesis: ${input};`)
        })

        // none
        style.fontSynthesis = 'none'
        longhands.forEach(longhand => expect(style[longhand]).toBe('none'))
        expect(style.fontSynthesis).toBe('none')
        expect(style.cssText).toBe('font-synthesis: none;')
    })
    it('serializes a shorthand value from the declarations of its longhands', () => {

        const style = createStyleBlock()

        // Initial longhand values
        longhands.forEach(longhand => style[longhand] = initial(longhand))
        expect(style.fontSynthesis).toBe('weight style small-caps position')
        expect(style.cssText).toBe('font-synthesis: weight style small-caps position;')
    })
})
describe('gap', () => {

    const longhands = shorthands.get('gap')

    it('parses longhand declarations from a shorthand value', () => {

        const style = createStyleBlock()

        // Initial longhand values
        style.gap = 'normal normal'
        expect(style).toHaveLength(longhands.length)
        longhands.forEach(longhand => expect(style[longhand]).toBe(initial(longhand)))
        expect(style.gap).toBe('normal')
        expect(style.cssText).toBe('gap: normal;')

        // Missing longhand values
        style.gap = '1px'
        longhands.forEach(longhand => expect(style[longhand]).toBe('1px'))
        expect(style.gap).toBe('1px')
        expect(style.cssText).toBe('gap: 1px;')
    })
    it('serializes a shorthand value from the declarations of its longhands', () => {

        const style = createStyleBlock()

        // Initial longhand values
        longhands.forEach(longhand => style[longhand] = initial(longhand))
        expect(style.gap).toBe('normal')
        expect(style.cssText).toBe('gap: normal;')
    })
})
describe('grid', () => {

    const longhands = shorthands.get('grid')

    it('parses longhand declarations from a shorthand value', () => {

        const style = createStyleBlock()

        // Initial longhand values (not all longhands can be explicitly declared)
        style.grid = 'none'
        expect(style).toHaveLength(longhands.length)
        longhands.forEach(longhand =>
            expect(style[longhand])
                .toBe(longhand.startsWith('grid-auto')
                    ? initial(longhand)
                    : 'none'))
        expect(style.grid).toBe('none')
        expect(style.cssText).toBe('grid: none;')

        // Explicit row and column templates
        style.grid = 'none / none'
        longhands.forEach(longhand => expect(style[longhand]).toBe(initial(longhand)))
        expect(style.grid).toBe('none')
        expect(style.cssText).toBe('grid: none;')

        // Implicit row template and explicit column template
        style.grid = 'auto-flow none / none'
        longhands.forEach(longhand => expect(style[longhand]).toBe(initial(longhand)))
        expect(style.grid).toBe('none')
        expect(style.cssText).toBe('grid: none;')

        // Explicit row template and implicit column template
        style.grid = 'none / auto-flow auto'
        longhands.forEach(longhand => {
            if (longhand === 'grid-auto-columns') {
                expect(style[longhand]).toBe('auto')
            } else if (longhand === 'grid-auto-flow') {
                expect(style[longhand]).toBe('column')
            } else {
                expect(style[longhand]).toBe(initial(longhand))
            }
        })
        expect(style.grid).toBe('none / auto-flow')
        expect(style.cssText).toBe('grid: none / auto-flow;')
    })
    it('serializes a shorthand value from the declarations of its longhands', () => {

        const style = createStyleBlock()

        // Initial longhand values
        longhands.forEach(longhand => style[longhand] = initial(longhand))
        expect(style.grid).toBe('none')
        expect(style.cssText).toBe('grid: none;')

        // Implicit column track list
        style.gridAutoFlow = 'column'
        expect(style.grid).toBe('none / auto-flow')
        expect(style.cssText).toBe('grid: none / auto-flow;')

        // Implicit row and column track list
        style.gridAutoRows = '1px'
        expect(style.grid).toBe('')
        expect(style.cssText).toBe('grid-template: none; grid-auto-flow: column; grid-auto-rows: 1px; grid-auto-columns: auto;')
        style.gridAutoFlow = initial('grid-auto-flow')
        style.gridAutoColumns = '1px'
        expect(style.grid).toBe('')
        expect(style.cssText).toBe('grid-template: none; grid-auto-flow: row; grid-auto-rows: 1px; grid-auto-columns: 1px;')
        style.gridAutoRows = initial('grid-auto-rows')
        expect(style.grid).toBe('')
        expect(style.cssText).toBe('grid-template: none; grid-auto-flow: row; grid-auto-rows: auto; grid-auto-columns: 1px;')
        style.gridAutoColumns = initial('grid-auto-columns')

        // Explicit and implicit row track list
        style.gridTemplateRows = '1px'
        style.gridAutoRows = '1px'
        expect(style.grid).toBe('')
        expect(style.cssText).toBe('grid-template: 1px / none; grid-auto-flow: row; grid-auto-rows: 1px; grid-auto-columns: auto;')
        style.gridAutoRows = initial('grid-auto-rows')
        style.gridAutoFlow = 'row dense'
        expect(style.grid).toBe('')
        expect(style.cssText).toBe('grid-template: 1px / none; grid-auto-flow: dense; grid-auto-rows: auto; grid-auto-columns: auto;')
        style.gridAutoFlow = initial('grid-auto-flow')
        style.gridTemplateRows = initial('grid-template-rows')

        // Explicit and implicit column track list
        style.gridTemplateColumns = '1px'
        style.gridAutoColumns = '1px'
        expect(style.grid).toBe('')
        expect(style.cssText).toBe('grid-template: none / 1px; grid-auto-flow: row; grid-auto-rows: auto; grid-auto-columns: 1px;')
        style.gridAutoColumns = initial('grid-auto-columns')
        style.gridAutoFlow = 'column'
        expect(style.grid).toBe('')
        expect(style.cssText).toBe('grid-template: none / 1px; grid-auto-flow: column; grid-auto-rows: auto; grid-auto-columns: auto;')
        style.gridAutoFlow = initial('grid-auto-flow')
        style.gridTemplateColumns = initial('grid-template-columns')
    })
})
describe('grid-area', () => {

    const longhands = shorthands.get('grid-area')

    it('parses longhand declarations from a shorthand value', () => {

        const style = createStyleBlock()

        // Initial longhand values
        style.gridArea = 'auto / auto / auto / auto'
        expect(style).toHaveLength(longhands.length)
        longhands.forEach(longhand => expect(style[longhand]).toBe(initial(longhand)))
        expect(style.gridArea).toBe('auto')
        expect(style.cssText).toBe('grid-area: auto;')

        // Missing longhand values
        const values = ['a', 'b', 'c']
        style.gridArea = 'a'
        longhands.forEach(longhand => expect(style[longhand]).toBe('a'))
        expect(style.gridArea).toBe('a')
        expect(style.cssText).toBe('grid-area: a;')
        style.gridArea = 'a / b'
        longhands.forEach((longhand, i) => expect(style[longhand]).toBe(values[i % 2]))
        expect(style.gridArea).toBe('a / b')
        expect(style.cssText).toBe('grid-area: a / b;')
        style.gridArea = 'a / b / c'
        longhands.forEach((longhand, i) => expect(style[longhand]).toBe(values[i === 3 ? 1 : i]))
        expect(style.gridArea).toBe('a / b / c')
        expect(style.cssText).toBe('grid-area: a / b / c;')

        // Explicit values
        style.gridArea = '1 / 1 / 1 / 1'
        longhands.forEach(longhand => expect(style[longhand]).toBe('1'))
        expect(style.gridArea).toBe('1 / 1 / 1 / 1')
        expect(style.cssText).toBe('grid-area: 1 / 1 / 1 / 1;')
    })
    it('serializes a shorthand value from the declarations of its longhands', () => {

        const style = createStyleBlock()

        // Initial longhand values
        longhands.forEach(longhand => style[longhand] = initial(longhand))
        expect(style.gridArea).toBe('auto')
        expect(style.cssText).toBe('grid-area: auto;')
    })
})
describe('grid-column, grid-row', () => {

    const longhands = shorthands.get('grid-column')

    it('parses longhand declarations from a shorthand value', () => {

        const style = createStyleBlock()

        // Initial longhand values
        style.gridColumn = 'auto / auto'
        expect(style).toHaveLength(longhands.length)
        longhands.forEach(longhand => expect(style[longhand]).toBe(initial(longhand)))
        expect(style.gridColumn).toBe('auto')
        expect(style.cssText).toBe('grid-column: auto;')

        // Missing longhand values
        const values = ['a', 'b']
        style.gridColumn = 'a'
        longhands.forEach(longhand => expect(style[longhand]).toBe('a'))
        expect(style.gridColumn).toBe('a')
        expect(style.cssText).toBe('grid-column: a;')
        style.gridColumn = 'a / b'
        longhands.forEach((longhand, i) => expect(style[longhand]).toBe(values[i % 2]))
        expect(style.gridColumn).toBe('a / b')
        expect(style.cssText).toBe('grid-column: a / b;')

        // Explicit values
        style.gridColumn = '1 / 1'
        longhands.forEach(longhand => expect(style[longhand]).toBe('1'))
        expect(style.gridColumn).toBe('1 / 1')
        expect(style.cssText).toBe('grid-column: 1 / 1;')
    })
    it('serializes a shorthand value from the declarations of its longhands', () => {

        const style = createStyleBlock()

        // Initial longhand values
        longhands.forEach(longhand => style[longhand] = initial(longhand))
        expect(style.gridColumn).toBe('auto')
        expect(style.cssText).toBe('grid-column: auto;')
    })
})
describe('grid-template', () => {

    const longhands = shorthands.get('grid-template')

    it('parses longhand declarations from a shorthand value', () => {

        const style = createStyleBlock()

        // Initial longhand values (not all longhands can be explicitly declared)
        style.gridTemplate = 'none'
        expect(style).toHaveLength(longhands.length)
        longhands.forEach(longhand => expect(style[longhand]).toBe(initial(longhand)))
        expect(style.gridTemplate).toBe('none')
        expect(style.cssText).toBe('grid-template: none;')

        // Row and column templates
        style.gridTemplate = 'none / none'
        longhands.forEach(longhand => expect(style[longhand]).toBe(initial(longhand)))
        expect(style.gridTemplate).toBe('none')
        expect(style.cssText).toBe('grid-template: none;')

        // Areas
        style.gridTemplate = `
            [top a-top] "a a" 1px  [a-bottom]
                [b-top] "b b" auto [b-bottom bottom]
            / auto`
        expect(style.gridTemplateAreas).toBe('"a a" "b b"')
        expect(style.gridTemplateRows).toBe('[top a-top] 1px [a-bottom b-top] auto [b-bottom bottom]')
        expect(style.gridTemplateColumns).toBe('auto')
        expect(style.gridTemplate).toBe('[top a-top] "a a" 1px [a-bottom b-top] "b b" [b-bottom bottom] / auto')
        expect(style.cssText).toBe('grid-template: [top a-top] "a a" 1px [a-bottom b-top] "b b" [b-bottom bottom] / auto;')

        // Empty <line-names>
        style.gridTemplate = '[] "." [] [a] "." [] / [] 1px []'
        expect(style.gridTemplateAreas).toBe('"." "."')
        expect(style.gridTemplateRows).toBe('auto [a] auto')
        expect(style.gridTemplateColumns).toBe('1px')
    })
    it('serializes a shorthand value from the declarations of its longhands', () => {

        const style = createStyleBlock()

        // Initial longhand values
        longhands.forEach(longhand => style[longhand] = initial(longhand))
        expect(style.gridTemplate).toBe('none')
        expect(style.cssText).toBe('grid-template: none;')

        // Areas
        style.gridTemplateAreas = '"a a" "b b"'
        style.gridTemplateRows = '[top a-top] 1px [a-bottom b-top] auto [b-bottom bottom]'
        expect(style.gridTemplate).toBe('[top a-top] "a a" 1px [a-bottom b-top] "b b" [b-bottom bottom]')
        expect(style.cssText).toBe('grid-template: [top a-top] "a a" 1px [a-bottom b-top] "b b" [b-bottom bottom];')

        // Areas and a row track list of same length
        style.gridTemplateRows = 'auto auto'
        expect(style.gridTemplate).toBe('"a a" "b b"')
        expect(style.cssText).toBe('grid-template: "a a" "b b";')

        // Areas and a shorter row track list
        style.gridTemplateRows = 'auto'
        expect(style.gridTemplate).toBe('')
        expect(style.cssText).toBe('grid-template-rows: auto; grid-template-columns: none; grid-template-areas: "a a" "b b";')

        // Areas and a longer row track list
        style.gridTemplateRows = 'auto auto auto'
        expect(style.gridTemplate).toBe('')
        expect(style.cssText).toBe('grid-template-rows: auto auto auto; grid-template-columns: none; grid-template-areas: "a a" "b b";')
        style.gridTemplateRows = initial('grid-template-rows')

        // Areas and no row track list
        style.gridTemplateAreas = '"a"'
        expect(style.gridTemplate).toBe('')
        expect(style.cssText).toBe('grid-template-rows: none; grid-template-columns: none; grid-template-areas: "a";')

        // Areas and a repeated row track list
        style.gridTemplateRows = 'repeat(1, 1px)'
        expect(style.gridTemplate).toBe('')
        expect(style.cssText).toBe('grid-template-rows: repeat(1, 1px); grid-template-columns: none; grid-template-areas: "a";')
        style.gridTemplateRows = 'repeat(auto-fill, 1px)'
        expect(style.gridTemplate).toBe('')
        expect(style.cssText).toBe('grid-template-rows: repeat(auto-fill, 1px); grid-template-columns: none; grid-template-areas: "a";')

        // Areas and a repeated column track list
        style.gridTemplateRows = 'auto'
        style.gridTemplateColumns = 'repeat(1, 1px)'
        expect(style.gridTemplate).toBe('')
        expect(style.cssText).toBe('grid-template-rows: auto; grid-template-columns: repeat(1, 1px); grid-template-areas: "a";')
        style.gridTemplateColumns = 'repeat(auto-fill, 1px)'
        expect(style.gridTemplate).toBe('')
        expect(style.cssText).toBe('grid-template-rows: auto; grid-template-columns: repeat(auto-fill, 1px); grid-template-areas: "a";')
        style.gridTemplateColumns = initial('grid-template-columns')

        // Areas and a subgrided track list
        style.gridTemplateRows = 'subgrid []'
        expect(style.gridTemplate).toBe('')
        expect(style.cssText).toBe('grid-template-rows: subgrid []; grid-template-columns: none; grid-template-areas: "a";')
        style.gridTemplateRows = 'auto'
        style.gridTemplateColumns = 'subgrid []'
        expect(style.gridTemplate).toBe('')
        expect(style.cssText).toBe('grid-template-rows: auto; grid-template-columns: subgrid []; grid-template-areas: "a";')

        // Areas and a longer column track list
        style.gridTemplateColumns = '1px 1px'
        expect(style.gridTemplate).toBe('"a" / 1px 1px')
        expect(style.cssText).toBe('grid-template: "a" / 1px 1px;')
    })
})
describe('inset', () => {

    const longhands = shorthands.get('inset')

    it('parses longhand declarations from a shorthand value', () => {

        const style = createStyleBlock()

        // Initial longhand values
        style.inset = 'auto auto auto auto'
        expect(style).toHaveLength(longhands.length)
        longhands.forEach(longhand => expect(style[longhand]).toBe(initial(longhand)))
        expect(style.inset).toBe('auto')
        expect(style.cssText).toBe('inset: auto;')

        // Missing longhand values
        const values = ['0px', '1px', '2px']
        style.inset = '0px'
        longhands.forEach(longhand => expect(style[longhand]).toBe('0px'))
        expect(style.inset).toBe('0px')
        expect(style.cssText).toBe('inset: 0px;')
        style.inset = '0px 1px'
        longhands.forEach((longhand, i) => expect(style[longhand]).toBe(values[i % 2]))
        expect(style.inset).toBe('0px 1px')
        expect(style.cssText).toBe('inset: 0px 1px;')
        style.inset = '0px 1px 2px'
        longhands.forEach((longhand, i) => expect(style[longhand]).toBe(values[i === 3 ? 1 : i]))
        expect(style.inset).toBe('0px 1px 2px')
        expect(style.cssText).toBe('inset: 0px 1px 2px;')
    })
    it('serializes a shorthand value from the declarations of its longhands', () => {

        const style = createStyleBlock()

        // Initial longhand values
        longhands.forEach(longhand => style[longhand] = initial(longhand))
        expect(style.inset).toBe('auto')
        expect(style.cssText).toBe('inset: auto;')
    })
})
describe('inset-block, inset-inline', () => {

    const longhands = shorthands.get('inset-block')

    it('parses longhand declarations from a shorthand value', () => {

        const style = createStyleBlock()

        // Initial longhand values
        style.insetBlock = 'auto auto'
        expect(style).toHaveLength(longhands.length)
        longhands.forEach(longhand => expect(style[longhand]).toBe(initial(longhand)))
        expect(style.insetBlock).toBe('auto')
        expect(style.cssText).toBe('inset-block: auto;')

        // Missing longhand values
        style.insetBlock = '1px'
        longhands.forEach(longhand => expect(style[longhand]).toBe('1px'))
        expect(style.insetBlock).toBe('1px')
        expect(style.cssText).toBe('inset-block: 1px;')
    })
    it('serializes a shorthand value from the declarations of its longhands', () => {

        const style = createStyleBlock()

        // Initial longhand values
        longhands.forEach(longhand => style[longhand] = initial(longhand))
        expect(style.insetBlock).toBe('auto')
        expect(style.cssText).toBe('inset-block: auto;')
    })
})
describe('line-clamp', () => {

    const longhands = shorthands.get('line-clamp')

    it('parses longhand declarations from a shorthand value', () => {

        const style = createStyleBlock()

        // Initial longhand values (not all longhands can be explicitly declared)
        style.lineClamp = 'none'
        expect(style).toHaveLength(longhands.length)
        longhands.forEach(longhand => expect(style[longhand]).toBe(initial(longhand)))
        expect(style.lineClamp).toBe('none')
        expect(style.cssText).toBe('line-clamp: none;')

        // Missing longhand values
        style.lineClamp = '1'
        expect(style.maxLines).toBe('1')
        expect(style.blockEllipsis).toBe('auto')
        expect(style.continue).toBe('discard')
        expect(style.lineClamp).toBe('1')
        expect(style.cssText).toBe('line-clamp: 1;')
        style.lineClamp = 'auto'
        expect(style.maxLines).toBe('none')
        expect(style.blockEllipsis).toBe('auto')
        expect(style.continue).toBe('discard')
        expect(style.lineClamp).toBe('auto')
        expect(style.cssText).toBe('line-clamp: auto;')
    })
    it('serializes a shorthand value from the declarations of its longhands', () => {

        const style = createStyleBlock()

        // Initial longhand values
        longhands.forEach(longhand => style[longhand] = initial(longhand))
        expect(style.lineClamp).toBe('none')
        expect(style.cssText).toBe('line-clamp: none;')

        // All longhands cannot always be represented
        style.maxLines = '1'
        expect(style.lineClamp).toBe('')
        expect(style.cssText).toBe('max-lines: 1; block-ellipsis: none; continue: auto;')
        style.blockEllipsis = 'auto'
        expect(style.lineClamp).toBe('')
        expect(style.cssText).toBe('max-lines: 1; block-ellipsis: auto; continue: auto;')
        style.maxLines = initial('max-lines')
        expect(style.lineClamp).toBe('')
        expect(style.cssText).toBe('-webkit-line-clamp: none;')
        style.blockEllipsis = initial('block-ellipsis')
        style.continue = 'discard'
        expect(style.lineClamp).toBe('')
        expect(style.cssText).toBe('max-lines: none; block-ellipsis: none; continue: discard;')
    })
})
describe('list-style', () => {

    const longhands = shorthands.get('list-style')

    it('parses longhand declarations from a shorthand value', () => {

        const style = createStyleBlock()

        // Initial longhand values
        style.listStyle = 'outside none disc'
        expect(style).toHaveLength(longhands.length)
        longhands.forEach(longhand => expect(style[longhand]).toBe(initial(longhand)))
        expect(style.listStyle).toBe('outside')
        expect(style.cssText).toBe('list-style: outside;')

        // Missing longhand values
        style.listStyle = 'outside'
        longhands.forEach(longhand => expect(style[longhand]).toBe(initial(longhand)))
        expect(style.listStyle).toBe('outside')
        expect(style.cssText).toBe('list-style: outside;')

        // Ambiguous values
        style.listStyle = 'none'
        expect(style.listStylePosition).toBe('outside')
        expect(style.listStyleImage).toBe('none')
        expect(style.listStyleType).toBe('none')
        expect(style.listStyle).toBe('none')
        expect(style.cssText).toBe('list-style: none;')
        style.listStyle = 'outside inside'
        expect(style.listStylePosition).toBe('outside')
        expect(style.listStyleImage).toBe('none')
        expect(style.listStyleType).toBe('inside')
        expect(style.listStyle).toBe('outside inside')
        expect(style.cssText).toBe('list-style: outside inside;')
        style.listStyle = 'outside outside'
        expect(style.listStylePosition).toBe('outside')
        expect(style.listStyleImage).toBe('none')
        expect(style.listStyleType).toBe('outside')
        expect(style.listStyle).toBe('outside outside')
        expect(style.cssText).toBe('list-style: outside outside;')
    })
    it('serializes a shorthand value from the declarations of its longhands', () => {

        const style = createStyleBlock()

        // Initial longhand values
        longhands.forEach(longhand => style[longhand] = initial(longhand))
        expect(style.listStyle).toBe('outside')
        expect(style.cssText).toBe('list-style: outside;')
    })
})
describe('margin', () => {

    const longhands = shorthands.get('margin')

    it('parses longhand declarations from a shorthand value', () => {

        const style = createStyleBlock()

        // Initial longhand values
        style.margin = '0 0 0 0'
        expect(style).toHaveLength(longhands.length)
        longhands.forEach(longhand => expect(style[longhand]).toBe(initial(longhand)))
        expect(style.margin).toBe('0px')
        expect(style.cssText).toBe('margin: 0px;')

        // Missing longhand values
        const values = ['0px', '1px', '2px']
        style.margin = '0px'
        longhands.forEach(longhand => expect(style[longhand]).toBe('0px'))
        expect(style.margin).toBe('0px')
        expect(style.cssText).toBe('margin: 0px;')
        style.margin = '0px 1px'
        longhands.forEach((longhand, i) => expect(style[longhand]).toBe(values[i % 2]))
        expect(style.margin).toBe('0px 1px')
        expect(style.cssText).toBe('margin: 0px 1px;')
        style.margin = '0px 1px 2px'
        longhands.forEach((longhand, i) => expect(style[longhand]).toBe(values[i === 3 ? 1 : i]))
        expect(style.margin).toBe('0px 1px 2px')
        expect(style.cssText).toBe('margin: 0px 1px 2px;')
    })
    it('serializes a shorthand value from the declarations of its longhands', () => {

        const style = createStyleBlock()

        // Initial longhand values
        longhands.forEach(longhand => style[longhand] = initial(longhand))
        expect(style.margin).toBe('0px')
        expect(style.cssText).toBe('margin: 0px;')
    })
})
describe('margin-block, margin-inline', () => {

    const longhands = shorthands.get('margin-block')

    it('parses longhand declarations from a shorthand value', () => {

        const style = createStyleBlock()

        // Initial longhand values
        style.marginBlock = '0 0'
        expect(style).toHaveLength(longhands.length)
        longhands.forEach(longhand => expect(style[longhand]).toBe(initial(longhand)))
        expect(style.marginBlock).toBe('0px')
        expect(style.cssText).toBe('margin-block: 0px;')

        // Missing longhand values
        style.marginBlock = '1px'
        longhands.forEach(longhand => expect(style[longhand]).toBe('1px'))
        expect(style.marginBlock).toBe('1px')
        expect(style.cssText).toBe('margin-block: 1px;')
    })
    it('serializes a shorthand value from the declarations of its longhands', () => {

        const style = createStyleBlock()

        // Initial longhand values
        longhands.forEach(longhand => style[longhand] = initial(longhand))
        expect(style.marginBlock).toBe('0px')
        expect(style.cssText).toBe('margin-block: 0px;')
    })
})
describe('marker', () => {

    const longhands = shorthands.get('marker')

    it('parses longhand declarations from a shorthand value', () => {

        const style = createStyleBlock()

        style.marker = 'none'
        expect(style).toHaveLength(longhands.length)
        longhands.forEach(longhand => expect(style[longhand]).toBe(initial(longhand)))
        expect(style.marker).toBe('none')
        expect(style.cssText).toBe('marker: none;')
    })
    it('serializes a shorthand value from the declarations of its longhands', () => {

        const style = createStyleBlock()

        // All equal longhand values
        longhands.forEach(longhand => style[longhand] = initial(longhand))
        expect(style.marker).toBe('none')
        expect(style.cssText).toBe('marker: none;')

        // Not all equal longhand values
        style.markerStart = 'url("#start")'
        expect(style.marker).toBe('')
        expect(style.cssText).toBe('marker-start: url("#start"); marker-mid: none; marker-end: none;')
    })
})
describe('mask', () => {

    const longhands = shorthands.get('mask')

    it('parses longhand declarations from a shorthand value', () => {

        const style = createStyleBlock()
        const mask = 'none 0% 0% / auto repeat border-box border-box add match-source'

        // Initial longhand values
        style.mask = mask
        expect(style).toHaveLength(longhands.length)
        longhands.forEach(longhand => expect(style[longhand]).toBe(initial(longhand)))
        expect(style.mask).toBe('none')
        expect(style.cssText).toBe('mask: none;')

        // Missing longhand values
        style.mask = 'none'
        longhands.forEach(longhand => expect(style[longhand]).toBe(initial(longhand)))
        expect(style.mask).toBe('none')
        expect(style.cssText).toBe('mask: none;')

        // Repeated longhand values
        style.mask = `${mask}, ${mask}`
        longhands.forEach(longhand =>
            expect(style[longhand]).toBe(shorthands.resetOnly.mask.includes(longhand)
                ? initial(longhand)
                : `${initial(longhand)}, ${initial(longhand)}`))
        expect(style.mask).toBe('none, none')
        expect(style.cssText).toBe('mask: none, none;')

        // no-clip
        style.mask = 'border-box no-clip'
        longhands.forEach(longhand =>
            expect(style[longhand])
                .toBe(longhand === 'mask-clip'
                    ? 'no-clip'
                    : initial(longhand)))
        expect(style.mask).toBe('no-clip')
        expect(style.cssText).toBe('mask: no-clip;')

        // Single <geometry-box>
        style.mask = 'fill-box'
        longhands.forEach(longhand =>
            expect(style[longhand])
                .toBe((longhand === 'mask-origin' || longhand === 'mask-clip')
                    ? 'fill-box'
                    : initial(longhand)))
        expect(style.mask).toBe('fill-box')
        expect(style.cssText).toBe('mask: fill-box;')

        // Same <geometry-box>
        style.mask = 'fill-box fill-box'
        longhands.forEach(longhand =>
            expect(style[longhand])
                .toBe((longhand === 'mask-origin' || longhand === 'mask-clip')
                    ? 'fill-box'
                    : initial(longhand)))
        expect(style.mask).toBe('fill-box')
        expect(style.cssText).toBe('mask: fill-box;')
    })
    it('serializes a shorthand value from the declarations of its longhands', () => {

        const style = createStyleBlock()

        // Initial longhand values
        longhands.forEach(longhand => style[longhand] = initial(longhand))
        expect(style.mask).toBe('none')
        expect(style.cssText).toBe('mask: none;')

        // Different lengths of longhand values
        style.maskImage = 'none, none'
        expect(style.mask).toBe('')
        expect(style.cssText).toBe('mask-image: none, none; mask-position: 0% 0%; mask-size: auto; mask-repeat: repeat; mask-origin: border-box; mask-clip: border-box; mask-composite: add; mask-mode: match-source; mask-border: none;')
    })
})
describe('mask-border', () => {

    const longhands = shorthands.get('mask-border')

    it('parses longhand declarations from a shorthand value', () => {

        const style = createStyleBlock()

        // Initial longhand values
        style.maskBorder = 'none 0 / auto / 0 stretch alpha'
        expect(style).toHaveLength(longhands.length)
        longhands.forEach(longhand => expect(style[longhand]).toBe(initial(longhand)))
        expect(style.maskBorder).toBe('none')
        expect(style.cssText).toBe('mask-border: none;')

        // Missing longhand values
        style.maskBorder = 'none'
        longhands.forEach(longhand => expect(style[longhand]).toBe(initial(longhand)))
        expect(style.maskBorder).toBe('none')
        expect(style.cssText).toBe('mask-border: none;')
    })
    it('serializes a shorthand value from the declarations of its longhands', () => {

        const style = createStyleBlock()

        // Initial longhand values
        longhands.forEach(longhand => style[longhand] = initial(longhand))
        expect(style.maskBorder).toBe('none')
        expect(style.cssText).toBe('mask-border: none;')
    })
})
describe('offset', () => {

    const longhands = shorthands.get('offset')

    it('parses longhand declarations from a shorthand value', () => {

        const style = createStyleBlock()

        // Initial longhand values
        style.offset = 'normal none 0 auto / auto'
        expect(style).toHaveLength(longhands.length)
        longhands.forEach(longhand => expect(style[longhand]).toBe(initial(longhand)))
        expect(style.offset).toBe('normal')
        expect(style.cssText).toBe('offset: normal;')

        // Missing longhand values
        style.offset = 'normal'
        longhands.forEach(longhand => expect(style[longhand]).toBe(initial(longhand)))
        expect(style.offset).toBe('normal')
        expect(style.cssText).toBe('offset: normal;')
        style.offset = 'normal / left'
        longhands.forEach(longhand =>
            style[longhand] = longhand === 'offset-anchor'
                ? 'left center'
                : initial(longhand))
        expect(style.offset).toBe('normal / left center')
        expect(style.cssText).toBe('offset: normal / left center;')
    })
    it('serializes a shorthand value from the declarations of its longhands', () => {

        const style = createStyleBlock()

        // Initial longhand values
        longhands.forEach(longhand => style[longhand] = initial(longhand))
        expect(style.offset).toBe('normal')
        expect(style.cssText).toBe('offset: normal;')
    })
})
describe('outline', () => {

    const longhands = shorthands.get('outline')

    it('parses longhand declarations from a shorthand value', () => {

        const style = createStyleBlock()

        // Initial longhand values
        style.outline = 'medium none auto'
        expect(style).toHaveLength(longhands.length)
        longhands.forEach(longhand => expect(style[longhand]).toBe(initial(longhand)))
        expect(style.outline).toBe('medium')
        expect(style.cssText).toBe('outline: medium;')

        // Missing longhand values
        style.outline = 'medium'
        longhands.forEach(longhand => expect(style[longhand]).toBe(initial(longhand)))
        expect(style.outline).toBe('medium')
        expect(style.cssText).toBe('outline: medium;')

        // Lone `auto` sets both `outline-style` and `outline-color`
        style.outline = 'auto'
        longhands.forEach(longhand =>
            expect(style[longhand])
                .toBe(
                    longhand === 'outline-width'
                        ? initial(longhand)
                        : 'auto'))
        expect(style.outline).toBe('auto')
        expect(style.cssText).toBe('outline: auto;')
    })
    it('serializes a shorthand value from the declarations of its longhands', () => {

        const style = createStyleBlock()

        // Initial longhand values
        longhands.forEach(longhand => style[longhand] = initial(longhand))
        expect(style.outline).toBe('medium')
        expect(style.cssText).toBe('outline: medium;')
    })
})
describe('overflow', () => {

    const longhands = shorthands.get('overflow')

    it('parses longhand declarations from a shorthand value', () => {

        const style = createStyleBlock()

        // Initial longhand values
        style.overflow = 'visible visible'
        expect(style).toHaveLength(longhands.length)
        longhands.forEach(longhand => expect(style[longhand]).toBe(initial(longhand)))
        expect(style.overflow).toBe('visible')
        expect(style.cssText).toBe('overflow: visible;')

        // Missing longhand values
        style.overflow = 'hidden'
        longhands.forEach(longhand => expect(style[longhand]).toBe('hidden'))
        expect(style.overflow).toBe('hidden')
        expect(style.cssText).toBe('overflow: hidden;')

        // Legacy value alias
        style.overflow = 'overlay'
        longhands.forEach(longhand => expect(style[longhand]).toBe('auto'))
        expect(style.overflow).toBe('auto')
        expect(style.cssText).toBe('overflow: auto;')
    })
    it('serializes a shorthand value from the declarations of its longhands', () => {

        const style = createStyleBlock()

        // Initial longhand values
        longhands.forEach(longhand => style[longhand] = initial(longhand))
        expect(style.overflow).toBe('visible')
        expect(style.cssText).toBe('overflow: visible;')
    })
})
describe('overflow-clip-margin, overflow-clip-margin-block, overflow-clip-margin-inline', () => {

    const longhands = shorthands.get('overflow-clip-margin')

    it('parses longhand declarations from a shorthand value', () => {

        const style = createStyleBlock()

        // Initial longhand values
        style.overflowClipMargin = '0px'
        expect(style).toHaveLength(longhands.length)
        longhands.forEach(longhand => expect(style[longhand]).toBe(initial(longhand)))
        expect(style.overflowClipMargin).toBe('0px')
        expect(style.cssText).toBe('overflow-clip-margin: 0px;')

        // Optional <length>
        style.overflowClipMargin = 'content-box 0px'
        longhands.forEach(longhand => expect(style[longhand]).toBe('content-box'))
        expect(style.overflowClipMargin).toBe('content-box')
        expect(style.cssText).toBe('overflow-clip-margin: content-box;')
    })
    it('serializes a shorthand value from the declarations of its longhands', () => {

        const style = createStyleBlock()

        // All equal longhand values
        longhands.forEach(longhand => style[longhand] = initial(longhand))
        expect(style.overflowClipMargin).toBe('0px')
        expect(style.cssText).toBe('overflow-clip-margin: 0px;')

        // Not all equal longhand values
        style.overflowClipMarginTop = '1px'
        expect(style.marker).toBe('')
        expect(style.cssText).toBe('overflow-clip-margin-top: 1px; overflow-clip-margin-right: 0px; overflow-clip-margin-bottom: 0px; overflow-clip-margin-left: 0px;')
    })
})
describe('overflow-clip-margin-block, overflow-clip-margin-inline', () => {

    const longhands = shorthands.get('overflow-clip-margin-block')

    it('parses longhand declarations from a shorthand value', () => {

        const style = createStyleBlock()

        // Initial longhand values
        style.overflowClipMarginBlock = '0px'
        expect(style).toHaveLength(longhands.length)
        longhands.forEach(longhand => expect(style[longhand]).toBe(initial(longhand)))
        expect(style.overflowClipMarginBlock).toBe('0px')
        expect(style.cssText).toBe('overflow-clip-margin-block: 0px;')
    })
    it('serializes a shorthand value from the declarations of its longhands', () => {

        const style = createStyleBlock()

        // Initial longhand values
        longhands.forEach(longhand => style[longhand] = initial(longhand))
        expect(style.overflowClipMarginBlock).toBe('0px')
        expect(style.cssText).toBe('overflow-clip-margin-block: 0px;')
    })
})
describe('overscroll-behavior', () => {

    const longhands = shorthands.get('overscroll-behavior')

    it('parses longhand declarations from a shorthand value', () => {

        const style = createStyleBlock()

        // Initial longhand values
        style.overscrollBehavior = 'auto auto'
        expect(style).toHaveLength(longhands.length)
        longhands.forEach(longhand => expect(style[longhand]).toBe(initial(longhand)))
        expect(style.overscrollBehavior).toBe('auto')
        expect(style.cssText).toBe('overscroll-behavior: auto;')

        // Missing longhand values
        style.overscrollBehavior = 'contain'
        longhands.forEach(longhand => expect(style[longhand]).toBe('contain'))
        expect(style.overscrollBehavior).toBe('contain')
        expect(style.cssText).toBe('overscroll-behavior: contain;')
    })
    it('serializes a shorthand value from the declarations of its longhands', () => {

        const style = createStyleBlock()

        // Initial longhand values
        longhands.forEach(longhand => style[longhand] = initial(longhand))
        expect(style.overscrollBehavior).toBe('auto')
        expect(style.cssText).toBe('overscroll-behavior: auto;')
    })
})
describe('padding', () => {

    const longhands = shorthands.get('padding')

    it('parses longhand declarations from a shorthand value', () => {

        const style = createStyleBlock()

        // Initial longhand values
        style.padding = '0 0 0 0'
        expect(style).toHaveLength(longhands.length)
        longhands.forEach(longhand => expect(style[longhand]).toBe(initial(longhand)))
        expect(style.padding).toBe('0px')
        expect(style.cssText).toBe('padding: 0px;')

        // Missing longhand values
        const values = ['0px', '1px', '2px']
        style.padding = '0px'
        longhands.forEach(longhand => expect(style[longhand]).toBe('0px'))
        expect(style.padding).toBe('0px')
        expect(style.cssText).toBe('padding: 0px;')
        style.padding = '0px 1px'
        longhands.forEach((longhand, i) => expect(style[longhand]).toBe(values[i % 2]))
        expect(style.padding).toBe('0px 1px')
        expect(style.cssText).toBe('padding: 0px 1px;')
        style.padding = '0px 1px 2px'
        longhands.forEach((longhand, i) => expect(style[longhand]).toBe(values[i === 3 ? 1 : i]))
        expect(style.padding).toBe('0px 1px 2px')
        expect(style.cssText).toBe('padding: 0px 1px 2px;')
    })
    it('serializes a shorthand value from the declarations of its longhands', () => {

        const style = createStyleBlock()

        // Initial longhand values
        longhands.forEach(longhand => style[longhand] = initial(longhand))
        expect(style.padding).toBe('0px')
        expect(style.cssText).toBe('padding: 0px;')
    })
})
describe('padding-block, padding-inline', () => {

    const longhands = shorthands.get('padding-block')

    it('parses longhand declarations from a shorthand value', () => {

        const style = createStyleBlock()

        // Initial longhand values
        style.paddingBlock = '0 0'
        expect(style).toHaveLength(longhands.length)
        longhands.forEach(longhand => expect(style[longhand]).toBe(initial(longhand)))
        expect(style.paddingBlock).toBe('0px')
        expect(style.cssText).toBe('padding-block: 0px;')

        // Missing longhand values
        style.paddingBlock = '1px'
        longhands.forEach(longhand => expect(style[longhand]).toBe('1px'))
        expect(style.paddingBlock).toBe('1px')
        expect(style.cssText).toBe('padding-block: 1px;')
    })
    it('serializes a shorthand value from the declarations of its longhands', () => {

        const style = createStyleBlock()

        // Initial longhand values
        longhands.forEach(longhand => style[longhand] = initial(longhand))
        expect(style.paddingBlock).toBe('0px')
        expect(style.cssText).toBe('padding-block: 0px;')
    })
})
describe('place-content', () => {

    const longhands = shorthands.get('place-content')

    it('parses longhand declarations from a shorthand value', () => {

        const style = createStyleBlock()

        // Initial longhand values
        style.placeContent = 'normal normal'
        expect(style).toHaveLength(longhands.length)
        longhands.forEach(longhand => expect(style[longhand]).toBe(initial(longhand)))
        expect(style.placeContent).toBe('normal')
        expect(style.cssText).toBe('place-content: normal;')

        // Missing longhand values
        style.placeContent = 'stretch'
        longhands.forEach(longhand => expect(style[longhand]).toBe('stretch'))
        expect(style.placeContent).toBe('stretch')
        expect(style.cssText).toBe('place-content: stretch;')

        // <baseline-position>
        style.placeContent = 'baseline'
        expect(style.alignContent).toBe('baseline')
        expect(style.justifyContent).toBe('start')
        expect(style.placeContent).toBe('baseline')
        expect(style.cssText).toBe('place-content: baseline;')
        style.placeContent = 'baseline start'
        expect(style.alignContent).toBe('baseline')
        expect(style.justifyContent).toBe('start')
        expect(style.placeContent).toBe('baseline')
        expect(style.cssText).toBe('place-content: baseline;')
    })
    it('serializes a shorthand value from the declarations of its longhands', () => {

        const style = createStyleBlock()

        // Initial longhand values
        longhands.forEach(longhand => style[longhand] = initial(longhand))
        expect(style.placeContent).toBe('normal')
        expect(style.cssText).toBe('place-content: normal;')
    })
})
describe('place-items', () => {

    const longhands = shorthands.get('place-items')

    it('parses longhand declarations from a shorthand value', () => {

        const style = createStyleBlock()

        // Initial longhand values
        style.placeItems = 'normal legacy'
        expect(style).toHaveLength(longhands.length)
        longhands.forEach(longhand => expect(style[longhand]).toBe(initial(longhand)))
        expect(style.placeItems).toBe('normal legacy')
        expect(style.cssText).toBe('place-items: normal legacy;')

        // Missing longhand values
        style.placeItems = 'normal'
        longhands.forEach(longhand => expect(style[longhand]).toBe('normal'))
        expect(style.placeItems).toBe('normal')
        expect(style.cssText).toBe('place-items: normal;')
    })
    it('serializes a shorthand value from the declarations of its longhands', () => {

        const style = createStyleBlock()

        // Initial longhand values
        longhands.forEach(longhand => style[longhand] = initial(longhand))
        expect(style.placeItems).toBe('normal legacy')
        expect(style.cssText).toBe('place-items: normal legacy;')
    })
})
describe('place-self', () => {

    const longhands = shorthands.get('place-self')

    it('parses longhand declarations from a shorthand value', () => {

        const style = createStyleBlock()

        // Initial longhand values
        style.placeSelf = 'auto auto'
        expect(style).toHaveLength(longhands.length)
        longhands.forEach(longhand => expect(style[longhand]).toBe(initial(longhand)))
        expect(style.placeSelf).toBe('auto')
        expect(style.cssText).toBe('place-self: auto;')

        // Missing longhand values
        style.placeSelf = 'normal'
        longhands.forEach(longhand => expect(style[longhand]).toBe('normal'))
        expect(style.placeSelf).toBe('normal')
        expect(style.cssText).toBe('place-self: normal;')
    })
    it('serializes a shorthand value from the declarations of its longhands', () => {

        const style = createStyleBlock()

        // Initial longhand values
        longhands.forEach(longhand => style[longhand] = initial(longhand))
        expect(style.placeSelf).toBe('auto')
        expect(style.cssText).toBe('place-self: auto;')
    })
})
describe('position-try', () => {

    const longhands = shorthands.get('position-try')

    it('parses longhand declarations from a shorthand value', () => {

        const style = createStyleBlock()

        // Initial longhand values
        style.positionTry = 'normal none'
        expect(style).toHaveLength(longhands.length)
        longhands.forEach(longhand => expect(style[longhand]).toBe(initial(longhand)))
        expect(style.positionTry).toBe('none')
        expect(style.cssText).toBe('position-try: none;')

        // Missing longhand values
        style.positionTry = 'none'
        longhands.forEach(longhand => expect(style[longhand]).toBe(initial(longhand)))
        expect(style.positionTry).toBe('none')
        expect(style.cssText).toBe('position-try: none;')
    })
    it('serializes a shorthand value from the declarations of its longhands', () => {

        const style = createStyleBlock()

        // Initial longhand values
        longhands.forEach(longhand => style[longhand] = initial(longhand))
        expect(style.positionTry).toBe('none')
        expect(style.cssText).toBe('position-try: none;')
    })
})
describe('scroll-margin', () => {

    const longhands = shorthands.get('scroll-margin')

    it('parses longhand declarations from a shorthand value', () => {

        const style = createStyleBlock()

        // Initial longhand values
        style.scrollMargin = '0 0 0 0'
        expect(style).toHaveLength(longhands.length)
        longhands.forEach(longhand => expect(style[longhand]).toBe(initial(longhand)))
        expect(style.scrollMargin).toBe('0px')
        expect(style.cssText).toBe('scroll-margin: 0px;')

        // Missing longhand values
        const values = ['0px', '1px', '2px']
        style.scrollMargin = '0px'
        longhands.forEach(longhand => expect(style[longhand]).toBe('0px'))
        expect(style.scrollMargin).toBe('0px')
        expect(style.cssText).toBe('scroll-margin: 0px;')
        style.scrollMargin = '0px 1px'
        longhands.forEach((longhand, i) => expect(style[longhand]).toBe(values[i % 2]))
        expect(style.scrollMargin).toBe('0px 1px')
        expect(style.cssText).toBe('scroll-margin: 0px 1px;')
        style.scrollMargin = '0px 1px 2px'
        longhands.forEach((longhand, i) => expect(style[longhand]).toBe(values[i === 3 ? 1 : i]))
        expect(style.scrollMargin).toBe('0px 1px 2px')
        expect(style.cssText).toBe('scroll-margin: 0px 1px 2px;')
    })
    it('serializes a shorthand value from the declarations of its longhands', () => {

        const style = createStyleBlock()

        // Initial longhand values
        longhands.forEach(longhand => style[longhand] = initial(longhand))
        expect(style.scrollMargin).toBe('0px')
        expect(style.cssText).toBe('scroll-margin: 0px;')
    })
})
describe('scroll-margin-block, scroll-margin-inline', () => {

    const longhands = shorthands.get('scroll-margin-block')

    it('parses longhand declarations from a shorthand value', () => {

        const style = createStyleBlock()

        // Initial longhand values
        style.scrollMarginBlock = '0 0'
        expect(style).toHaveLength(longhands.length)
        longhands.forEach(longhand => expect(style[longhand]).toBe(initial(longhand)))
        expect(style.scrollMarginBlock).toBe('0px')
        expect(style.cssText).toBe('scroll-margin-block: 0px;')

        // Missing longhand values
        style.scrollMarginBlock = '1px'
        longhands.forEach(longhand => expect(style[longhand]).toBe('1px'))
        expect(style.scrollMarginBlock).toBe('1px')
        expect(style.cssText).toBe('scroll-margin-block: 1px;')
    })
    it('serializes a shorthand value from the declarations of its longhands', () => {

        const style = createStyleBlock()

        // Initial longhand values
        longhands.forEach(longhand => style[longhand] = initial(longhand))
        expect(style.scrollMarginBlock).toBe('0px')
        expect(style.cssText).toBe('scroll-margin-block: 0px;')
    })
})
describe('scroll-padding', () => {

    const longhands = shorthands.get('scroll-padding')

    it('parses longhand declarations from a shorthand value', () => {

        const style = createStyleBlock()

        // Initial longhand values
        style.scrollPadding = 'auto auto auto auto'
        expect(style).toHaveLength(longhands.length)
        longhands.forEach(longhand => expect(style[longhand]).toBe(initial(longhand)))
        expect(style.scrollPadding).toBe('auto')
        expect(style.cssText).toBe('scroll-padding: auto;')

        // Missing longhand values
        const values = ['0px', '1px', '2px']
        style.scrollPadding = '0px'
        longhands.forEach(longhand => expect(style[longhand]).toBe('0px'))
        expect(style.scrollPadding).toBe('0px')
        expect(style.cssText).toBe('scroll-padding: 0px;')
        style.scrollPadding = '0px 1px'
        longhands.forEach((longhand, i) => expect(style[longhand]).toBe(values[i % 2]))
        expect(style.scrollPadding).toBe('0px 1px')
        expect(style.cssText).toBe('scroll-padding: 0px 1px;')
        style.scrollPadding = '0px 1px 2px'
        longhands.forEach((longhand, i) => expect(style[longhand]).toBe(values[i === 3 ? 1 : i]))
        expect(style.scrollPadding).toBe('0px 1px 2px')
        expect(style.cssText).toBe('scroll-padding: 0px 1px 2px;')
    })
    it('serializes a shorthand value from the declarations of its longhands', () => {

        const style = createStyleBlock()

        // Initial longhand values
        longhands.forEach(longhand => style[longhand] = initial(longhand))
        expect(style.scrollPadding).toBe('auto')
        expect(style.cssText).toBe('scroll-padding: auto;')
    })
})
describe('scroll-padding-block, scroll-padding-inline', () => {

    const longhands = shorthands.get('scroll-padding-block')

    it('parses longhand declarations from a shorthand value', () => {

        const style = createStyleBlock()

        // Initial longhand values
        style.scrollPaddingBlock = 'auto auto'
        expect(style).toHaveLength(longhands.length)
        longhands.forEach(longhand => expect(style[longhand]).toBe(initial(longhand)))
        expect(style.scrollPaddingBlock).toBe('auto')
        expect(style.cssText).toBe('scroll-padding-block: auto;')

        // Missing longhand values
        style.scrollPaddingBlock = '1px'
        longhands.forEach(longhand => expect(style[longhand]).toBe('1px'))
        expect(style.scrollPaddingBlock).toBe('1px')
        expect(style.cssText).toBe('scroll-padding-block: 1px;')
    })
    it('serializes a shorthand value from the declarations of its longhands', () => {

        const style = createStyleBlock()

        // Initial longhand values
        longhands.forEach(longhand => style[longhand] = initial(longhand))
        expect(style.scrollPaddingBlock).toBe('auto')
        expect(style.cssText).toBe('scroll-padding-block: auto;')
    })
})
describe('scroll-start', () => {

    const longhands = shorthands.get('scroll-start')

    it('parses longhand declarations from a shorthand value', () => {

        const style = createStyleBlock()

        // Initial longhand values
        style.scrollStart = 'auto auto'
        expect(style).toHaveLength(longhands.length)
        longhands.forEach(longhand => expect(style[longhand]).toBe(initial(longhand)))
        expect(style.scrollStart).toBe('auto')
        expect(style.cssText).toBe('scroll-start: auto;')

        // Missing longhand values
        style.scrollStart = 'auto'
        longhands.forEach(longhand => expect(style[longhand]).toBe('auto'))
        expect(style.scrollStart).toBe('auto')
        expect(style.cssText).toBe('scroll-start: auto;')
    })
    it('serializes a shorthand value from the declarations of its longhands', () => {

        const style = createStyleBlock()

        // Initial longhand values
        longhands.forEach(longhand => style[longhand] = initial(longhand))
        expect(style.scrollStart).toBe('auto')
        expect(style.cssText).toBe('scroll-start: auto;')
    })
})
describe('scroll-start-target', () => {

    const longhands = shorthands.get('scroll-start-target')

    it('parses longhand declarations from a shorthand value', () => {

        const style = createStyleBlock()

        // Initial longhand values
        style.scrollStartTarget = 'none none'
        expect(style).toHaveLength(longhands.length)
        longhands.forEach(longhand => expect(style[longhand]).toBe(initial(longhand)))
        expect(style.scrollStartTarget).toBe('none')
        expect(style.cssText).toBe('scroll-start-target: none;')

        // Missing longhand values
        style.scrollStartTarget = 'none'
        longhands.forEach(longhand => expect(style[longhand]).toBe('none'))
        expect(style.scrollStartTarget).toBe('none')
        expect(style.cssText).toBe('scroll-start-target: none;')
    })
    it('serializes a shorthand value from the declarations of its longhands', () => {

        const style = createStyleBlock()

        // Initial longhand values
        longhands.forEach(longhand => style[longhand] = initial(longhand))
        expect(style.scrollStartTarget).toBe('none')
        expect(style.cssText).toBe('scroll-start-target: none;')
    })
})
describe('scroll-timeline', () => {

    const longhands = shorthands.get('scroll-timeline')

    it('parses longhand declarations from a shorthand value', () => {

        const style = createStyleBlock()
        const timeline = 'none block'

        // Initial longhand values
        style.scrollTimeline = timeline
        expect(style).toHaveLength(longhands.length)
        longhands.forEach(longhand => expect(style[longhand]).toBe(initial(longhand)))
        expect(style.scrollTimeline).toBe('none')
        expect(style.cssText).toBe('scroll-timeline: none;')

        // Missing longhand values
        style.scrollTimeline = 'none'
        longhands.forEach(longhand => expect(style[longhand]).toBe(initial(longhand)))
        expect(style.scrollTimeline).toBe('none')
        expect(style.cssText).toBe('scroll-timeline: none;')

        // Repeated longhand values
        style.scrollTimeline = `${timeline}, ${timeline}`
        longhands.forEach(longhand => expect(style[longhand]).toBe(`${initial(longhand)}, ${initial(longhand)}`))
        expect(style.scrollTimeline).toBe('none, none')
        expect(style.cssText).toBe('scroll-timeline: none, none;')
    })
    it('serializes a shorthand value from the declarations of its longhands', () => {

        const style = createStyleBlock()

        // Initial longhand values
        longhands.forEach(longhand => style[longhand] = initial(longhand))
        expect(style.scrollTimeline).toBe('none')
        expect(style.cssText).toBe('scroll-timeline: none;')

        // Different lengths of longhand values
        style.scrollTimelineName = 'none, none'
        expect(style.scrollTimeline).toBe('')
        expect(style.cssText).toBe('scroll-timeline-name: none, none; scroll-timeline-axis: block;')
    })
})
describe('text-align', () => {

    const longhands = shorthands.get('text-align')

    it('parses longhand declarations from a shorthand value', () => {

        const style = createStyleBlock()

        // Initial longhand values (not all longhands can be explicitly declared)
        style.textAlign = 'start'
        expect(style).toHaveLength(longhands.length)
        longhands.forEach(longhand => expect(style[longhand]).toBe(initial(longhand)))
        expect(style.textAlign).toBe('start')
        expect(style.cssText).toBe('text-align: start;')

        // match-parent
        style.textAlign = 'match-parent'
        longhands.forEach(longhand => expect(style[longhand]).toBe('match-parent'))
        expect(style.textAlign).toBe('match-parent')
        expect(style.cssText).toBe('text-align: match-parent;')

        // justify-all
        style.textAlign = 'justify-all'
        longhands.forEach(longhand => expect(style[longhand]).toBe('justify'))
        expect(style.textAlign).toBe('justify-all')
        expect(style.cssText).toBe('text-align: justify-all;')

        // <string>
        style.textAlign = '"1"'
        expect(style.textAlignAll).toBe('"1"')
        expect(style.textAlignLast).toBe('auto')
        expect(style.textAlign).toBe('"1"')
        expect(style.cssText).toBe('text-align: "1";')
        style.textAlign = '"12"'
        expect(style.textAlign).toBe('"1"')
    })
    it('serializes a shorthand value from the declarations of its longhands', () => {

        const style = createStyleBlock()

        // Initial longhand values
        longhands.forEach(longhand => style[longhand] = initial(longhand))
        expect(style.textAlign).toBe('start')
        expect(style.cssText).toBe('text-align: start;')
    })
})
describe('text-emphasis', () => {

    const longhands = shorthands.get('text-emphasis')

    it('parses longhand declarations from a shorthand value', () => {

        const style = createStyleBlock()

        // Initial longhand values
        style.textEmphasis = 'none currentcolor'
        expect(style).toHaveLength(longhands.length)
        longhands.forEach(longhand => expect(style[longhand]).toBe(initial(longhand)))
        expect(style.textEmphasis).toBe('none')
        expect(style.cssText).toBe('text-emphasis: none;')

        // Missing longhand values
        style.textEmphasis = 'none'
        longhands.forEach(longhand => expect(style[longhand]).toBe(initial(longhand)))
        expect(style.textEmphasis).toBe('none')
        expect(style.cssText).toBe('text-emphasis: none;')
    })
    it('serializes a shorthand value from the declarations of its longhands', () => {

        const style = createStyleBlock()

        // Initial longhand values
        longhands.forEach(longhand => style[longhand] = initial(longhand))
        expect(style.textEmphasis).toBe('none')
        expect(style.cssText).toBe('text-emphasis: none;')
    })
})
describe('text-decoration', () => {

    const longhands = shorthands.get('text-decoration')

    it('parses longhand declarations from a shorthand value', () => {

        const style = createStyleBlock()

        // Initial longhand values
        style.textDecoration = 'none auto solid currentcolor'
        expect(style).toHaveLength(longhands.length)
        longhands.forEach(longhand => expect(style[longhand]).toBe(initial(longhand)))
        expect(style.textDecoration).toBe('none')
        expect(style.cssText).toBe('text-decoration: none;')

        // Missing longhand values
        style.textDecoration = 'none'
        longhands.forEach(longhand => expect(style[longhand]).toBe(initial(longhand)))
        expect(style.textDecoration).toBe('none')
        expect(style.cssText).toBe('text-decoration: none;')
    })
    it('serializes a shorthand value from the declarations of its longhands', () => {

        const style = createStyleBlock()

        // Initial longhand values
        longhands.forEach(longhand => style[longhand] = initial(longhand))
        expect(style.textDecoration).toBe('none')
        expect(style.cssText).toBe('text-decoration: none;')
    })
})
describe('text-decoration-skip', () => {
    it.todo('parses longhand declarations from a shorthand value')
    it.todo('serializes a shorthand value from the declarations of its longhands')
})
describe('text-spacing', () => {

    const longhands = shorthands.get('text-spacing')

    it('parses longhand declarations from a shorthand value', () => {

        const style = createStyleBlock()

        // Initial longhand values (not all longhands can be explicitly declared)
        style.textSpacing = 'normal'
        expect(style).toHaveLength(longhands.length)
        longhands.forEach(longhand => expect(style[longhand]).toBe(initial(longhand)))
        expect(style.textSpacing).toBe('normal')
        expect(style.cssText).toBe('text-spacing: normal;')

        // none
        style.textSpacing = 'none'
        expect(style.textAutospace).toBe('no-autospace')
        expect(style.textSpacingTrim).toBe('space-all')
        expect(style.textSpacing).toBe('none')
        expect(style.cssText).toBe('text-spacing: none;')

        // auto
        style.textSpacing = 'auto'
        expect(style.textAutospace).toBe('auto')
        expect(style.textSpacingTrim).toBe('auto')
        expect(style.textSpacing).toBe('auto')
        expect(style.cssText).toBe('text-spacing: auto;')
    })
    it('serializes a shorthand value from the declarations of its longhands', () => {

        const style = createStyleBlock()

        // Initial longhand values
        longhands.forEach(longhand => style[longhand] = initial(longhand))
        expect(style.textSpacing).toBe('normal')
        expect(style.cssText).toBe('text-spacing: normal;')
    })
})
describe('text-wrap', () => {

    const longhands = shorthands.get('text-wrap')

    it('parses longhand declarations from a shorthand value', () => {

        const style = createStyleBlock()

        // Initial longhand values
        style.textWrap = 'wrap auto'
        expect(style).toHaveLength(longhands.length)
        longhands.forEach(longhand => expect(style[longhand]).toBe(initial(longhand)))
        expect(style.textWrap).toBe('wrap')
        expect(style.cssText).toBe('text-wrap: wrap;')

        // Missing longhand values
        style.textWrap = 'wrap'
        longhands.forEach(longhand => expect(style[longhand]).toBe(initial(longhand)))
        expect(style.textWrap).toBe('wrap')
        expect(style.cssText).toBe('text-wrap: wrap;')
    })
    it('serializes a shorthand value from the declarations of its longhands', () => {

        const style = createStyleBlock()

        // Initial longhand values
        longhands.forEach(longhand => style[longhand] = initial(longhand))
        expect(style.textWrap).toBe('wrap')
        expect(style.cssText).toBe('text-wrap: wrap;')
    })
})
describe('transition', () => {

    const longhands = shorthands.get('transition')

    it('parses longhand declarations from a shorthand value', () => {

        const style = createStyleBlock()
        const transition = '0s ease 0s all'

        // Initial longhand values
        style.transition = transition
        expect(style).toHaveLength(longhands.length)
        longhands.forEach(longhand => expect(style[longhand]).toBe(initial(longhand)))
        expect(style.transition).toBe('0s')
        expect(style.cssText).toBe('transition: 0s;')

        // Missing longhand values
        style.transition = '0s'
        longhands.forEach(longhand => expect(style[longhand]).toBe(initial(longhand)))
        expect(style.transition).toBe('0s')
        expect(style.cssText).toBe('transition: 0s;')

        // Repeated longhand values
        style.transition = `${transition}, ${transition}`
        longhands.forEach(longhand => expect(style[longhand]).toBe(`${initial(longhand)}, ${initial(longhand)}`))
        expect(style.transition).toBe('0s, 0s')
        expect(style.cssText).toBe('transition: 0s, 0s;')
    })
    it('serializes a shorthand value from the declarations of its longhands', () => {

        const style = createStyleBlock()

        // Initial longhand values
        longhands.forEach(longhand => style[longhand] = initial(longhand))
        expect(style.transition).toBe('0s')
        expect(style.cssText).toBe('transition: 0s;')

        // Different lengths of longhand values
        style.transitionProperty = 'none, none'
        expect(style.transition).toBe('')
        expect(style.cssText).toBe('transition-duration: 0s; transition-timing-function: ease; transition-delay: 0s; transition-behavior: normal; transition-property: none, none;')
    })
})
describe('vertical-align', () => {

    const longhands = shorthands.get('vertical-align')

    it('parses longhand declarations from a shorthand value', () => {

        const style = createStyleBlock()

        // Initial longhand values (not all longhands can be explicitly declared)
        style.verticalAlign = 'baseline 0'
        expect(style).toHaveLength(longhands.length)
        longhands.forEach(longhand => expect(style[longhand]).toBe(initial(longhand)))
        expect(style.verticalAlign).toBe('baseline')
        expect(style.cssText).toBe('vertical-align: baseline;')

        // Missing longhand values
        style.verticalAlign = 'baseline'
        longhands.forEach(longhand => expect(style[longhand]).toBe(initial(longhand)))
        expect(style.verticalAlign).toBe('baseline')
        expect(style.cssText).toBe('vertical-align: baseline;')
    })
    it('serializes a shorthand value from the declarations of its longhands', () => {

        const style = createStyleBlock()

        // Initial longhand values
        longhands.forEach(longhand => style[longhand] = initial(longhand))
        expect(style.verticalAlign).toBe('baseline')
        expect(style.cssText).toBe('vertical-align: baseline;')
    })
})
describe('view-timeline', () => {

    const longhands = shorthands.get('view-timeline')

    it('parses longhand declarations from a shorthand value', () => {

        const style = createStyleBlock()
        const timeline = 'none block auto'

        // Initial longhand values
        style.viewTimeline = timeline
        expect(style).toHaveLength(longhands.length)
        longhands.forEach(longhand => expect(style[longhand]).toBe(initial(longhand)))
        expect(style.viewTimeline).toBe('none')
        expect(style.cssText).toBe('view-timeline: none;')

        // Missing longhand values
        style.viewTimeline = 'none'
        longhands.forEach(longhand => expect(style[longhand]).toBe(initial(longhand)))
        expect(style.viewTimeline).toBe('none')
        expect(style.cssText).toBe('view-timeline: none;')

        // Repeated longhand values
        style.viewTimeline = `${timeline}, ${timeline}`
        longhands.forEach(longhand => expect(style[longhand]).toBe(`${initial(longhand)}, ${initial(longhand)}`))
        expect(style.viewTimeline).toBe('none, none')
        expect(style.cssText).toBe('view-timeline: none, none;')
    })
    it('serializes a shorthand value from the declarations of its longhands', () => {

        const style = createStyleBlock()

        // Initial longhand values
        longhands.forEach(longhand => style[longhand] = initial(longhand))
        expect(style.viewTimeline).toBe('none')
        expect(style.cssText).toBe('view-timeline: none;')

        // Different lengths of longhand values
        style.viewTimelineName = 'none, none'
        expect(style.viewTimeline).toBe('')
        expect(style.cssText).toBe('view-timeline-name: none, none; view-timeline-axis: block; view-timeline-inset: auto;')
    })
})
describe('white-space', () => {

    const longhands = shorthands.get('white-space')

    it('parses longhand declarations from a shorthand value', () => {

        const style = createStyleBlock()

        // Initial longhand values
        style.whiteSpace = 'collapse wrap none'
        expect(style).toHaveLength(longhands.length)
        longhands.forEach(longhand => expect(style[longhand]).toBe(initial(longhand)))
        expect(style.whiteSpace).toBe('normal')
        expect(style.cssText).toBe('white-space: normal;')

        // Missing longhand values
        style.whiteSpace = 'collapse'
        expect(style).toHaveLength(longhands.length)
        longhands.forEach(longhand => expect(style[longhand]).toBe(initial(longhand)))
        expect(style.whiteSpace).toBe('normal')
        expect(style.cssText).toBe('white-space: normal;')

        // normal, pre, pre-line, pre-wrap
        whiteSpace.forEach((mapping, keyword) => {
            style.whiteSpace = keyword
            longhands.forEach((longhand, index) => expect(style[longhand]).toBe(mapping[index].value))
            expect(style.whiteSpace).toBe(keyword)
            expect(style.cssText).toBe(`white-space: ${keyword};`)
        })
    })
    it('serializes a shorthand value from the declarations of its longhands', () => {

        const style = createStyleBlock()

        // Initial longhand values
        longhands.forEach(longhand => style[longhand] = initial(longhand))
        expect(style.whiteSpace).toBe('normal')
        expect(style.cssText).toBe('white-space: normal;')
    })
})
