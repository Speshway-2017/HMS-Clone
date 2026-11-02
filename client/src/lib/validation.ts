export const MAX_LENGTHS = {
  NAME: 100,
  CODE: 20,
  EMAIL: 100,
  PHONE: 10,
  PASSWORD: 100,
  ADDRESS: 250,
  TITLE: 150,
  SHORT_TEXT: 100,
  MEDIUM_TEXT: 250,
  LONG_TEXT: 500,
  NOTE: 1000,
  CONTENT: 50000,
  URL: 500,
  MEDICINE_NAME: 100,
  DOSAGE: 50,
  FREQUENCY: 50,
  DURATION: 50,
  INSTRUCTIONS: 200,
  REASON: 500,
  SKU: 50,
  POLICY_NO: 50,
  EMPLOYEE_ID: 50,
  LICENSE_NO: 50,
  QUALIFICATION: 100,
  SPECIALIZATION: 100,
} as const;

export const PATTERNS = {
  EMAIL: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
  PHONE: /^[0-9]{10}$/,
  CLEAN_PHONE: /[\s\-\(\)\.]/g,
  CODE: /^[A-Za-z0-9\-_]+$/,
  URL: /^https?:\/\/.+/i,
  TIME: /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/,
} as const;

export const cleanPhone = (val: string): string => val.replace(PATTERNS.CLEAN_PHONE, "");

export const isValidEmail = (email: string): boolean => {
  if (!email || !email.trim()) return false;
  const trimmed = email.trim();
  if (trimmed.includes("..")) return false;
  return PATTERNS.EMAIL.test(trimmed);
};

export const isValidPhone = (phone: string): boolean => {
  if (!phone || !phone.trim()) return false;
  const digitsOnly = phone.replace(/\D/g, "");
  if (digitsOnly.length !== 10) return false;
  if (/^(\d)\1{9}$/.test(digitsOnly)) return false;
  return PATTERNS.PHONE.test(digitsOnly);
};

export const isValidUrl = (url: string): boolean => {
  if (!url || !url.trim()) return false;
  return PATTERNS.URL.test(url.trim());
};

export const isValidCode = (code: string): boolean => {
  if (!code || !code.trim()) return false;
  return PATTERNS.CODE.test(code.trim());
};

export interface ValidationRule {
  required?: boolean;
  min?: number;
  max?: number;
  minLength?: number;
  maxLength?: number;
  isEmail?: boolean;
  isPhone?: boolean;
  isUrl?: boolean;
  isCode?: boolean;
  pattern?: RegExp;
  patternMessage?: string;
  custom?: (val: any) => string | null | undefined;
}

export function validateValue(value: any, rules: ValidationRule, fieldLabel = "Field"): string | null {
  const isStr = typeof value === "string";
  const strVal = isStr ? value.trim() : "";
  const isEmpty = value === undefined || value === null || (isStr && strVal === "");

  if (rules.required && isEmpty) {
    return `${fieldLabel} is required`;
  }

  if (isEmpty) {
    return null; // Optional and empty
  }

  // String length checks
  if (isStr) {
    if (rules.minLength && value.length < rules.minLength) {
      return `${fieldLabel} must be at least ${rules.minLength} characters`;
    }
    if (rules.maxLength && value.length > rules.maxLength) {
      return `${fieldLabel} cannot exceed ${rules.maxLength} characters`;
    }
    if (rules.isEmail && !PATTERNS.EMAIL.test(strVal)) {
      return "Please enter a valid email address";
    }
    if (rules.isPhone) {
      const clean = strVal.replace(PATTERNS.CLEAN_PHONE, "");
      if (!PATTERNS.PHONE.test(clean)) {
        return "Please enter a valid 10-digit phone number";
      }
    }
    if (rules.isUrl && !PATTERNS.URL.test(strVal)) {
      return "Please enter a valid URL starting with http:// or https://";
    }
    if (rules.isCode && !PATTERNS.CODE.test(strVal)) {
      return `${fieldLabel} must contain only letters, numbers, hyphens, and underscores`;
    }
    if (rules.pattern && !rules.pattern.test(strVal)) {
      return rules.patternMessage || `${fieldLabel} format is invalid`;
    }
  }

  // Number checks
  if (typeof value === "number" || (!isNaN(Number(value)) && isStr && strVal !== "")) {
    const num = Number(value);
    if (isNaN(num)) {
      return `${fieldLabel} must be a valid number`;
    }
    if (rules.min !== undefined && num < rules.min) {
      return `${fieldLabel} must be at least ${rules.min}`;
    }
    if (rules.max !== undefined && num > rules.max) {
      return `${fieldLabel} cannot exceed ${rules.max}`;
    }
  }

  if (rules.custom) {
    const customErr = rules.custom(value);
    if (customErr) return customErr;
  }

  return null;
}
