import { Mark, mergeAttributes } from '../../../../../node_modules/.pnpm/node_modules/@tiptap/core'

const SimpleLinkExtension = Mark.create({
  name: 'link',

  inclusive: false,

  addAttributes() {
    return {
      href: { default: null },
      target: { default: '_blank' },
      rel: { default: 'noopener noreferrer' },
      style: {
        default: 'color:#2563eb;text-decoration:underline;cursor:pointer;',
        parseHTML: (element) => element.getAttribute('style') || 'color:#2563eb;text-decoration:underline;cursor:pointer;'
      }
    }
  },

  parseHTML() {
    return [{ tag: 'a[href]' }]
  },

  renderHTML({ HTMLAttributes }) {
    return ['a', mergeAttributes(HTMLAttributes), 0]
  }
})

export default SimpleLinkExtension
