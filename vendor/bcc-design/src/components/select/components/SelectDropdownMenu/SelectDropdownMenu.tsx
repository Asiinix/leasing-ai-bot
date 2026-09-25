import React, { memo, useCallback } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { block } from '../../../../utilities/cn';

import { SelectSingleValue } from '../../Select.type';
import { SelectOption } from '../SelectOption';
import { SelectDropdownTextContainer } from './components/SelectDropdownTextContainer';
import type { SelectDropdownMenuProps } from './SelectDropdownMenu.type';

import './SelectDropdownMenu.scss';

import { getVirtualListDropdownHeight } from './utils';

const b = block('select-options');

export const SelectDropdownMenu = ({ virtualize, ...props }: SelectDropdownMenuProps) => {
  const { value, options, loading, onDeselect, onSelect, onChange } = props;

  const handleChange = useCallback(
    (selectedValue: SelectSingleValue) => {
      const isMultiple = Array.isArray(value);
      const isSelected =
        selectedValue === null ? false : isMultiple ? value?.includes(selectedValue) : value === selectedValue;

      if (isSelected) {
        onDeselect?.(selectedValue);
      } else {
        onSelect?.(selectedValue);
      }

      onChange?.(selectedValue);
    },
    [onChange, onSelect, onDeselect, value],
  );

  if (loading) return <SelectDropdownTextContainer text="Загрузка..." />;
  if (!options.length) return <SelectDropdownTextContainer text="Нет данных" justify="center" />;

  return virtualize ? (
    <SelectDropdownOptionsVirtualized {...props} onChange={handleChange} />
  ) : (
    <SelectDropdownOptions {...props} onChange={handleChange} />
  );
};

/** Not Virtualized Options List */
type SelectDropdownOptionsProps = Omit<SelectDropdownMenuProps, 'virtualize' | 'loading' | 'onSelect' | 'onDeselect'>;
const SelectDropdownOptions = memo(({ id, activeIndex, multiple, value, options, labelWrap, hintWrap, onChange }: SelectDropdownOptionsProps) => {
  return (
    <div id={id} role="listbox" aria-multiselectable={multiple || undefined} className={b()}>
      {options.map((option, index) => {
        return (
          <SelectOption
            key={option.value}
            id={`${id}-option-${index}`}
            isActive={index === activeIndex}
            isSelected={Array.isArray(value) ? value.includes(option.value) : option.value === value}
            labelWrap={labelWrap}
            hintWrap={hintWrap}
            onChange={onChange}
            {...option}
          />
        );
      })}
    </div>
  );
});

/** Virtualized Options List */
const SelectDropdownOptionsVirtualized = memo(
  ({ id, activeIndex, multiple, value, options, labelWrap, hintWrap, onChange }: SelectDropdownOptionsProps) => {
    const parentRef = React.useRef<HTMLDivElement>(null);

    const virtualizer = useVirtualizer({
      count: options.length,
      getScrollElement: () => parentRef.current,
      estimateSize: () => 56,
    });

    const virtualOptions = virtualizer.getVirtualItems();
    return (
      <div id={id} role="listbox" aria-multiselectable={multiple || undefined} ref={parentRef} className={b()} style={{ height: getVirtualListDropdownHeight(virtualOptions.length) }}>
        <div className={b('virtualListContainer')} style={{ height: virtualizer.getTotalSize() }}>
          <div
            className={b('virtualListWrapper')}
            style={{ transform: `translateY(${virtualOptions[0]?.start ?? 0}px)` }}
          >
            {virtualOptions.map(virtualItem => {
              const option = options[virtualItem.index];
              return (
                <SelectOption
                  dataIndex={virtualItem.index}
                  id={`${id}-option-${virtualItem.index}`}
                  isActive={virtualItem.index === activeIndex}
                  key={virtualItem.key}
                  ref={virtualizer.measureElement}
                  isSelected={Array.isArray(value) ? value.includes(option.value) : option.value === value}
                  labelWrap={labelWrap}
                  hintWrap={hintWrap}
                  onChange={onChange}
                  {...option}
                />
              );
            })}
          </div>
        </div>
      </div>
    );
  },
);
