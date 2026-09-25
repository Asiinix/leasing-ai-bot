/**
 * Для виртуализации нужно явно указать высоту контейнера
 *  - максимальная высота контейнера 6 элементов
 *  - в среднем высота опции 56px
 *  - 8 нижний паддинг,
 *
 *  Мапа высот контейнера если всего 1,2 ... 6 элементов и больше.
 * */

export const OptionsHeightMap = {
  '1': 56 + 8,
  '2': 56 * 2 + 8,
  '3': 56 * 3 + 8,
  '4': 56 * 4 + 8,
  '5': 56 * 5 + 8,
  '6': 56 * 6 + 8,
};

export const getVirtualListDropdownHeight = (count: number) => {
  if (count > 6) return OptionsHeightMap['6'];
  if (count < 1) return OptionsHeightMap['1'];
  return OptionsHeightMap[count];
};
