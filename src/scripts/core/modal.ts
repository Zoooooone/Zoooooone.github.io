const SKIPPED = new Set(['SCRIPT', 'STYLE', 'LINK', 'TEMPLATE']);

/** Makes everything outside `dialog` inert and returns a function that undoes it and gives the focus back. */
export function enterModal(dialog: HTMLElement): () => void {
  const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  const background = [...document.body.children].filter(
    (el): el is HTMLElement =>
      el instanceof HTMLElement && !SKIPPED.has(el.tagName) && !el.contains(dialog) && !el.inert,
  );
  background.forEach((el) => (el.inert = true));
  return () => {
    background.forEach((el) => (el.inert = false));
    if (opener?.isConnected) opener.focus({ preventScroll: true });
  };
}
