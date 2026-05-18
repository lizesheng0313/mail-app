import { Node, mergeAttributes } from '../../../../../node_modules/.pnpm/node_modules/@tiptap/core'

const SimpleImageExtension = Node.create({
  name: 'image',
  inline: false,
  group: 'block',
  draggable: true,
  selectable: true,
  addAttributes() {
    return {
      src: { default: null },
      alt: { default: null },
      title: { default: null },
      style: { default: 'max-width:100%;height:auto;border-radius:12px;' }
    }
  },
  parseHTML() {
    return [{ tag: 'img[src]' }]
  },
  renderHTML({ HTMLAttributes }) {
    return ['img', mergeAttributes(HTMLAttributes)]
  }
})

export default SimpleImageExtension
