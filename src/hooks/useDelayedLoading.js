import { useEffect, useState } from 'react';

export default function useDelayedLoading(isLoading, delay = 150) {
  const [showLoading, setShowLoading] = useState(false);

  useEffect(() => {
    if (!isLoading) {
      setShowLoading(false);
      return undefined;
    }

    const timer = window.setTimeout(() => setShowLoading(true), delay);
    return () => window.clearTimeout(timer);
  }, [isLoading, delay]);

  return showLoading;
}
