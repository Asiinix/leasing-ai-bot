import { ChangeEvent, HTMLProps, ReactNode } from 'react';

type NativeTextareaProps = Omit<HTMLProps<HTMLTextAreaElement>, 'onChange' | 'value' | 'cols'>;

export type TextareaPayload = { value: string; name: string };
export type TextareaChangeHandler = (e: ChangeEvent<HTMLTextAreaElement>, payload: TextareaPayload) => void;

export type TextareaProps = {
  /** Имя класса для textarea */
  className?: string;

  /** Имя класса для обертки */
  classNameWrapper?: string;

  /** Лэйбл textarea */
  label?: string;

  /** Тип лейбла внешний/внутренний */
  labelType?: 'inner' | 'outer';

  /** Ошибка */
  error?: ReactNode;

  /** Подсказка */
  hint?: ReactNode;

  /** Включен/выключен */
  disabled?: boolean;

  /** Растягивать ли элемент на всю ширину */
  fullWidth?: boolean;

  /** Показывать ли счетчик символов */
  showLettersLimit?: boolean;

  /** Максимальное кол-во символов */
  maxLength?: number;

  /** Обработчик события изменения */
  onChange?: TextareaChangeHandler;

  /** Значения textarea */
  value?: string;

  /**
   * Идентификатор для систем автоматизированного тестирования
   */
  dataTestId?: string;
} & NativeTextareaProps;
