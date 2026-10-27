import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Handles smooth scrolling to anchor elements (e.g., #features, #how-it-works)
 * across router transitions and on initial mount.
 */
export default function ScrollToAnchor() {
  const { pathname, hash } = useLocation();
  const lastHash = useRef('');

  useEffect(() => {
    if (hash) {
      lastHash.current = hash.slice(1);
    }

    if (lastHash.current) {
      const targetId = lastHash.current;
      // Allow slight delay for page rendering / mounting
      const timer = setTimeout(() => {
        const element = document.getElementById(targetId);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
        lastHash.current = '';
      }, 100);

      return () => clearTimeout(timer);
    }
  }, [pathname, hash]);

  return null;
}
