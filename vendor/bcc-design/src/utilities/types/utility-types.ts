import React, { HTMLProps } from 'react';

export type Nullable<T> = T | null;

export type HTMLAttrsOf<T extends keyof React.JSX.IntrinsicElements> = {
  as?: keyof React.JSX.IntrinsicElements | React.ComponentType<T>;
} & HTMLProps<T>;
