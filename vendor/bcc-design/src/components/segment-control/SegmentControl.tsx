'use client';

import { forwardRef, useRef } from 'react';
import { block } from '../../utilities/cn';
import { SegmentControlProps } from './SegmentControl.type';
import './SegmentControl.scss';

const b = block('segmentControl');

// Preserve the BCC segmented surface and plate while providing native keyboard controls.
export const SegmentControl = forwardRef<HTMLUListElement, SegmentControlProps>(
  ({ children, childrenRef, onChange, selectedId = 0, size = 'xs', shape = 'rounded', items = [], className, ...restProps }, ref) => {
    const buttons = useRef(new Map<number, HTMLButtonElement>());
    const selectedIndex = items.findIndex(item => item.id === selectedId);
    const enabledItems = items.filter(item => !item.disabled);
    const tabId = enabledItems.some(item => item.id === selectedId) ? selectedId : enabledItems[0]?.id;
    return (
      <ul {...restProps} ref={ref} role="radiogroup" className={b({ size, shape }, className)}>
        {selectedIndex >= 0 && (
          <li aria-hidden="true" className="plate" style={{ width: `${100 / items.length}%`, left: `${100 * selectedIndex / items.length}%` }} />
        )}
        {items.map(({ id, label, disabled }) => (
          <li key={id} role="presentation" className={`tab-item ${id === selectedId ? 'active' : ''}`}>
            <button
              type="button"
              role="radio"
              aria-checked={id === selectedId}
              disabled={disabled}
              tabIndex={id === tabId ? 0 : -1}
              ref={node => { if (node) buttons.current.set(id, node); else buttons.current.delete(id); }}
              onClick={() => onChange?.(id)}
              onKeyDown={event => {
                if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(event.key)) return;
                event.preventDefault();
                const current = enabledItems.findIndex(item => item.id === id);
                const nextIndex = event.key === 'Home' ? 0 : event.key === 'End' ? enabledItems.length - 1
                  : (current + (event.key === 'ArrowLeft' || event.key === 'ArrowUp' ? -1 : 1) + enabledItems.length) % enabledItems.length;
                const next = enabledItems[nextIndex];
                if (next) { buttons.current.get(next.id)?.focus(); onChange?.(next.id); }
              }}
            >
              <span>{label}</span>
            </button>
          </li>
        ))}
      </ul>
    );
  },
);
