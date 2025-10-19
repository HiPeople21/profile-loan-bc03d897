import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function maskName(fullName: string | null): string {
  if (!fullName) return "Anonymous";
  
  const names = fullName.trim().split(" ");
  
  if (names.length === 1) {
    const name = names[0];
    return name.charAt(0) + "*".repeat(Math.max(0, name.length - 1));
  }
  
  return names.map(name => {
    if (name.length === 0) return "";
    return name.charAt(0) + "*".repeat(Math.max(0, name.length - 1));
  }).join(" ");
}
