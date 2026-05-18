import { Mark, mergeAttributes } from '../../../../../node_modules/.pnpm/node_modules/@tiptap/core'

const TextStyleExtension = Mark.create({
  name: 'textStyle',

  priority: 1000,

  addAttributes() {
    return {
      color: {
        default: null,
        parseHTML: (element) => element.style.color || null
      },
      fontSize: {
        default: null,
        parseHTML: (element) => element.style.fontSize || null
      }
    }
  },

  parseHTML() {
    return [{ tag: 'span' }]
  },

  renderHTML({ HTMLAttributes }) {
    const { color, fontSize, style, ...rest } = HTMLAttributes
    const styleParts = []

    if (style) styleParts.push(String(style).replace(/;$/, ''))
    if (color) styleParts.push(`color:${color}`)
    if (fontSize) styleParts.push(`font-size:${fontSize}`)

    const attrs = styleParts.length
      ? mergeAttributes(rest, { style: styleParts.join(';') })
      : rest

    return ['span', attrs, 0]
  }
})

export default TextStyleExtension
