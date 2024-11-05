import { Link } from '@tiptap/extension-link';

export const CustomLink = Link.extend({
  name: 'customLink',

  addAttributes() {
    return {
      ...this.parent?.(),
      'data-type': {
        default: null,
      },
      'data-name': {
        default: null,
      },
    }
  },

  parseHTML() {
    return [
      {
        tag: 'a[data-type]',
      },
    ]
  },

  renderHTML({ HTMLAttributes }) {
    return ['a', HTMLAttributes, 0]
  },
}); 