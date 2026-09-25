import React, {
  AnimationEvent,
  forwardRef,
  memo,
  MouseEvent,
  MouseEventHandler,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import { block } from '../../../../utilities/cn';
import { mergeRefs } from '../../../../utilities/mergeRefs';

import { Flex } from '../../../layout/flex';
import { CloseIcon } from '../icons/CloseIcon';
import type { BaseInputProps } from './BaseInput.type';
import { generateInputEvent } from './BaseInput.utils';

import './BaseInput.scss';

const b = block('base-input');

export const BaseInput = memo(
  forwardRef<HTMLInputElement, BaseInputProps>(
    (
      {
        // FormControlProps
        fullWidth,
        disabled,
        error,
        hint,
        label,
        labelType,
        leftAddon,
        rightAddon,
        dataTestId,
        wrapperProps,
        showFocus,

        // Input Props
        clear = false,
        onFocus,
        onBlur,
        onChange,
        onClear,
        onClick,
        onMouseDown,
        onMouseUp,
        onAnimationStart,
        value,
        defaultValue,
        readOnly,
        FormControlComponent,
        focusAfterClear = true,
        className,
        ...restProps
      },
      ref,
    ) => {
      const uncontrolled = value === undefined;

      const inputRef = useRef<HTMLInputElement>(null);
      const wrapperRef = useRef<HTMLDivElement>(null);

      const [focused, setFocused] = useState(false);
      const [stateValue, setStateValue] = useState(defaultValue || '');

      const filled = Boolean(uncontrolled ? stateValue : value);
      const [autofilled, setAutofilled] = useState(false);

      // отображаем крестик только для заполненного и активного инпута
      const clearButtonVisible = clear && filled && !disabled && !readOnly;
      const hasInnerLabel = (label && labelType === 'inner') || false;

      const handleInputFocus = useCallback(
        (event: React.FocusEvent<HTMLInputElement>) => {
          if (!readOnly) {
            setFocused(true);
          }

          onFocus?.(event);
        },
        [onFocus, readOnly],
      );

      const handleInputBlur = useCallback(
        (event: React.FocusEvent<HTMLInputElement>) => {
          setFocused(false);

          onBlur?.(event);
        },
        [onBlur],
      );

      const handleInputChange = useCallback(
        (event: React.ChangeEvent<HTMLInputElement>) => {
          onChange?.(event, { value: event.target.value, name: event.target.name });

          if (uncontrolled) {
            setStateValue(event.target.value);
          }
        },
        [onChange, uncontrolled],
      );

      const handleClear = useCallback(
        (event: MouseEvent<HTMLButtonElement>) => {
          event.stopPropagation();
          if (!clearButtonVisible) return;

          if (uncontrolled) {
            setStateValue('');
          } else {
            /**
             * Если прокинут value, но не прокинут onClear, генерируем onChange event программно.
             * event.target.value этого ивента будет равен ""
             *
             * Не придется хэндлить отчистку через onClear каждый раз + хорошо интегрируется с react-hook-form.
             * */
            generateInputEvent(inputRef.current, handleInputChange);
          }

          onClear?.(event);

          if (inputRef.current && !focused && focusAfterClear) {
            inputRef.current.focus();
          }
        },
        [clearButtonVisible, focused, onClear, uncontrolled, focusAfterClear],
      );

      const handleFormControlClick: MouseEventHandler<HTMLDivElement> = useCallback(
        event => {
          event.stopPropagation();
          onClick?.(event);
          if (inputRef.current) inputRef.current.focus();
        },
        [onClick],
      );

      const handleAnimationStart = useCallback(
        (event: AnimationEvent<HTMLInputElement>) => {
          onAnimationStart?.(event);

          setAutofilled(event.animationName.includes('start'));
        },
        [onAnimationStart],
      );

      const renderRightAddons = () => {
        const renderRightAddons = Boolean(clear || rightAddon);

        return renderRightAddons ? (
          <Flex gap={4} alignItems="center">
            {clear ? (
              <button type="button" onClick={handleClear} className={b('clearIcon', { visible: clearButtonVisible })}>
                <CloseIcon aria-label="clear" />
              </button>
            ) : null}

            {rightAddon}
          </Flex>
        ) : null;
      };

      if (!FormControlComponent) return null;

      return (
        <FormControlComponent
          ref={wrapperRef}
          fullWidth={fullWidth}
          filled={filled || autofilled || focused}
          disabled={disabled}
          focused={focused || showFocus}
          error={error}
          labelType={labelType}
          label={label}
          hint={hint}
          onClick={handleFormControlClick}
          onMouseDown={onMouseDown}
          onMouseUp={onMouseUp}
          leftAddon={leftAddon}
          rightAddon={renderRightAddons()}
          {...wrapperProps}
        >
          <input
            {...restProps}
            className={b({ hasInnerLabel }, className)}
            disabled={disabled}
            readOnly={readOnly ? readOnly : false}
            ref={mergeRefs([ref, inputRef])}
            onBlur={handleInputBlur}
            onFocus={handleInputFocus}
            onChange={handleInputChange}
            onAnimationStart={handleAnimationStart}
            value={uncontrolled ? stateValue : (value as string)}
            aria-label={restProps['aria-label'] ?? (typeof label === 'string' ? label : 'bcc-input')}
            data-test-id={dataTestId}
          />
        </FormControlComponent>
      );
    },
  ),
);
