import { useState, useEffect } from "react";

interface NumberInputProps {
  initialValue?: number;
  className?: string;
  onChange?: (value: number) => void;
}

export function NumberInput({
  initialValue = 0,
  className,
  onChange,
}: NumberInputProps) {
  const [_value, setValue] = useState<number>(initialValue);
  const [display, setDisplay] = useState<string>(initialValue.toString());

  useEffect(() => {
    setValue(initialValue);
    setDisplay(initialValue.toString());
  }, [initialValue]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setDisplay(e.target.value);
  };

  const handleBlur = () => {
    const parsed = parseFloat(display);
    const isValid = !isNaN(parsed);
    const newValue = isValid ? parsed : 0;
    setValue(newValue);
    setDisplay(newValue.toString());
    onChange?.(newValue);
  };

  return (
    <input
      type="number"
      className={className}
      value={display}
      onChange={handleChange}
      onBlur={handleBlur}
    />
  );
}
