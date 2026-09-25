'use client';

import React, { ChangeEvent, useCallback, useEffect, useRef } from 'react';
import { useFocus } from '../../hooks/useFocus';
import { block } from '../../utilities/cn';
import { mergeRefs } from '../../utilities/mergeRefs';

import { TextareaProps } from './Textarea.type';

import './Textarea.scss';

const b = block('textarea');

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>((props, ref) => {
  const {
    className,
    classNameWrapper,
    label,
    disabled,
    labelType = 'outer',
    error,
    hint,
    rows,
    fullWidth,
    placeholder,
    maxLength,
    dataTestId,
    showLettersLimit = true,
    value,
    onChange,
    name = '',
    ...rest
  } = props;
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const isControlled = typeof value !== 'undefined';
  const currentValue = isControlled ? value : textareaRef.current?.value;

  const [focus] = useFocus(textareaRef);
  const [textCount, setTextCount] = React.useState(currentValue?.length || 0);

  const handleChange = useCallback(
    (e: ChangeEvent<HTMLTextAreaElement>) => {
      if (!isControlled) {
        setTextCount(e.target.value.length);
      }

      onChange?.(e, { value: e.target.value, name });
    },
    [onChange, name, isControlled],
  );

  useEffect(() => {
    setTextCount(currentValue?.length || 0);
  }, [currentValue]);

  const isError = Boolean(error);
  const isInnerLabelCollapsed = focus || Boolean(currentValue);
  const isCaptionActive = Boolean(error || hint || (maxLength && showLettersLimit));
  const showLimiter = showLettersLimit && typeof maxLength !== 'undefined';

  return (
    <div className={b('container', { fullWidth })} data-test-id={props.dataTestId}>
      <label className={b('outer-label', { show: labelType === 'outer' })}>{label}</label>

      <div className={b('wrapper', { focus, error: isError, disabled }, classNameWrapper)}>
        <label
          className={b('inner-label', {
            show: labelType === 'inner',
            collapsed: isInnerLabelCollapsed,
          })}
        >
          {label}
        </label>

        <textarea
          className={b('textarea', { labelType, error: isError, disabled }, className)}
          ref={mergeRefs([ref, textareaRef])}
          {...rest}
          value={value}
          onChange={handleChange}
          rows={rows}
          disabled={disabled}
          maxLength={maxLength}
          placeholder={labelType === 'inner' ? undefined : placeholder}
        />
      </div>

      <div
        className={b('caption', {
          error: isError,
          active: isCaptionActive,
        })}
      >
        <div className={b('caption_text')}>{error || hint}&nbsp;</div>
        <div className={b('limiter', { hidden: !showLimiter, disabled })}>
          {textCount}/{maxLength}
        </div>
      </div>
    </div>
  );
});

Textarea.displayName = 'Textarea';
