// Add type detection to the extension
const isFile = (name: string, files: any[]) => {
  return files.some(f => f.name === name);
};

const isNote = (name: string, notes: any[]) => {
  return notes.some(n => n.name === n.name);
};

// In the click handler:
element.addEventListener('click', () => {
  const name = element.getAttribute('data-name');
  const type = element.getAttribute('data-type');
  if (name) {
    const event = new CustomEvent('wiki-link-click', {
      detail: { name, type }
    });
    window.dispatchEvent(event);
  }
}); 