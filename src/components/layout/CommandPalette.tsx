import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowRight, Command, Search, X } from 'lucide-react';
import { VISIBLE_NAV_ITEMS, canonicalViewId, isPreview, type NavItem } from '../../data/navigation';
import { routeForView } from '../../data/routes';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (id: string) => void;
}

export default function CommandPalette({ isOpen, onClose, onNavigate }: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const [cursor, setCursor] = useState(0);
  const startedInsideModalRef = useRef(false);

  const items = useMemo<NavItem[]>(() => {
    const value = query.trim().toLowerCase();

    if (!value) return VISIBLE_NAV_ITEMS.slice(0, 12);

    return VISIBLE_NAV_ITEMS.filter((item) => `${item.label} ${item.desc} ${routeForView(item.id)}`.toLowerCase().includes(value)).slice(0, 30);
  }, [query]);

  useEffect(() => {
    if (!isOpen) return;

    const keyHandler = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        onClose();
        return;
      }

      if (event.key === 'ArrowDown') {
        event.preventDefault();
        event.stopPropagation();
        setCursor((current) => Math.min(current + 1, Math.max(items.length - 1, 0)));
        return;
      }

      if (event.key === 'ArrowUp') {
        event.preventDefault();
        event.stopPropagation();
        setCursor((current) => Math.max(current - 1, 0));
        return;
      }

      if (event.key === 'Enter') {
        event.preventDefault();
        event.stopPropagation();
        const item = items[cursor];
        if (item) {
          onNavigate(canonicalViewId(item.id));
          onClose();
        }
      }
    };

    document.addEventListener('keydown', keyHandler, true);
    return () => document.removeEventListener('keydown', keyHandler, true);
  }, [isOpen, items, cursor, onClose, onNavigate]);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setCursor(0);
      startedInsideModalRef.current = false;
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className="at-command-overlay"
      role="presentation"
      onMouseDown={(event) => {
        startedInsideModalRef.current = event.target !== event.currentTarget;
      }}
      onClick={(event) => {
        const clickedBackdrop = event.target === event.currentTarget;
        const startedInside = startedInsideModalRef.current;
        startedInsideModalRef.current = false;
        if (clickedBackdrop && !startedInside) {
          onClose();
        }
      }}
    >
      <div className="at-command-modal" role="dialog" aria-modal="true" aria-label="Global navigation">
        <div className="at-command-input-row">
          <Search size={16} />
          <input
            autoFocus
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setCursor(0);
            }}
            placeholder="Search modules"
            aria-label="Search modules"
          />
          <kbd><Command size={10} />K</kbd>
          <button
            type="button"
            className="at-command-close"
            onClick={onClose}
            aria-label="Close global search"
            title="Close (Esc)"
          >
            <X size={15} />
          </button>
        </div>

        <div className="at-command-results">
          {items.length === 0 ? (
            <div className="at-command-empty">
              <Search size={20} />
              <strong>No matching modules</strong>
              <span>Try a different module or workflow name.</span>
            </div>
          ) : (
            items.map((item, index) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  type="button"
                  className={`at-command-result ${index === cursor ? 'is-active' : ''}`}
                  onMouseEnter={() => setCursor(index)}
                  onClick={() => {
                    onNavigate(canonicalViewId(item.id));
                    onClose();
                  }}
                >
                  <span className="at-command-result-icon"><Icon size={15} /></span>
                  <span className="at-command-result-copy">
                    <strong>
                      {item.label}
                      {isPreview(item) && <span className="at-command-preview-badge">Preview</span>}
                    </strong>
                    <small>{item.desc}</small>
                  </span>
                  {index === cursor && <ArrowRight size={14} />}
                </button>
              );
            })
          )}
        </div>

        <div className="at-command-footer">
          <span><kbd>↑</kbd><kbd>↓</kbd> navigate</span>
          <span><kbd>Enter</kbd> open</span>
          <span><kbd>Esc</kbd> close</span>
        </div>
      </div>
    </div>
  );
}
