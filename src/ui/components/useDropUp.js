import { useEffect, useState } from 'react';

// True when an open popover anchored under `ref` should flip upwards: the
// nearest scrollable ancestor (or the viewport) leaves less than `needed`
// px below and more room above than below.
export function useDropUp(ref, open, needed = 240) {
  const [up, setUp] = useState(false);
  useEffect(() => {
    if (!open) return;
    const el = ref.current;
    if (!el) return;
    let box = el.parentElement;
    while (box && !(box.scrollHeight > box.clientHeight
        && /(auto|scroll)/.test(getComputedStyle(box).overflowY)))
      box = box.parentElement;
    const limit = box ? box.getBoundingClientRect()
      : { top: 0, bottom: window.innerHeight };
    const r = el.getBoundingClientRect();
    const below = limit.bottom - r.bottom;
    setUp(below < needed && r.top - limit.top > below);
  }, [open, ref, needed]);
  return up;
}
