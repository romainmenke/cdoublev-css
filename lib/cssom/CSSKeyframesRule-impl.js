
const { createCSSRule, insertCSSRule, removeCSSRule } = require('../parse/syntax.js')
const { implementation: CSSRuleImpl } = require('./CSSRule-impl.js')
const CSSRuleList = require('./CSSRuleList.js')

/**
 * @see {@link https://drafts.csswg.org/css-animations-1/#csskeyframesrule}
 */
class KeyframesImpl extends CSSRuleImpl {

    /**
     * @param {DocumentOrShadowRoot} globalObject
     * @param {*[]} args
     * @param {object} privateData
     */
    constructor(globalObject, args, privateData) {
        super(globalObject, args, privateData)
        const { prelude: { value: name }, value } = privateData
        this._rules = value.map(rule => createCSSRule(rule, this))
        this.cssRules = CSSRuleList.create(globalObject, undefined, { rules: this._rules })
        this.name = name
    }

    /**
     * @param {string} rule
     * @see {@link https://drafts.csswg.org/css-animations-1/#dom-csskeyframesrule-appendrule}
     */
    appendRule(rule) {
        // TODO: fix https://github.com/w3c/csswg-drafts/issues/6972
        insertCSSRule(this._rules, rule, this._rules.length, this)
    }

    /**
     * @param {string} select
     * @see {@link https://drafts.csswg.org/css-animations-1/#dom-csskeyframesrule-deleterule}
     */
    deleteRule(select) {
        select = this._normalizeSelect(select)
        const index = this._rules.findIndex(({ keyText }) => keyText === select)
        if (-1 < index) {
            removeCSSRule(this._rules, index)
        }
    }

    /**
     * @param {string} selector
     * @see {@link https://drafts.csswg.org/css-animations-1/#dom-csskeyframesrule-findrule}
     */
    findRule(select) {
        select = this._normalizeSelect(select)
        return this._rules.find(({ keyText }) => keyText === select)
    }

    _normalizeSelect(select) {
        return select.split(/\s*,\s*/).join(', ')
    }
}

module.exports = {
    implementation: KeyframesImpl,
}