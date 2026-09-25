import { ChangeEvent } from 'react';

/**
 * Функция генерирует React Event программно
 *
 * На вход получает реф на инпут и onChange коллбэк
 * @params input
 * @params onChange
 * */
export const generateInputEvent = (
  input: HTMLInputElement | null,
  onChange: (event: ChangeEvent<HTMLInputElement>) => void,
) => {
  if (!input) return;

  const event = new Event('input', { bubbles: true });
  input.value = '';

  /**
   * Генерит onInput event
   * */
  input.dispatchEvent(event);

  /**
   * Генерит onChange event.
   * Закомментирован т.к. компонент Input использует @maskito для наложения масок,
   * а @maskito для контролируемого поведения реагирует на onInput вместо onChange.
   *
   * Раскомментировать если в компоненте BaseInput вместо onInput, будет использоваться onChange.
   * */
  // let mockChangeEvent = {
  //   target: input,
  //   currentTarget: input,
  // } as ChangeEvent<HTMLInputElement>;
  //
  // onChange(mockChangeEvent);
};
