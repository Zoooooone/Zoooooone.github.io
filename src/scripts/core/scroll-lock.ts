const root = document.documentElement;

/** `overflow: hidden` drops the scrollbar and widens the viewport; its width is added back as padding in CSS. */
export function setScrollLock(className: string, locked: boolean) {
  if (locked && getComputedStyle(root).overflow !== 'hidden') {
    root.style.setProperty('--scrollbar-w', `${window.innerWidth - root.clientWidth}px`);
  }
  root.classList.toggle(className, locked);
  if (!locked && getComputedStyle(root).overflow !== 'hidden') root.style.removeProperty('--scrollbar-w');
}
