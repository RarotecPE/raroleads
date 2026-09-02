"use client";

import { useState, type ChangeEvent, type InputHTMLAttributes } from "react";
import { inputCls } from "@/components/ui";
import { cnpjDigits, formatCnpj } from "@/lib/cnpj";
import { cn } from "@/lib/utils";

type CnpjInputProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "defaultValue" | "maxLength" | "name" | "onChange" | "type" | "value"
> & {
  name: string;
  defaultValue?: string | null;
};

export function CnpjInput({ name, defaultValue, className, ...props }: CnpjInputProps) {
  const [digits, setDigits] = useState(() => cnpjDigits(defaultValue ?? ""));

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    setDigits(cnpjDigits(event.target.value));
  }

  return (
    <>
      <input type="hidden" name={name} value={digits} />
      <input
        {...props}
        type="text"
        value={formatCnpj(digits)}
        onChange={handleChange}
        inputMode="numeric"
        maxLength={18}
        className={cn(inputCls, className)}
      />
    </>
  );
}
