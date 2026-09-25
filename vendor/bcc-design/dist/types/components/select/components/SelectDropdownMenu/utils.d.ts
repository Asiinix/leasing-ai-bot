/**
 * Для виртуализации нужно явно указать высоту контейнера
 *  - максимальная высота контейнера 6 элементов
 *  - в среднем высота опции 56px
 *  - 8 нижний паддинг,
 *
 *  Мапа высот контейнера если всего 1,2 ... 6 элементов и больше.
 * */
export declare const OptionsHeightMap: {
    '1': number;
    '2': number;
    '3': number;
    '4': number;
    '5': number;
    '6': number;
};
export declare const getVirtualListDropdownHeight: (count: number) => any;
