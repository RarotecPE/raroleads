"use client";

import { useState, type ChangeEvent, type InputHTMLAttributes } from "react";
import { inputCls } from "@/components/ui";
import { formatPhone, phoneDigits } from "@/lib/phone";
import { cn } from "@/lib/utils";

type PhoneInputProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "defaultValue" | "maxLength" | "name" | "onChange" | "type" | "value"
> & {
  name: string;
  defaultValue?: string | null;
};

export function PhoneInput({ name, defaultValue, className, ...props }: PhoneInputProps) {
  const [digits, setDigits] = useState(() => phoneDigits(defaultValue ?? ""));

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    setDigits(phoneDigits(event.target.value));
  }

  return (
    <>
      <input type="hidden" name={name} value={digits} />
      <input
        {...props}
        type="tel"
        value={formatPhone(digits)}
        onChange={handleChange}
        inputMode="numeric"
        maxLength={14}
        className={cn(inputCls, className)}
      />
    </>
  );
}
