import { useEffect, useState, type RefObject } from 'react';
import { useLocation } from 'react-router';

/**
 * The page's large title (its h1) once it has scrolled up under the top bar, so the bar can show
 * it the way iOS does; null while the title is in view, or when the page has none. A page can
 * give the bar a shorter name with `data-nav-title` on its h1.
 */
export function useCollapsedTitle(bar: RefObject<HTMLElement | null>): string | null {
  const { pathname } = useLocation();
  // Keyed by path, so a title never carries over to the next page.
  const [state, setState] = useState<{ path: string; title: string | null }>({
    path: pathname,
    title: null,
  });

  useEffect(() => {
    const main = document.querySelector('main');
    if (!main) return;
    let watched: HTMLElement | null = null;
    let io: IntersectionObserver | null = null;

    // Pages render their title after data loads, so keep looking until the h1 is there.
    const watch = () => {
      const h1 = main.querySelector<HTMLElement>('h1');
      if (h1 === watched) return;
      io?.disconnect();
      watched = h1;
      setState({ path: pathname, title: null });
      if (!h1) return;
      const top = bar.current?.offsetHeight ?? 0;
      io = new IntersectionObserver(
        ([entry]) => {
          const above = !!entry && !entry.isIntersecting && entry.boundingClientRect.top < top;
          const title = h1.dataset.navTitle ?? h1.textContent?.trim() ?? null;
          setState({ path: pathname, title: above ? title : null });
        },
        { rootMargin: `-${top}px 0px 0px 0px` },
      );
      io.observe(h1);
    };

    const first = requestAnimationFrame(watch);
    const mo = new MutationObserver(watch);
    mo.observe(main, { childList: true, subtree: true });
    return () => {
      cancelAnimationFrame(first);
      mo.disconnect();
      io?.disconnect();
    };
  }, [pathname, bar]);

  return state.path === pathname ? state.title : null;
}
