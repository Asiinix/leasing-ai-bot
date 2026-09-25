export type Keys = Record<string, number> & Record<KeyboardKeys, number>;
export type KeyboardKeys = 'BACKSPACE' | 'TAB' | 'ENTER' | 'CAPS_LOCK' | 'ESC' | 'SPACE' | 'PAGE_UP' | 'PAGE_DOWN' | 'END' | 'HOME' | 'LEFT' | 'UP' | 'RIGHT' | 'DOWN' | 'INSERT' | 'DELETE' | number;
export declare const Keys: Keys;
export declare const isKeyCode: (code: number, keys: Array<KeyboardKeys | number>) => boolean;
