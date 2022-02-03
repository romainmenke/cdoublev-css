
# Parsing CSS

A CSS input can have different sources: the content of a style sheet referenced by `HTMLLinkElement.href` or an HTTP `Link` header, the inner content of `HTMLStyleElement`, `Element.style`, `Element.querySelector()`, `CSSStyleSheet.insertRule()`, etc.

This document explains how a CSS input is parsed in this library, by looking first at `Element.style` as the entry point. Narrowing the type of input to a list of CSS declarations will help to understand the CSS parsing model and parsing CSS at a higher level: a rule and a style sheet.

Some words may use the [CSS value definition syntax](./value-definition.md), eg. `<foo>`, which represents an input matching a production named `foo` in the CSS grammar, defined in the very first section of this document.

### The CSS grammar

The CSS grammar is a set of rules to transform a byte stream or a stream of code points (string) into a structure representing this CSS input: a `CSSStyleSheet` (aka. CSSOM tree), a `CSSStyleDeclaration`, or a list of component values.

The byte stream is transformed into code points, then into tokens, then into objects representing rules, declarations, and component values, first by applying basic syntax rules, then rules and declarations are validated against context rules (defined by the parent rule or style sheet), and declaration values are matched against the production of the declaration property.

Below is a (incomplete) hierarchical representation of these different values:

  - `<stylesheet>`: `<rule-list>`
  - rule
    - qualified rule
      - prelude + block
    - at-rule
      - prelude + ';'
      - prelude + block
  - rule's block
    - `<stylesheet>`
    - `<rule-list>`
    - `<style-block>`
    - `<declaration-list>`
  - `<declaration>`: `<ident>: <declaration-value>`
  - prelude, `<declaration-value>`: component values

The CSS rules, qualified and at-rules, can not be represented with the CSS value definition syntax in a non-trivial way. Below is a limited representation (some productions are not defined in any CSS specification):

  - `<stylesheet> = <rule-list>`
  - `<rule-list> = [<qualified-rule> | <at-rule>]*`
  - `<qualified-rule> = <style-rule> | <at-rule-child-qualified-rule>`
  - `<style-rule> = <selector-list> { <style-block> }`
  - `<at-rule> = <statement-at-rule> | <block-at-rule>`
  - `<statement-at-rule> = <at-keyword> <rule-specific-prelude>;`
  - `<block-at-rule> = <at-keyword> <rule-specific-prelude>? { <rule-specific-block> }`

Below are the principles of the context rules:

  - `<stylesheet>` accepts all rules excluding those defined by the parent rule (context)
  - `<rule-list>` only accepts rules defined by the context (*if a given context is only intended to accept at-rules [..., ie. excluding qualified rules and declarations, `<rule-list>`] is preferred for its more straightforward name*)
  - a qualified rule at the top-level of `<stylesheet>` is a style rule
  - a qualified rule always accepts `<declaration>`s and a style rule accepts `<style-block>`
  - `<style-block>` accepts `<declaration>`s, style rules (whose selectors start with `&`), `@nest`, and `@media`
  - `<declaration-list>` only accepts `<declaration>`s whose property is defined by the context, and (for back-compatibility with CSS2) at-rules defined by the context

To sum up, the content of an at-rule (`<stylesheet>`, `<rule-list>`, or `<declaration-list>`) depends on its context, eg.:

  - `@media` accepts `<stylesheet>` excluding non top-level rules
  - `@keyframes` accepts `<rule-list>` limited to qualified rules matching `<keyframe-selector># { <declaration-list> }`, where `<declaration-list>` excludes at-rules
  - `@font-feature-values` accepts `<declaration-list>` limited to `font-display` for its declaration property and to at-rules matching `<font-feature-value-type>`

## `Element.style`

`Element.style` is an instance of [`CSSStyleDeclaration`](https://drafts.csswg.org/cssom/#the-cssstyledeclaration-interface) representing a list of *CSS declaration*. A `<declaration>` is a `:` separated property name and value optionally suffixed with `!important`.

It is also named a *CSS declaration block* in CSSOM, but a block implies the presence of the *associated tokens* wrapping its content, while `Element.style` has none. To be precise, `CSSStyleDeclaration` is a CSS declaration block's content.

`CSSStyleDeclaration` can not represent multiple declarations for the same property: it represents a single *declared value* for the property. `Element.style`, and multiple `CSSRule.style` at different locations, can have different declared values for the property applying on `Element`. The cascade computes a single specified value from these declared values.

- *authored value*: the input value used to set the property
- [declared value](https://drafts.csswg.org/css-cascade-5/#declared): *each property declaration applied to an element contributes a declared value for that property*
- [cascaded value](https://drafts.csswg.org/css-cascade-5/#cascaded): *the declared value that wins the cascade*
- [specified value](https://drafts.csswg.org/css-cascade-5/#specified): *the result of putting the cascaded value through the defaulting processes*
- [resolved value](https://drafts.csswg.org/cssom/#resolved-values): returned by `window.getComputedStyle()`
- [computed value](https://drafts.csswg.org/css-cascade-5/#computed): *the result of resolving the specified value as defined in the “Computed Value” line of the property definition table*
- [used value](https://drafts.csswg.org/css-cascade-5/#used): *the result of taking the computed value and completing any remaining calculations to make it the absolute theoretical value*
- [actual value](https://drafts.csswg.org/css-cascade-5/#actual): *the used value after any such [user agent dependent] adjustments have been made*, displayed by user agent tools when inspecting styles

[`Element.style.getPropertyValue(property)`](https://drafts.csswg.org/cssom/#dom-cssstyledeclaration-getpropertyvalue) should return the serialization of the [CSS declaration](https://drafts.csswg.org/cssom/#css-declaration) value stored in `Element.style` for `property`.

> A CSS declaration is an abstract concept that is not exposed as an object in the DOM. A CSS declaration has the following associated properties:
>
> - **property name:** the property name of the declaration
> - **value:** the value of the declaration represented as a list of component values
> - **important flag:** either set or unset, can be changed

[Component value](https://drafts.csswg.org/css-syntax-3/#component-value):

> A component value is one of the preserved tokens, a function, or a simple block.

[`Element.style.setProperty(property, value)`](https://drafts.csswg.org/cssom/#dom-cssstyledeclaration-setproperty) should store the CSS declaration(s) in `Element.style` for the `property` (or its longhands) given as its first argument (step 8 or 9). The CSS declaration value is the list of component values resulting from *parse as a CSS value* with the input string `value` given as its second argument (step 5).

Reading *parse as a CSS value* and subjacent procedures from CSSOM and Syntax, the CSS declaration value is a list of component values that should be nearly identical to the list of tokens resulting from normalizing (tokenizing) the input string `value`:

- [parse a CSS value](https://drafts.csswg.org/cssom/#parse-a-css-value):
  > 1. Let `list` be the value returned by invoking **parse a list of component values** from `value`.
  > 2. Match `list` against the grammar for the property `property` in the CSS specification.
  > 3. If the above step failed, return `null`.
  > 4. Return `list`.
- [parse a list of component values](https://drafts.csswg.org/css-syntax-3/#parse-a-list-of-component-values):
  > 1. **Normalize `input`**, and set `input` to the result.
  > 2. Repeatedly consume a component value from `input` until an `<EOF-token>` is returned, appending the returned values (except the final `<EOF-token>`) into a list. Return the list.
- [normalize into a token stream](https://drafts.csswg.org/css-syntax-3/#normalize-into-a-token-stream):
  > - If `input` is a list of CSS tokens, return `input`.
  > - If `input` is a list of CSS component values, return `input`.
  > - If `input` is a string, then filter code points from `input`, tokenize the result, and return the final result.
  >
  >   Note: The only difference between a list of tokens and a list of component values is that some objects that "contain" things, like functions or blocks, are a single entity in the component-value list, but are multiple entities in a token list. This makes no difference to any of the algorithms in this specification.

These *functions or blocks* objects are assigned tokens when parsing a list of component values (step 2, repeatedly [consume a component value](https://drafts.csswg.org/css-syntax-3/#consume-a-component-value)):

> Consume the next input token.
>
> If the current input token is a `<{-token>`, `<[-token>`, or `<(-token>`, consume a simple block and return it.
>
> Otherwise, if the current input token is a `<function-token>`, **consume a function** and return it.
>
> Otherwise, return the current input token.

Therefore, to match a property defined with `rgb()`, the list of component values should include a single component value that is a function token whose `name` is `rgb` and whose `value` is a list of component values representing its arguments:

> To consume a function:
>
> Create a function with its name equal to the value of the current input token and with its value initially set to an empty list. [...]

A CSS declaration can not have a shorthand property name, and step 8 of the procedure for `Element.style.setProperty(property, value)` is rather nebulous about its responsibility on [expanding shorthand to longhands declarations](https://drafts.csswg.org/cssom/#concept-declarations-specified-order):

> 8. If `property` is a shorthand property, then for each longhand property `longhand` that `property` maps to, in canonical order, follow these substeps:
>   1. Let `longhand result` be the result of set the CSS declaration `longhand` with the appropriate value(s) from `component value list`, with the `important` flag set if `priority` is not the empty string, and unset otherwise, and with the list of declarations being the declarations.

From [this issue of the W3C Github repository](https://github.com/w3c/csswg-drafts/issues/6451):

> Shorthand expansion is not done in "parse a CSS value", it happens in [the above step].

Shorthand expansion is the result of sorting declarations in [specified order](https://drafts.csswg.org/cssom/#concept-declarations-specified-order):

> The **specified order** for declarations is the same as specified, but with shorthand properties expanded into their longhand properties, in canonical order. If a property is specified more than once (after shorthand expansion), only the one with greatest cascading order must be represented, at the same relative position as it was specified.

## Side effects and idempotence

The previous section raises a fundamental question about the result returned from *match `list` against the grammar for the property `property` in the CSS specification* in *parse a CSS value*, or from *parsing `declaration` according to the appropriate CSS specifications, dropping parts that are said to be ignored* in parse a CSS declaration block: should it be a simple boolean or a transformed/mutated list?

Note: matching against the grammar for the `property` is not defined but it means matching against its value definition and any optional specific rules defined in the specification for the property.

*Parse a CSS value* do not require to replace (or mutate) the list of component values, and [*serialize a CSS value*](https://drafts.csswg.org/cssom/#serialize-a-css-value) only enforces idempotence, ie. `assert.deepStrictEqual(parse(list), parse(serialize(parse(list))))`:

> Represent the value of the declaration as a list of CSS component values components that, when parsed according to the property’s grammar, would represent that value. Additionally:
>
> - If certain component values can appear in any order without changing the meaning of the value (a pattern typically represented by a double bar `||` in the value syntax), reorder the component values to use the canonical order of component values as given in the property definition table.
> - If component values can be omitted or replaced with a shorter representation without changing the meaning of the value, omit/replace them.
> - If either of the above syntactic translations would be less backwards-compatible, do not perform them.
>
> Note: The rules described here outlines the general principles of serialization. For legacy reasons, some properties serialize in a different manner, which is intentionally undefined here due to lack of resources. Please consult your local reverse-engineer for details.

But some properties and productions have specific parsing and serializing rules:

- `<length>` *can be syntactically represented as the `<number>` `0`* and the serialized value should be `0px`
- for `background-position`, *if only one value is specified, the second value is assumed to be `center`*
- for `background`, *if one `<box>` value is present then it sets both `background-origin` and `background-clip` to that value*, otherwise both are set to their initial value: `border-box`
- for `margin`, if `margin-right`, `margin-bottom`, or `margin-left` are omitted, they *are set to* the component value of `margin-top` or `margin-right`, and `margin` serializes to the shorthest representation
- for `flex`, *`none` expands to `0 0 auto`* (which are not the initial longhand values)
- `border` should reset `border-image` (which is not a longhand of `border`) to its initial value
- etc

When matching the grammar of a property, replacing (or mutating) the list of component values is neither required nor prohibited but it seems hard or even impossible not to do so: returning `0` from `getPropertyValue('flex-grow')` after running `setProperty('flex', 'none')` is impossible if the result of matching `none` against the grammar for `flex` is not replaced by a result equivalent to parsing `0 0 auto` at a point.

Furthermore, it is not defined how component value(s) can be associated to the matching production(s), some of which have specific serialization rules. Identifying *the appropriate value(s) from `component value list`* to set the CSS declaration of each longhand of a shorthand, and *reorder[ing] the component values to use the canonical order of component values as given in the property definition table*, are similar challenges.

Note: when matching a longhand property, Chrome returns a component value or a list of component values and when matching a shorthand property, it returns a boolean and sets its longhands in a map that can be read later using its parser interface.

```c++
// https://source.chromium.org/chromium/chromium/src/+/master:third_party/blink/renderer/core/css/properties/longhands/longhands_custom.cc;l=395
const CSSValue* AspectRatio::ParseSingleValue(/*...*/) const {

  CSSValue* auto_value = nullptr;
  if (range.Peek().Id() == CSSValueID::kAuto)
    auto_value = css_parsing_utils::ConsumeIdent(range);

  if (range.AtEnd())
    return auto_value;

  CSSValue* width = css_parsing_utils::ConsumeNumber(range, context, kValueRangeNonNegative);
  if (!width)
    return nullptr;

  CSSValue* height = nullptr;
  if (css_parsing_utils::ConsumeSlashIncludingWhitespace(range)) {
    height = css_parsing_utils::ConsumeNumber(range, context, kValueRangeNonNegative);
    if (!height)
      return nullptr;
  } else {
    height = CSSNumericLiteralValue::Create(1.0f, CSSPrimitiveValue::UnitType::kNumber);
  }

  CSSValueList* ratio_list = CSSValueList::CreateSlashSeparated();
  ratio_list->Append(*width);
  if (height)
    ratio_list->Append(*height);

  if (!range.AtEnd()) {
    if (auto_value)
      return nullptr;
    if (range.Peek().Id() != CSSValueID::kAuto)
      return nullptr;
    auto_value = css_parsing_utils::ConsumeIdent(range);
  }

  CSSValueList* list = CSSValueList::CreateSpaceSeparated();
  if (auto_value)
    list->Append(*auto_value);

  list->Append(*ratio_list);

  return list;
}
```

```c++
// https://source.chromium.org/chromium/chromium/src/+/master:third_party/blink/renderer/core/css/properties/shorthands/shorthands_custom.cc;l=910
bool Flex::ParseShorthand(/*...*/) const {

  if (range.Peek().Id() == CSSValueID::kNone) {
    flex_grow = 0;
    flex_shrink = 0;
    flex_basis = CSSIdentifierValue::Create(CSSValueID::kAuto);
    range.ConsumeIncludingWhitespace();
  } else {
    // ...
  }

  if (!range.AtEnd())
    return false;

  css_parsing_utils::AddProperty(
    CSSPropertyID::kFlexGrow,
    CSSPropertyID::kFlex,
    *CSSNumericLiteralValue::Create(clampTo<float>(flex_grow), CSSPrimitiveValue::UnitType::kNumber),
    important,
    css_parsing_utils::IsImplicitProperty::kNotImplicit,
    properties);

  css_parsing_utils::AddProperty(
    CSSPropertyID::kFlexShrink,
    CSSPropertyID::kFlex,
    *CSSNumericLiteralValue::Create(clampTo<float>(flex_shrink), CSSPrimitiveValue::UnitType::kNumber),
    important,
    css_parsing_utils::IsImplicitProperty::kNotImplicit,
    properties);

  css_parsing_utils::AddProperty(
    CSSPropertyID::kFlexBasis,
    CSSPropertyID::kFlex,
    *flex_basis,
    important,
    css_parsing_utils::IsImplicitProperty::kNotImplicit,
    properties);

  return true;
}
```

To overcome these challenges, this library defines the following requirements:

- a component value is implemented as an object¹ with a `type` property as a `Set` filled² with the matching production(s)
- the input list of component values is replaced by the result of matching this list against the grammar for a property³, in which component values are automatically sorted by their position in the value definition
- specific rules for the property or production are matched in functions (hooks) run after matching against the production, to discard a value breaking a specific rule, to add or remove default component values⁴, or to replace² special meaning keywords by other component value(s)
- an omitted value⁵ is represented in the resulting list as a component-like data structure

¹ Delimiters are tokenized as strings then parsed to objects while matching a production: this makes consuming whitespaces easier, but it is an implementation detail that may change later.

² Mutations on the input list would be problematic when backtracking to match an alternative grammar, but replacing component values takes place on a new list, and the production(s) matched by component value(s) should remain valid even after failing to match a grammar at a later point.

-> TODO: fix productions assigned before backtracking (the previous point is not true in some rare cases)

³ Therefore the input list of component values can be parsed into a single component value, deviating from *parse a CSS value*, but *serialize a CSS value* somewhat handles it with *represent the value of the [single] declaration as a list*, and it is an implementation detail that may change later.

⁴ When the value is for a longhand property, and no specific serialization rules prevents it, default values are removed once at parse time instead of at serialization time, to improve performances.

⁵ Omitted values exist in production value definitions containing the multiplier `?`, `*`, or `{0,n}`, or `||` separated productions.

Learn more about the [data structure used to represent a CSS value](./value-data-structure/README.md).

## Parse a style sheet

### Overview

> 3. Tokenizing and Parsing CSS
>
> User agents must use the parsing rules described in this specification to generate the CSSOM trees from text/css resources. Together, these rules define what is referred to as the CSS parser.
>
> [...]
>
> 3.1. Overview of the Parsing Model
>
> The input to the CSS parsing process consists of a stream of Unicode code points, which is passed through a tokenization stage followed by a tree construction stage. The output is a `CSSStyleSheet` object.
>
> [...]
>
> 5. Parsing
>
> The input to the parsing stage is a stream or list of tokens from the tokenization stage. The output depends on how the parser is invoked, as defined by the entry points listed later in this section. The parser output can consist of at-rules, qualified rules, and/or declarations.
>
> The parser’s output is constructed according to the fundamental syntax of CSS, without regards for the validity of any specific item. Implementations may check the validity of items as they are returned by the various parser algorithms and treat the algorithm as returning nothing if the item was invalid according to the implementation’s own grammar knowledge, or may construct a full tree as specified and "clean up" afterwards by removing any invalid items.

```
Input -> Tokenization -> Syntax -> Context and production rules -> CSSOM tree
```

Parsing a style sheet with the corresponding procedures from Syntax is limited to applying syntax rules to get objects representing rules: preludes are not validated according to the production for the rule, declarations and rules nested in rule's blocks are not validated according to the parent rule. Also, it is shallow: this nested rule's content is left unparsed as a list of component values.

This means that these procedures should run recursively from the top to bottom level of the contents of a style sheet, that each level should be validated against the corresponding rules, and that the corresponding CSSOM tree should be constructed either in parallel, by wrapping these procedures in other procedures, or with a second traversal, eg. to avoid constructing then remove a `CSSImportRule` that would be invalid because it is preceding `@charset`.

Note: ignoring `@import` preceding `@charset`, and `@namespace` preceding `@charset` or `@import`, seems to be the only two rules that require to look forward the next items, noting that `@charset` is not very usefull (and is not even defined with a `CSSRule` subclass) as well as `@namespace`, which is only required for XML documents.

Note about constructing the CSSOM tree in parallel vs. with a second traversal:
  - the first option forces to run the entry point then `CSSStyleSheet.create()` with its result
  - the second option presents a difference between `CSSStyleSheet` and `CSSRule`, which could be considered as a discordance: a `CSSStyleSheet` validates its content when it is created, and is created even if its content is invalid, while `CSSRule` subclasses get their content validated before their creation, in the constructor of `CSSStyleSheet` or the parent `CSSRule` subclass (as well as in *insert a CSS rule*, run by eg. `CSSStyleSheet.insertRule()`). But a `CSSStyleSheet` is a list of rules, not a rule, therefore this difference is legit: a parent rule (or the style sheet) should validate its content.

### Parsing the basic syntax

> *Parse something according to a CSS grammar*, and *parse a comma-separated list according to a CSS grammar*, are usually the only parsing algorithms other specs will want to call. The remaining parsing algorithms are meant mostly for CSSOM and related "explicitly constructing CSS structures" cases.

Because *parse something according to a CSS grammar* runs *parse a list of component values*, it can not be used to parse an input that is already an object resulting from other procedures: there would be no such things as a stream of tokens as its input, and it could return unexpected results.

[Related issue](https://github.com/w3c/csswg-drafts/issues/4927#issuecomment-1012127022): *parse a comma separated list according to a CSS grammar* runs *consume a component value* twice but there will be no such thing as a current/next input **token** on the second run when it is a function or block **component value**, and because `<function-token>` is assimilated as `<function>` in this library, an error would occur.

TODO: figure out the productions that can match a function in a rule's prelude or block.

Below could be a partial answer to the above issue, but what does *makes no difference* mean exactly?

> The only difference between a list of tokens and a list of component values is that some objects that "contain" things, like functions or blocks, are a single entity in the component-value list, but are multiple entities in a token list. This makes no difference to any of the algorithms in this specification.

The other procedures are meant to transform a string or(/into) a stream of tokens (then) into a high-level CSS object, or a list of high-level CSS objects:

| Procedure                          | Input
| ---------------------------------- | ----------------------------------------------------------------------------------
| *Parse a stylesheet*               | Content of a style sheet and (non-nested) `@media`
| *Parse a style block's contents*   | Content of a style rule, `@nest`, and `@media` nested in style rule
| *Parse a list of rules*            | Content of `@media`, `@keyframes`, etc
| *Parse a list of declarations*     | Content of a qualified rule nested in `@keyframes`, value set on `Element.style`, etc
| *Parse a rule*                     | Argument of `<interface>.insertRule()`
| *Parse a declaration*              | Content of `supports()`, `<supports-decl>` in `@supports`, etc
| *Parse a list of component values* | `<selector-list>` in style rule, `<media-query-list>` in `@media`, etc
| *Parse a component value*          | Content of `attr()`

Issues in *Examples* of [`<declaration-list>`, `<rule-list>`, and `<stylesheet>`](https://drafts.csswg.org/css-syntax-3/#declaration-rule-list):
  - `@font` (`@font-face`?) is listed as an example for `<declaration-list>` but it does not exist
  - `@font-feature-values` is listed as an example for `<rule-list>` but it is defined as `@font-feature-values <family-name># { <declaration-list> }` with `font-display` as the only allowed property (descriptor)

| Procedure                          | Steps                                                         | Return type
| ---------------------------------- | ------------------------------------------------------------- | -----------
| *Parse a stylesheet*               | Normalize, consume a list of rules (top-level flag set)       | object
| *Parse a style block's contents*   | Normalize, consume a style block's content                    | array
| *Parse a list of rules*            | Normalize, consume a list of rules (top-level flag unset)     | array
| *Parse a list of declarations*     | Normalize, consume a list of declarations (and at-rule)       | array
| *Parse a rule*                     | Normalize, trim ws before/after, consume qualified/at-rule    | object
| *Parse a declaration*              | Normalize, trim ws before, consume ident, consume declaration | object
| *Parse a list of component values* | Normalize, map token to consume component value               | array
| *Parse a component value*          | Normalize, trim ws before/after, consume component value      | object

> - The `<style-block>` production [...] must be parsed using the *consume a style block’s contents* algorithm.
> - The `<declaration-list>` production [...] must be parsed using the *consume a list of declarations* algorithm.
> - Similarly, the `<rule-list>` production [...] must be parsed using the *consume a list of rules* algorithm.
> - Finally, the `<stylesheet>` production [...] is identical to `<rule-list>`, except that blocks using it default to accepting all rules that aren’t otherwise limited to a particular context.

Parsing `<stylesheet>` do not have a procedure explicitly defined but *consume a list of rules* is assumed. It should not be parsed with *parse a stylesheet*, which is only used to parse the content of a style sheet, because HTML comments should only be handled at the top-level of the style sheet, ie. when *consume a list of rules* is run with the top-level flag set, but not in eg. `@media`.

Because `location` is not required in the object resulting from *parse a stylesheet*, but only the rules assigned to its `value`, *parse a stylesheet* can be implemented with *parse a list of rules*, which would receive the `topLevel` flag set (default: unset), and pass it to *consume a list of rules*. This would allow to also parse `<stylesheet>` with it.
-> issue: it would be missing decoding a byte stream into a stream of code points, which is useless to parse `<stylesheet>`

### Validation against the context rules

> For rules that use `<style-block>` or `<declaration-list>`, the spec for the rule must define which properties, descriptors, and/or at-rules are valid inside the rule [...]. Any declarations or at-rules found inside the block that are not defined as valid must be removed from the rule’s value.
>
> Within a `<style-block>` or `<declaration-list>`, `!important` is automatically invalid on any descriptors. [...]
>
> For rules that use `<rule-list>`, the spec for the rule must define what types of rules are valid inside the rule, same as `<declaration-list>`, and unrecognized rules must similarly be removed from the rule’s value.
>
> For rules that use `<stylesheet>`, all rules are allowed by default, but the spec for the rule may define what types of rules are invalid inside the rule.
>
> The `<declaration-value>` production matches any sequence of one or more tokens, so long as the sequence does not contain `<bad-string-token>`, `<bad-url-token>`, unmatched `<)-token>`, `<]-token>`, or `<}-token>`, or top-level `<semicolon-token>` tokens or `<delim-token>` tokens with a value of "!". It represents the entirety of what a valid declaration can have as its value.
>
> The `<any-value>` production is identical to `<declaration-value>`, but also allows top-level `<semicolon-token>` tokens and `<delim-token>` tokens with a value of "!". It represents the entirety of what valid CSS can be in any context.

`<declaration-value>` is used in `<attr()>`, `<env()>`, `<paint()>`, `<var()>`, as the value of the `initial-value` descriptor of `@property`.

`<any-value>` is only used in `<supports-condition>` in the prelude of `@supports` and in `<selector-list>` in the prelude of some at-rules.

> A CSS processor is considered to support a declaration (consisting of a property and value) if it accepts that declaration (rather than discarding it as a parse error) within a style rule. If a processor does not implement, with a usable level of support, the value given, then it must not accept the declaration or claim support for it.

`<declaration>` is only used in `<supports-condition>`. It should contain a `<declaration-value>` validated according to the production of the declaration property (excluding the production of the CSS global keywords or `<var()>`), which means that `parseDeclaration()` should be used to parse the syntax of the declaration, and `parseCSSDeclaration()` (step 3 of `parseCSSDeclarationBlock()`, and step 3.1 is `parseCSSValue()`, also used in `CSSStyleDeclaration.setProperty()`) should validate the declaration value.

### Constructing the CSSOM tree

**Memos `webidl2js`:**

  - a wrapper class can not be instantiated when the `.webidl` do not define a `constructor()`, even if the implementation class implements a `constructor()`
  - an implemented property defined as `readonly` does not need to be private because it is read from a getter in the wrapper class, therefore all public properties of an implementation class are kind of private, noting that public properties are inherited while (true) private properties are not (and must be declared), and that some CSS interfaces have (private state) properties that should be inherited from a parent class
  - an instance of an implementation class (eg. created with `wrapper.createImpl()`) returned or received by an implemented method that is run from an instance of the wrapper class, will be converted to a wrapper instance, if this return or argument value is defined appropriately in the `.webidl`, ie. as a type that can be defined with Web IDL
  - a wrapper file can not be required at the top of the corresponding implementation file, eg. to implement a procedure to *create an object* of the corresponding interface, because the former requires the latter (circular dependency)
  - `wrapper.install()` should be run before `wrapper.create()` or `wrapper.createImpl()`
  - `wrapper.create()` is usefull to create an instance of a wrapper class when the `.webidl` does not define a `constructor()` or when an instance should be created with state values (`privateData`) that are different than when creating a constructed instance
  - `wrapper.createImpl()` is an alias for `wrapper.convert(wrapper.create())` and is usefull to write "private" properties of an instance of the implementation class from outside
  - `wrapper.convert()` converts a wrapper instance to an implementation instance

**What should be implemented for the procedures named *create a <interface> object*?**

Eg. *create a CSS style sheet* should initialize an instance of `CSSStyleSheet` with different properties and/or values than *create a constructed CSSStyleSheet*. Because some of these properties are read-only or should be considered private (internal state), the appropriate way to implement this procedure is to run `CSSStyleSheetWrapper.create()` with the third `privateData` argument received by `CSSStyleSheet.constructor()`.

> A constructor for your implementation class, with signature `(globalObject, constructorArgs, privateData)` can serve several purposes:
>
> [...]
>
> Processing any private data `privateData` [...]. This is useful for constructing instances with specific state that cannot be constructed via the wrapper class constructor.

Note: a good convention is to only use `constructorArgs` when creating *constructed* object.

*Create a CSS style sheet* also have an additional step (run `addCSSStyleSheet()`) that would be better to run outside of `CSSStyleSheet.constructor()`, to separate concerns but also because *remove a CSS style sheet* should update a property of the document or shadow root that is read-only, therefore this can not be done from inside `CSSStyleSheet` or in an helper function. It would be inconsistent to implement *create a CSS style sheet* inside `CSSStyleSheet` but implement *remove a CSS style sheet* outside. Instead, *create a <interface> object* should be implemented where it needs to run, and only state properties are initialized in the constructor of the interface.

Note: if `globalObject` (`Document` or `ShadowRoot`) could be assumed as an instance of a wrapper class generated by `webidl2js`, then it could be converted to an instance of the implementation class, and *remove a CSS style sheet* could be implemented in `CSSStyleSheet` or a utility function (see below), but this would make the implementation brittle because it would be coupled to the use of `webidl2js` and the name of the property in the implementation class of `Document` or `ShadowRoot`.

```js
/**
 * @param {Document} document Wrapper instance of `Document`
 */
function removeCSSStyleSheet(document, styleSheet) {
  const wrapper = implForWrapper(document)
  wrapper._styleSheets.splice(wrapper.styleSheets.indexOf(styleSheet), 1)
  // ...
}
```

**What are the main steps to get a `CSSStyleSheet` from parsing a style sheet or `HTMLStyleElement.innerText`?**

Procedure for *parse a CSS Stylesheet*:

  > To parse a CSS stylesheet, first parse a stylesheet. Interpret all of the resulting top-level qualified rules as style rules, defined below.
  >
  > If any style rule is invalid, or any at-rule is not recognized or is invalid according to its grammar or context, it’s a parse error. Discard that rule.
  >
  > [...]
  >
  > A style rule is a qualified rule [...].
  >
  > The prelude of the qualified rule is parsed as a `<selector-list>`. If this returns failure, the entire style rule is invalid.
  >
  > The content of the qualified rule’s block is parsed as a style block’s contents. Unless defined otherwise by another specification or a future level of this specification, at-rules in that list are invalid and must be ignored.
  >
  > Note: CSS-NESTING-1 defines that `@nest` and conditional group rules are allowed inside of style rules.
  >
  > Declarations for an unknown CSS property or whose value does not match the syntax defined by the property are invalid and must be ignored. The validity of the style rule’s contents have no effect on the validity of the style rule itself. [...]

https://drafts.csswg.org/css-syntax-3/#parse-a-css-stylesheet

The return value is not defined but from a logical point of view, it could be assumed as an instance of `CSSStyleSheet`, similarly as the return value of *parse a CSS rule*, whose type is not defined, could be assumed as an instance of a `CSSRule` subclass. Furthermore:

  - *the output [of the CSS parsing process] is a `CSSStyleSheet` object*
  - *parse a component value* returns a component value
  - *parse a declaration* returns a declaration
  - *parse a rule* returns a rule
  - etc...

But it could also be assumed as a plain object representing a style sheet *validated according to the appropriate CSS specifications*, by checking *if any style rule is invalid, or any at-rule is not recognized or is invalid according to its grammar or context*, and that should be used to create a `CSSStyleSheet`.

Furthermore, the procedure to validate the result from parsing `<stylesheet>` or `<rule-list>`, which can be named *parse a CSS list of rules*, can not return an instance of `CSSRuleList` because `CSSStyleSheet.cssRules` or `CSSRule.cssRules` should always stay the same `CSSRuleList` (whose interface does not allow to add rules), even when running `CSSStyleSheet.replace()`, which should parse its input into a list of validated rules as instances of `CSSRule` subclasses.

[Related issue](https://github.com/w3c/csswg-drafts/issues/6995): `CSSStyleSheet.replace()` should also validate rules according to the appropriate CSS specifications.

Related issue: `CSSStyleSheet.insertRule()` should result to a new instance of a `CSSRule` subclass added to `CSSStyleSheet.cssRules` but setting `CSSRule.parentStyleSheet`, *initialized [...] when the rule is created*, does not appear as a step of the procedure for `CSSStyleSheet.insertRule()` or its subjacent procedures, but this instance can either be assumed as *the result of parsing rule according to the appropriate CSS specifications* in *parse a CSS rule*, or created in *insert a CSS rule*.

*Parse a CSS declaration block*, *parse a CSS value*, and the procedures that could be named *parse a CSS style block* and *parse a CSS declaration list*, also return a plain object. In concordance, *parse a CSS stylesheet* and *parse a CSS rule* would also return a plain object.

*Parse a CSS stylesheet* would be initiated from an independent function as the parser entry point, and its result would have to be be passed to `CSSStyleSheet.create()`, or it would be initiated from `CSSStyleSheet.constructor()`.

Other observations:

  - step 3 of *parse a stylesheet* is *create a new stylesheet, with its location set to `location`*, with *location* wrapped in an anchor link pointing to a definition in CSSOM as a *state item* of `CSSStyleSheet`, which would mean that *parse a stylesheet* should return a `CSSStyleSheet`, whose *value* should then be interpreted as defined by *parse a CSS stylesheet*, but returning `CSSStyleSheet` from *parse a stylesheet* would be discordant with *parse a rule*, which should return a plain object
  - Cascade 4 defines *fetch an `@import`*, whose step 4 sets `CSSImportRule.styleSheet` to the result of *parse a stylesheet*, confirming that it should return a `CSSStyleSheet`, and the next section defines that *it must be interpreted as a CSS style sheet*, similarly as in *parse a CSS stylesheet*, but the procedure has been removed in Cascade 5
  - Syntax 3 defines that *"parse a stylesheet" is intended to be the normal parser entry point, for parsing stylesheets* but on the other hand, the HTML specification (see issue below) creates a CSS style sheet object when parsing or updating `<style>` or `<link rel="stylesheet">`, and initiating the parsing of their CSS content is left undefined (see issue below)
  - CSSOM defines that an HTTP `Link` header referencing a style sheet, should run *create a CSS style sheet*, whose steps neither include *parse a stylesheet* or *parse a CSS stylesheet*
  - `CSSStyleSheet.constructor()` (and `CSSStyleSheet.replace()` and `CSSStyleSheet.replaceSync()`) has been added to CSSOM to facilitate creating style sheets in a shadow root element, which was limited to using `<style>` before
  - `CSSRule.parentStyleSheet` should reference the parent `CSSStyleSheet` and `CSSStyleSheet.cssRules` should be a read-only `CSSRuleList` referencing the child `CSSRule`, therefore `CSSStyleSheet.constructor()` and the parent `CSSRule.constructor()` are the only places to create instances of `CSSRule` subclasses, if accessing a private interface from the outside the implementation class should be avoided

Related issue: https://github.com/whatwg/html/issues/696

> [...] CSS parsing should be observed atomic, so things will happen in this order
>
> 1. Loading completes
> 2. Stylesheet is parsed
> 3. `CSSStyleSheet` object is ready (including `cssRules` being populated)
> 4. `.sheet` is associated with the object
> 5. `document.styleSheets` reflects the object
>
> [...]
>
> [...] webcompat requires stylesheets to appear to be parsed atomically - if you can see the stylesheet, it needs to contain all of its rules fully parsed. [...]

A strict interpretation of *before you can see the stylesheet* would mean that *parse a CSS stylesheet* should occur in `CSSStyleSheet.constructor()`, which would have to receive the raw CSS rules. This way, *parse a CSS stylesheet* and *parse a stylesheet* would both be kind of returning a `CSSStyleSheet`.

But it rather means that the style sheet should contain all of its rules before appearing outside of the CSS parser.

Notes about using the "parse engine" vs. alogrithms to parse rules and their content:

  - *consume an at-rule* and *consume a qualified rule* handle an at-keyword token followed by a simple-block, which means that *consume a list of rules* can receive an `input` that went through *parse a list of component values* and that parsing `<stylesheet>`, `<rule-list>`, `<style-block>`, `<declaration-list>`, can be implemented as `parseCSSGrammar(input, '<stylesheet>')`, `parseCSSGrammar(input, '<rule-list>')`, etc.
  - it seems easier and more straightforward to run the *consume* procedures required for parsing `<stylesheet>`, `<rule-list>`, `<style-block>`, `<declaration-list>`, `<declaration>`, and to run `parseCSSRule()`, `parseCSSDeclaration()`, in the outer scope of `parseGrammar()`, as well as for having access to the context rules (parent rule name/definition)
  - `@webref/css` extracts only "child" at-rule definitions

Solution 1 (current): `matchRule(rule, contextRules)`

Solution 2: solution 1 but using `parseGrammar([cssRule], grammars[rule.name], context)`
  - con: it adds complexity with no other benefit than centralizing parsing against productions

Solution 3: `parseCSSGrammar(input, '<stylesheet>')`
  - con: it adds complexity with no other benefit than centralizing parsing against context rules and productions and removing extra work when a new rule is added to a specification
    - `@webref/css` is currently limited to extracting "child" rules
  - implementation (call path):
    1. `parseCSSGrammar(input, '<stylesheet>')`
    2. `parseNonTerminalType(list, node)` -> `node.value === stylesheet -> <rule-list>`
    3. `parseTerminalType(list, node)` -> `node.value === rule-list`
    4. `parseCSSRuleList(list, node)`
        -> requires `consumeRuleList()` in `syntax.js`
        -> could be implemented via a hook run with `context.applyRule(list, 'rule-list')` in `parseTerminalType()`, receiving the result of running `consumeRuleList()`, ie. the terminal parse function, and `context`
        - `parentRule = context.getParentScopeNode()` -> `context.scopes[context.scopes.length - 2]`
        - `parentRuleDefinition = parentRule ? rules[parentRule.name].value.rules : rules`
        - `consumeRuleList(list, !!parentRule).reduce((parsed, rule) => ..., [])`
          - `ruleDefinition = parentRule ? rules[parentRule.name][rule.name].type : rules[rule.name].type`
          - discard `rule` if not allowed by `parentRuleDefinition`
          - discard `rule` if `rule = parseGrammar([rule], ruleDefinition, context)` otherwise push it to `parsed`
            -> issue: `parseGrammar()` runs `context.reset()` which means that `parentRule` will be missing
            -> workaround: `context.reset()` can be run from outside `parseGrammar()`
            1. `parseType(list, node)` -> `node.type === 'rule'`
            2. `parseRule(list, node)`
                - `rule = list.next()`
                - `parseType(rule.prelude, node.prelude)`
                - eg. `context.terminals['rule-list'](rule.value, parentRule.name)`
                  - `parseCSSRuleList(rule.value, parentRule.name)`
                - eg. `context.terminals['style-block'](rule.value, parentRule.name)`
                  - `parseCSSStyleBlock(rule.value, parentRule.name)`

**How `jsdom` makes webidl interfaces available in its code?**

1. `.webidl` and implementations are defined in `<path>`
2. Wrappers are generated in `<path>/generated`
3. `wrapper.install(window, ["Window"])` is run for each interfaces when creating an instance of `class JSDOM`

**Usages of this library:**

  - in `jsdom`:
    - assign interfaces to `Window`
      -> https://github.com/jsdom/jsdom/blob/master/lib/jsdom/living/interfaces.js#L210
      -> https://github.com/jsdom/jsdom/blob/master/lib/jsdom/level2/style.js
      -> replace `style.addToCore(window)` by `Object.values(require('cdoublev/css')).forEach(wrapper => wrapper.install(window, globalNames))`
    - create a `CSSStyleDeclaration` in `getComputedStyle()`
      -> https://github.com/jsdom/jsdom/blob/master/lib/jsdom/browser/Window.js#L796
      -> replace `new CSSStyleDeclaration()` by `wrapper.create(this, undefined, { computed: true, element: elt })`
    - create a `CSSStyleDeclaration` as `Element.style`
      -> https://github.com/jsdom/jsdom/blob/master/lib/jsdom/living/nodes/ElementCSSInlineStyle-impl.js#L7
      -> replace `new cssstyle.CSSStyleDeclaration(...)` by `wrapper.create(???, undefined, { element: this })`
    - create `CSSStyleSheet` as `HTMLLinkElement.sheet` and `HTMLStyleElement.sheet`
      -> https://github.com/jsdom/jsdom/blob/master/lib/jsdom/living/helpers/stylesheets.js#L28
      -> https://github.com/jsdom/jsdom/blob/master/lib/jsdom/living/nodes/HTMLLinkElement-impl.js#L88
      -> https://github.com/jsdom/jsdom/blob/master/lib/jsdom/living/nodes/HTMLStyleElement-impl.js#L68
      -> replace all usages by ???
  - others:
    - `new CSSStyleDeclaration()`: to test parsing inline CSS (`cssText`) or CSS declarations (`setProperty()`)
    - `new CSSStyleSheet()`: to test parsing a whole CSS style sheet (style block)

## Recursive descent parser with backtracking (statefull parser)

See [./drafts.md](./drafts.md).