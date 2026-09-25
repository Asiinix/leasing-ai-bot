import React from 'react';
import { TextareaProps } from './Textarea.type';
import './Textarea.scss';
export declare const Textarea: React.ForwardRefExoticComponent<Omit<TextareaProps, "ref"> & React.RefAttributes<HTMLTextAreaElement>>;
