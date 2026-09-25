'use client';

import { memo, useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { Dropdown } from '../dropdown';
import { Input, InputOnChangeHandler } from '../input';
import { Box } from '../layout/box';
import { useBoolean } from '../../hooks/useBoolean';
import { useFocus } from '../../hooks/useFocus';
import { block } from '../../utilities/cn';

import { ChevroneDownIcon } from './components/ChevroneDownIcon';
import { SelectDropdownMenu } from './components/SelectDropdownMenu';
import { SelectInternalState, SelectProps, SelectSingleValue, SelectValue } from './Select.type';
import {
  getInputSelectValue,
  getNewMultipleSelectValue,
  getSelectFilteredOptions,
  getSelectOptionsMap,
  getSelectPlaceholderValue,
} from './utils';

import './Select.scss';

const b = block('select');

const EMPTY_ARRAY = [];
export const Select = memo(
  ({
    value,
    options = EMPTY_ARRAY,
    multiple,
    allowSearch = true,
    closeAfterSelect = true,
    virtualize,
    loading,
    filterOptions = true,
    clearSearchValueSearchBlur = true,
    searchValue,

    onChange,
    onSelect,
    onDeselect,
    onOpen,
    onClose,
    onClear,
    onSearch,

    optionsWrap,
    className,
    style,

    name = '',
    ...restInputProps
  }: SelectProps) => {
    /** values */
    const inputRef = useRef<HTMLInputElement>(null);
    const [portalContainer, setPortalContainer] = useState<Element | undefined>(undefined);
    const listId = useId();
    const [activeIndex, setActiveIndex] = useState(-1);
    const [focused] = useFocus(inputRef);

    const isControlled = typeof value !== 'undefined';
    const isControlledSearch = typeof searchValue !== 'undefined';
    const ValuesMap = useMemo(() => getSelectOptionsMap(options), [options]);

    const { label: labelWrap = 'ellipsis', hint: hintWrap = 'ellipsis' } = optionsWrap || {};

    const {
      value: open,
      setTrue: setOpen,
      setFalse: setClose,
    } = useBoolean(false, {
      onTrue: onOpen,
      onFalse: onClose,
    });
    const [internalState, setInternalState] = useState<SelectInternalState>({
      mode: 'value',
      search: '',
      options: options,
      value: null,
    });
    const currentValue = isControlled ? value : internalState.value;

    /** handlers */
    const handleChange = useCallback(
      (selectedValue: null | SelectSingleValue) => {
        let newValue: SelectValue;

        if (multiple) {
          newValue = getNewMultipleSelectValue(selectedValue, currentValue);
        } else {
          newValue = selectedValue;
        }

        onChange?.({ value: newValue, name: name, target: { value: newValue } });

        setInternalState(prev => ({ ...prev, value: newValue, search: '', options }));

        if (closeAfterSelect && !multiple) {
          setClose();
        }
      },
      [currentValue, multiple, options, closeAfterSelect, name, onChange, setClose],
    );

    const handleOnClear = useCallback(() => {
      onClear?.();
      handleChange(null);
    }, [onClear, handleChange, focused]);

    const handleSearch: InputOnChangeHandler = useCallback(
      (_, payload) => {
        if (allowSearch && internalState.mode === 'search') {
          const value = payload.value;
          setInternalState(prev => ({
            ...prev,
            search: value,
            options: filterOptions ? getSelectFilteredOptions(value, options) : options,
          }));
          onSearch?.(value);
        }
      },
      [allowSearch, internalState.mode, filterOptions, onSearch, options],
    );

    useEffect(() => {
      if (focused && allowSearch) {
        setInternalState(prev => ({ ...prev, mode: 'search' }));
      } else {
        if (clearSearchValueSearchBlur) onSearch?.('');
        setInternalState(prev => ({ ...prev, mode: 'value', search: '', options }));
      }
    }, [focused, allowSearch, clearSearchValueSearchBlur]);

    const optionsString = useMemo(() => JSON.stringify(options), [options]);
    useEffect(() => {
      setInternalState(prev => ({ ...prev, options }));
    }, [optionsString]);

    const InputValue = getInputSelectValue(currentValue, ValuesMap);
    const SearchValue = isControlledSearch ? searchValue : internalState.search;
    const visibleOptions = internalState.options;
    const selectedIndex = visibleOptions.findIndex(option =>
      !option.disabled && (Array.isArray(currentValue) ? currentValue.includes(option.value) : option.value === currentValue),
    );
    const focusedIndex = visibleOptions[activeIndex] && !visibleOptions[activeIndex].disabled
      ? activeIndex
      : selectedIndex >= 0 ? selectedIndex : visibleOptions.findIndex(option => !option.disabled);

    useEffect(() => {
      if (!open) return;
      document.getElementById(`${listId}-option-${focusedIndex}`)?.scrollIntoView({ block: 'nearest' });
    }, [open, focusedIndex, listId]);

    const openMenu = () => {
      if (restInputProps.disabled) return;
      // A native modal makes body portals inert; keep its options in the same top layer.
      setPortalContainer(inputRef.current?.closest('dialog') ?? undefined);
      setActiveIndex(-1);
      setOpen();
    };

    const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
      if (restInputProps.disabled) return;
      if (event.key === 'Escape') {
        if (open) { event.preventDefault(); event.stopPropagation(); }
        setClose();
      } else if (event.key === 'Tab') {
        setClose();
      } else if (event.key === 'Enter' || (!allowSearch && event.key === ' ')) {
        event.preventDefault();
        if (!open) { openMenu(); setActiveIndex(focusedIndex); }
        else if (focusedIndex >= 0 && !loading) {
          const option = visibleOptions[focusedIndex];
          const selected = Array.isArray(currentValue) ? currentValue.includes(option.value) : option.value === currentValue;
          (selected ? onDeselect : onSelect)?.(option.value);
          handleChange(option.value);
        }
      } else if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key) && (!allowSearch || open)) {
        event.preventDefault();
        const enabled = visibleOptions.map((option, index) => option.disabled ? -1 : index).filter(index => index >= 0);
        if (!enabled.length) return;
        if (!open) { openMenu(); setActiveIndex(focusedIndex); return; }
        const position = enabled.indexOf(focusedIndex);
        const next = event.key === 'Home' ? 0 : event.key === 'End' ? enabled.length - 1
          : (position + (event.key === 'ArrowDown' ? 1 : -1) + enabled.length) % enabled.length;
        setActiveIndex(enabled[next]);
      }
    };

    return (
      <Dropdown
        portalContainer={portalContainer}
        isOpen={open}
        onClickOutside={setClose}
        matchAnchorWidth
        offset={restInputProps.hint || restInputProps.error ? -16 : 4}
        offsetLeft={0}
        offsetRight={0}
        aria-hidden={!open}
        className={className}
        style={style}
        content={
          <SelectDropdownMenu
            id={listId}
            activeIndex={activeIndex >= 0 ? focusedIndex : -1}
            multiple={multiple}
            value={currentValue}
            virtualize={virtualize}
            loading={loading}
            options={internalState.options}
            hintWrap={hintWrap}
            labelWrap={labelWrap}
            onChange={handleChange}
            onSelect={onSelect}
            onDeselect={onDeselect}
          />
        }
      >
        <Box className={b('inputWrapper', { fullWidth: restInputProps.fullWidth })}>
          <Input
            {...restInputProps}
            role="combobox"
            aria-label={restInputProps['aria-label'] ?? (typeof restInputProps.label === 'string' ? restInputProps.label : undefined)}
            aria-expanded={open}
            aria-controls={open ? listId : undefined}
            aria-haspopup="listbox"
            aria-autocomplete={allowSearch ? 'list' : 'none'}
            aria-activedescendant={open && focusedIndex >= 0 && !loading ? `${listId}-option-${focusedIndex}` : undefined}
            readOnly={!allowSearch}
            autoComplete="off"
            ref={inputRef}
            name={name}
            className={allowSearch ? undefined : b('hiddenCaret')}
            clear={internalState.mode === 'value' && restInputProps.clear}
            showFocus={open}
            onChange={handleSearch}
            placeholder={getSelectPlaceholderValue(internalState.mode, InputValue, restInputProps.placeholder)}
            value={internalState.mode === 'search' ? SearchValue : InputValue}
            rightAddon={
              <div className={b('rightAddons')}>
                {restInputProps.rightAddon}
                <ChevroneDownIcon isOpen={open} />
              </div>
            }
            onFocus={allowSearch ? openMenu : undefined}
            onClick={allowSearch ? openMenu : () => open ? setClose() : openMenu()}
            onBlur={setClose}
            onKeyDown={handleKeyDown}
            onClear={handleOnClear}
          />
        </Box>
      </Dropdown>
    );
  },
);
