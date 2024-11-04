import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';

export const WikiLink = Extension.create({
  name: 'wikiLink',

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey('wikiLink'),
        props: {
          handleClick(view, pos, event) {
            const { state } = view;
            const { doc } = state;
            const resolvedPos = doc.resolve(pos);
            const node = resolvedPos.parent;
            const marks = resolvedPos.marks();
            
            // Check if clicked position has a customLink mark
            const customLink = marks.find(mark => mark.type.name === 'customLink');
            if (customLink) {
              const { href, type } = customLink.attrs;
              const event = new CustomEvent('custom-link-click', {
                detail: { 
                  name: href,
                  type: type
                }
              });
              window.dispatchEvent(event);
              return true;
            }
            return false;
          },
          decorations(state) {
            const decorations: Decoration[] = [];
            const { doc } = state;

            doc.descendants((node, pos) => {
              if (node.isText) {
                const marks = node.marks;
                const customLink = marks.find(mark => mark.type.name === 'customLink');
                if (customLink) {
                  decorations.push(
                    Decoration.inline(pos, pos + node.nodeSize, {
                      class: `custom-link ${customLink.attrs.type}-link`,
                    })
                  );
                }
              }
            });

            return DecorationSet.create(doc, decorations);
          },
        },
      }),
    ];
  },
}); 