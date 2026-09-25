export declare const useTooltip: (_trigger: string) => {
    childRef: import("react").RefObject<HTMLDivElement | null>;
    tooltipRef: import("react").RefObject<HTMLDivElement | null>;
    coords: {
        top: number;
        left: number;
    };
    setCoords: import("react").Dispatch<import("react").SetStateAction<{
        top: number;
        left: number;
    }>>;
    visible: boolean;
    hideTooltip: () => void;
    showTooltip: () => void;
};
