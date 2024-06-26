
const { cssom, install } = require('../lib/index.js')
// Do not import CSSOM implementations before the above import
const { DELETE_UNEXISTENT_MEDIUM_ERROR } = require('../lib/cssom/MediaList-impl.js')

install()

function createMediaList(text) {
    const media = cssom.MediaList.create(globalThis)
    if (text) {
        media.mediaText = text
    }
    return media
}

test('MediaList.length', () => {
    const media = createMediaList('all, screen')
    expect(media).toHaveLength(2)
})
test('MediaList.mediaText', () => {
    const media = createMediaList()
    media.mediaText = 'all, ;'
    expect(media.mediaText).toBe('all, not all')
})
test('MediaList.item()', () => {
    const media = createMediaList('all')
    expect(media.item(0)).toBe('all')
    expect(media.item(1)).toBeNull()
})
test('MediaList.appendMedium()', () => {
    const media = createMediaList()
    media.appendMedium('all, ;')
    expect(media.mediaText).toBe('')
    media.appendMedium('all')
    expect(media.mediaText).toBe('all')
    media.appendMedium(';')
    expect(media.mediaText).toBe('all, not all')
    media.appendMedium(';')
    expect(media.mediaText).toBe('all, not all')
    media.appendMedium('all and (condition)')
    expect(media.mediaText).toBe('all, not all, (condition)')
    media.appendMedium('all and (condition)')
    expect(media.mediaText).toBe('all, not all, (condition)')
})
test('MediaList.deleteMedium()', () => {
    const media = createMediaList('all, all, not all, all and (condition)')
    media.deleteMedium('all, not all')
    expect(media.mediaText).toBe('all, all, not all, (condition)')
    media.deleteMedium('all')
    expect(media.mediaText).toBe('not all, (condition)')
    media.deleteMedium('all and (condition)')
    expect(media.mediaText).toBe('not all')
    expect(() => media.deleteMedium('all')).toThrow(DELETE_UNEXISTENT_MEDIUM_ERROR)
})
