import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Scrolls window to (0,0) on every route change.
 * Prevents the browser from keeping the scroll position when navigating between pages.
 */
export default function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);
  return null;
}
