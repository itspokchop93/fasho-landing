import { useCallback } from 'react';

export interface GenreGroupDef {
  label: string;
  items: string[];
}

interface GenreCloudMobileProps {
  groups: GenreGroupDef[];
  selectedGenres: string[];
  onSelectionChange: (selected: string[]) => void;
}

const POPULAR_GENRES = new Set(['Hip-Hop', 'Pop', 'R&B', 'Rock', 'Party', 'Chill']);

export default function GenreCloudMobile({ groups, selectedGenres, onSelectionChange }: GenreCloudMobileProps) {
  const toggleGenre = useCallback((genre: string) => {
    const isSelected = selectedGenres.includes(genre);
    const newSelected = isSelected
      ? selectedGenres.filter(g => g !== genre)
      : [...selectedGenres, genre];
    onSelectionChange(newSelected);
  }, [selectedGenres, onSelectionChange]);

  return (
    <div className="w-full">
      <div
        className="rounded-2xl px-3 py-4 sm:px-5 sm:py-5"
        style={{
          background: 'rgba(255, 255, 255, 0.02)',
          border: '1px solid rgba(255, 255, 255, 0.05)',
          backdropFilter: 'blur(8px)',
        }}
      >
        {groups.map((group, gi) => (
          <div key={group.label} className={gi < groups.length - 1 ? 'mb-5 sm:mb-6' : ''}>
            <div className="flex items-center gap-3 mb-3 px-0.5">
              <div
                className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                style={{ background: 'linear-gradient(135deg, #59e3a5, #14c0ff)' }}
              />
              <span
                className="text-white/35 uppercase tracking-widest font-semibold flex-shrink-0"
                style={{ fontSize: '0.6rem', letterSpacing: '0.18em' }}
              >
                {group.label}
              </span>
              <div className="flex-1 h-px" style={{ background: 'rgba(255, 255, 255, 0.06)' }} />
            </div>

            <div className="flex flex-wrap gap-2 sm:gap-2.5">
              {group.items.map((item) => {
                const isSelected = selectedGenres.includes(item);
                const isPopular = POPULAR_GENRES.has(item);

                return (
                  <button
                    key={item}
                    type="button"
                    onClick={() => toggleGenre(item)}
                    className="transition-all duration-200 active:scale-95 select-none"
                    style={{
                      WebkitTapHighlightColor: 'transparent',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                      padding: isPopular ? '9px 18px' : '8px 15px',
                      borderRadius: '999px',
                      fontSize: isPopular ? '0.85rem' : '0.78rem',
                      fontWeight: isPopular ? 700 : 600,
                      fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
                      border: isSelected
                        ? '1.5px solid rgba(89, 227, 165, 0.6)'
                        : '1px solid rgba(255, 255, 255, 0.12)',
                      background: isSelected
                        ? 'linear-gradient(135deg, rgba(89, 227, 165, 0.22), rgba(61, 212, 160, 0.12))'
                        : 'rgba(15, 20, 28, 0.8)',
                      color: isSelected ? '#a0f0cf' : 'rgba(255, 255, 255, 0.7)',
                      boxShadow: isSelected
                        ? '0 2px 10px rgba(89, 227, 165, 0.12), inset 0 1px 0 rgba(89, 227, 165, 0.1)'
                        : '0 1px 4px rgba(0, 0, 0, 0.3)',
                    }}
                  >
                    {isSelected && (
                      <svg width="11" height="11" viewBox="0 0 12 12" fill="none" className="flex-shrink-0">
                        <path d="M2 6L5 9L10 3" stroke="#59e3a5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                    {item}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

    </div>
  );
}
