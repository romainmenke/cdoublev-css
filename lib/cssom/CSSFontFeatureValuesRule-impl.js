
const { serializeCSSComponentValueList, serializeCSSValue } = require('../serialize.js')
const CSSFontFeatureValuesMap = require('./CSSFontFeatureValuesMap.js')
const { implementation: CSSRuleImpl } = require('./CSSRule-impl.js')
const { cssPropertyToIDLAttribute } = require('../utils/string.js')
const root = require('../rules/definitions.js')

const features = root.rules.find(rule => rule.name === '@font-feature-values').value.rules

/**
 * @see {@link https://drafts.csswg.org/css-fonts-4/#cssfontfeaturevaluesrule}
 */
class CSSFontFeatureValuesRuleImpl extends CSSRuleImpl {

    /**
     * @param {DocumentOrShadowRoot} globalObject
     * @param {*[]} args
     * @param {object} privateData
     */
    constructor(globalObject, args, privateData) {
        super(globalObject, args, privateData)
        const { prelude, value: { declarations, rules } } = privateData
        this.fontFamily = serializeCSSComponentValueList(prelude)
        declarations.forEach(declaration =>
            this[cssPropertyToIDLAttribute(declaration.name)] = serializeCSSValue(declaration))
        features.forEach(({ name, value }) => {
            name = name.slice(1)
            const rule = rules.find(rule => rule.name === name)
            const definition = value.descriptors['*']
            const entries = rule?.value.declarations.map(({ name, value }) =>
                [name, Array.isArray(value) ? [...value.map(component => component.value)] : [value.value]]) ?? []
            const map = CSSFontFeatureValuesMap.createImpl(globalObject, args, { definition, entries })
            this[cssPropertyToIDLAttribute(name)] = map
        })
    }

    /**
     * @returns {string}
     * @see {@link https://drafts.csswg.org/cssom-1/#dom-cssrule-csstext}
     */
    get cssText() {
        const { fontDisplay, fontFamily } = this
        const statements = []
        if (fontDisplay) {
            statements.push(`font-display: ${fontDisplay};`)
        }
        features.forEach(({ name }) => {
            const { _map } = this[cssPropertyToIDLAttribute(name.slice(1))]
            if (0 < _map.size) {
                const declarations = []
                _map.forEach((value, key) => declarations.push(`${key}: ${value.join(' ')}`))
                statements.push(`${name} { ${declarations.join(';')}; }`)
            }
        })
        if (statements.length === 0) {
            return `@font-feature-values ${fontFamily} {}`
        }
        return `@font-feature-values ${fontFamily} { ${statements.join(' ')} }`
    }
}

module.exports = {
    implementation: CSSFontFeatureValuesRuleImpl,
}
