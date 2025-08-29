import React, { useEffect } from 'react';
import { Input } from '@/components/ui/input';

interface NumberInputProps extends React.ComponentProps<typeof Input> {
  value: string;
  onValueChange: (value: string) => void;
  allowDecimal?: boolean;
}

const NumberInput = React.forwardRef<HTMLInputElement, NumberInputProps>(
  ({ value, onValueChange, allowDecimal = false, onFocus, onBlur, onChange, ...props }, ref) => {
    const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
      if (value === '0') {
        onValueChange('');
        requestAnimationFrame(() => e.currentTarget.select());
      }
      onFocus?.(e);
    };

    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
      if (value === '') {
        onValueChange('0');
      }
      onBlur?.(e);
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value;
      const regex = allowDecimal ? /^\d*(?:[\.\,]?\d*)?$/ : /^\d*$/;
      if (regex.test(val)) {
        onValueChange(val.replace(',', '.'));
      }
      onChange?.(e);
    };

    return (
      <Input
        {...props}
        ref={ref}
        value={value}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onChange={handleChange}
        placeholder="0"
        inputMode={allowDecimal ? 'decimal' : 'numeric'}
        min={0}
      />
    );
  }
);
NumberInput.displayName = 'NumberInput';

export default NumberInput;
