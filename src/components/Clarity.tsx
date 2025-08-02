import { useEffect } from 'react';

const Clarity = () => {
  useEffect(() => {
    import('@microsoft/clarity').then((module) => {
      const clarity = module.default;
      if (clarity && typeof clarity.init === 'function') {
        clarity.init('songm24xjn');
      } else {
        // Fallback for non-default export
        module.init('songm24xjn');
      }
    });
  }, []);

  return null;
};

export default Clarity;
