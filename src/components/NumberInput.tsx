import React from 'react';
import { Input } from '@/components/ui/input';

interface NumberInputProps {
  value: string;
  onChange: (value: string) => void;
  decimal?: boolean;
  onFocus?: React.FocusEventHandler<HTMLInputElement>;
  onBlur?: React.FocusEventHandler<HTMLInputElement>;
  className?: string;
  placeholder?: string;
}

export const NumberInput: React.FC<NumberInputProps> = ({ value, onChange, decimal, onFocus, onBlur, className, placeholder }) => {
  const handleFocus: React.FocusEventHandler<HTMLInputElement> = (e) => {
    if (value === '0') {
      onChange('');
      e.currentTarget.select();
    }
    onFocus?.(e);
  };

  const handleBlur: React.FocusEventHandler<HTMLInputElement> = (e) => {
    if (value === '') {
      onChange('0');
    }
    onBlur?.(e);
  };

  const handleChange: React.ChangeEventHandler<HTMLInputElement> = (e) => {
    const v = e.target.value;
    const regex = decimal ? /^\d*(\.\d*)?$/ : /^\d*$/;
    if (regex.test(v)) {
      onChange(v);
    }
  };

  return (
    <Input
      value={value}
      onChange={handleChange}
      onFocus={handleFocus}
      onBlur={handleBlur}
      inputMode={decimal ? 'decimal' : 'numeric'}
      min={0}
      className={className}
      placeholder={placeholder ?? '0'}
    />
  );
};
