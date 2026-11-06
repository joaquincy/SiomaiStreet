// Shared by nested camera and preview dialogs, including unmount in either order.
let count = 0;
let original = '';
export function lockDocumentScroll() {
  if (!count++) { original = document.body.style.overflow; document.body.style.overflow = 'hidden'; }
  let released = false;
  return () => {
    if (released) return;
    released = true;
    if (--count === 0) document.body.style.overflow = original;
  };
}
