import { Mark, markPasteRule, mergeAttributes } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';

export interface CustomLinkOptions {
  HTMLAttributes: Record<string, any>;
  sanitize: {
    content: boolean;
  };
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    customLink: {
      setCustomLink: (attributes: { href: string; type: string }) => ReturnType;
      unsetCustomLink: () => ReturnType;
    };
  }
}

export const CustomLink = Mark.create<CustomLinkOptions>({
  name: 'customLink',

  priority: 1000,

  keepOnSplit: false,

  addOptions() {
    return {
      HTMLAttributes: {},
      sanitize: {
        content: false,
      },
    };
  },

  addAttributes() {
    return {
      href: {
        default: null,
      },
      type: {
        default: 'note',
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'a[data-type]',
        getAttrs: element => {
          if (typeof element === 'string') return {};
          return {
            href: (element as HTMLElement).getAttribute('href'),
            type: (element as HTMLElement).getAttribute('data-type'),
          };
        },
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    const type = HTMLAttributes.type || 'note';
    const icon = type === 'file' ? 
      '<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/></svg>' : 
      '<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2H2v10h10V2zM22 2h-8v10h8V2zM12 14H2v8h10v-8zM22 14h-8v8h8v-8z"/></svg>';

    return ['a', mergeAttributes(
      this.options.HTMLAttributes,
      HTMLAttributes,
      {
        class: `custom-link custom-link-${type}`,
        'data-type': type,
      }
    ), [
      ['span', { 
        class: 'custom-link-icon',
        contenteditable: 'false',
        innerHTML: icon 
      }],
      ['span', { class: 'custom-link-text' }, 0]
    ]];
  },

  addCommands() {
    return {
      setCustomLink:
        attributes =>
        ({ commands }) => {
          return commands.setMark(this.name, attributes);
        },
      unsetCustomLink:
        () =>
        ({ commands }) => {
          return commands.unsetMark(this.name);
        },
    };
  },

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey('customLink'),
        props: {
          handleClick(view, pos, event) {
            const { state } = view;
            const { doc, selection } = state;
            const { from, to } = selection;

            let foundLink = null;

            doc.nodesBetween(from, to, (node, position) => {
              const mark = node.marks.find(mark => mark.type.name === 'customLink');
              if (mark) {
                foundLink = {
                  href: mark.attrs.href,
                  type: mark.attrs.type
                };
                return false;
              }
            });

            if (foundLink) {
              const event = new CustomEvent('custom-link-click', {
                detail: { 
                  name: foundLink.href,
                  type: foundLink.type
                }
              });
              window.dispatchEvent(event);
              return true;
            }

            return false;
          },
        },
      }),
    ];
  },
}); 