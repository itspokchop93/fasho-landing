import { useEffect, useState } from 'react';

type PageTransitionLikeEvent = Event & { persisted?: boolean };

const getIsDocumentVisible = () => {
  if (typeof document === 'undefined') {
    return true;
  }

  return !document.hidden;
};

const usePageVisibility = (): boolean => {
  const [isVisible, setIsVisible] = useState<boolean>(getIsDocumentVisible);

  useEffect(() => {
    const handleVisibilityChange = () => {
      setIsVisible(getIsDocumentVisible());
    };

    const handlePageShow = (event: Event) => {
      const pageEvent = event as PageTransitionLikeEvent;
      if (pageEvent.persisted) {
        setIsVisible(true);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('pageshow', handlePageShow);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('pageshow', handlePageShow);
    };
  }, []);

  return isVisible;
};

export default usePageVisibility;

