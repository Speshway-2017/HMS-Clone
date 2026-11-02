import { z } from "zod";

// Phone: 10 to 15 digits, allows leading +, spaces, hyphens, parentheses
export const PHONE_REGEX = /^\+?[0-9]{10,15}$/;
export const cleanPhone = (val: string) => val.replace(/[\s\-\(\)\.]/g, "");

export const isCleanPhoneValid = (val: string) => {
  if (!val) return true;
  const digitsOnly = val.replace(/\D/g, "");
  if (digitsOnly.length < 10 || digitsOnly.length > 15) return false;
  const cleaned = cleanPhone(val);
  return PHONE_REGEX.test(cleaned);
};

// URL regex
export const URL_REGEX = /^https?:\/\/.+/i;

// Code regex: alphanumeric, hyphens, underscores
export const CODE_REGEX = /^[A-Za-z0-9\-_]+$/;

// Common String Validators
export const requiredTrimmedString = (fieldName: string, min = 1, max = 100) =>
  z
    .string({ invalid_type_error: `${fieldName} must be a string` })
    .trim()
    .min(min, `${fieldName} is required and must be at least ${min} character(s)`)
    .max(max, `${fieldName} cannot exceed ${max} characters`);

export const optionalTrimmedString = (fieldName: string, max = 100, defaultVal = "") =>
  z
    .string({ invalid_type_error: `${fieldName} must be a string` })
    .trim()
    .max(max, `${fieldName} cannot exceed ${max} characters`)
    .optional()
    .default(defaultVal);

export const emailValidator = (fieldName = "Email", required = true, max = 254) => {
  const schema = z
    .string({ invalid_type_error: `${fieldName} must be a string` })
    .trim()
    .max(max, `${fieldName} cannot exceed ${max} characters`);

  if (required) {
    return schema
      .min(1, `${fieldName} is required`)
      .email(`Please enter a valid ${fieldName.toLowerCase()} address`);
  }

  return schema
    .optional()
    .refine((val) => !val || z.string().email().safeParse(val).success, {
      message: `Please enter a valid ${fieldName.toLowerCase()} address`,
    })
    .default("");
};

export const NAME_REGEX = /^[a-zA-Z\s'-]+$/;
export const ADDRESS_REGEX = /^[a-zA-Z0-9\s,.\-#/'()]+$/;
export const PASSWORD_COMPLEXITY_REGEX = /^(?=.*[a-zA-Z])(?=.*[0-9!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).+$/;

export const nameValidator = (fieldName = "Name", min = 2, max = 50, required = true) => {
  const schema = z
    .string({ invalid_type_error: `${fieldName} must be a string` })
    .trim()
    .min(required ? min : 0, required ? `${fieldName} is required and must be at least ${min} characters` : undefined)
    .max(max, `${fieldName} cannot exceed ${max} characters`);

  if (required) {
    return schema.regex(NAME_REGEX, `${fieldName} can only contain letters, spaces, hyphens, and apostrophes`);
  }
  return schema
    .optional()
    .refine((val) => !val || NAME_REGEX.test(val), {
      message: `${fieldName} can only contain letters, spaces, hyphens, and apostrophes`,
    })
    .default("");
};

export const addressValidator = (fieldName = "Address", min = 5, max = 250, required = true) => {
  const schema = z
    .string({ invalid_type_error: `${fieldName} must be a string` })
    .trim()
    .min(required ? min : 0, required ? `${fieldName} is required and must be at least ${min} characters` : undefined)
    .max(max, `${fieldName} cannot exceed ${max} characters`);

  if (required) {
    return schema.regex(ADDRESS_REGEX, `${fieldName} can only contain letters, numbers, spaces, commas, periods, hyphens, and slashes`);
  }
  return schema
    .optional()
    .refine((val) => !val || ADDRESS_REGEX.test(val), {
      message: `${fieldName} can only contain letters, numbers, spaces, commas, periods, hyphens, and slashes`,
    })
    .default("");
};

export const passwordValidator = (fieldName = "Password", min = 8, max = 64) =>
  z
    .string({ invalid_type_error: `${fieldName} must be a string` })
    .min(min, `${fieldName} must be at least ${min} characters long`)
    .max(max, `${fieldName} cannot exceed ${max} characters`)
    .regex(
      PASSWORD_COMPLEXITY_REGEX,
      `${fieldName} must contain at least one letter and at least one number or special character`
    );

export const phoneValidator = (fieldName = "Phone number", required = false) => {
  const schema = z
    .string({ invalid_type_error: `${fieldName} must be a string` })
    .trim()
    .max(20, `${fieldName} cannot exceed 20 characters`);

  if (required) {
    return schema
      .min(1, `${fieldName} is required`)
      .refine(isCleanPhoneValid, {
        message: `${fieldName} must be between 10 and 15 digits`,
      });
  }

  return schema
    .optional()
    .refine((val) => !val || isCleanPhoneValid(val), {
      message: `${fieldName} must be between 10 and 15 digits`,
    })
    .default("");
};

export const tenDigitPhoneValidator = (fieldName = "Primary Phone", required = false) => {
  const schema = z
    .string({ invalid_type_error: `${fieldName} must be a string` })
    .trim()
    .max(10, `${fieldName} cannot exceed 10 digits`);

  if (required) {
    return schema
      .min(1, `${fieldName} is required`)
      .refine((val) => /^[0-9]{10}$/.test(val) && !/^(\d)\1{9}$/.test(val), {
        message: `Please enter a valid 10-digit ${fieldName.toLowerCase()}`,
      });
  }

  return schema
    .optional()
    .refine((val) => !val || (/^[0-9]{10}$/.test(val) && !/^(\d)\1{9}$/.test(val)), {
      message: `Please enter a valid 10-digit ${fieldName.toLowerCase()}`,
    })
    .default("");
};

export const urlValidator = (fieldName = "URL", max = 500) =>
  z
    .string({ invalid_type_error: `${fieldName} must be a string` })
    .trim()
    .max(max, `${fieldName} cannot exceed ${max} characters`)
    .optional()
    .refine((val) => !val || URL_REGEX.test(val), {
      message: `${fieldName} must be a valid URL starting with http:// or https://`,
    })
    .default("");

export const codeValidator = (fieldName = "Code", min = 1, max = 20, required = false) => {
  const schema = z
    .string({ invalid_type_error: `${fieldName} must be a string` })
    .trim()
    .max(max, `${fieldName} cannot exceed ${max} characters`);

  if (required) {
    return schema
      .min(min, `${fieldName} is required`)
      .regex(CODE_REGEX, `${fieldName} must contain only letters, numbers, hyphens, and underscores`);
  }

  return schema
    .optional()
    .refine((val) => !val || CODE_REGEX.test(val), {
      message: `${fieldName} must contain only letters, numbers, hyphens, and underscores`,
    })
    .default("");
};

export const numberValidator = (
  fieldName: string,
  min = 0,
  max = 1000000,
  required = false,
  defaultVal = 0
) => {
  const schema = z.coerce
    .number({ invalid_type_error: `${fieldName} must be a valid number` })
    .min(min, `${fieldName} cannot be less than ${min}`)
    .max(max, `${fieldName} cannot exceed ${max}`);

  if (required) {
    return schema;
  }
  return schema.optional().default(defaultVal);
};
