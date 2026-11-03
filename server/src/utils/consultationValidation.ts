/**
 * Shared Consultation Workspace Validation Rules for HMS Backend
 */

export const CONSULTATION_LIMITS = {
  CHIEF_COMPLAINT: 500,
  DIAGNOSIS: 200,
  SYMPTOMS: 500,
  CLINICAL_NOTES: 1000,
  TREATMENT_PLAN: 1000,
  ADVICE: 500,

  MEDICINE_NAME: 150,
  MEDICINE_STRENGTH: 50,
  DOSAGE: 50,
  FREQUENCY: 50,
  DURATION: 50,

  RADIOLOGY_NOTES: 500,

  PRIMARY_DIAGNOSIS: 200,
  EXPECTED_STAY: 50,
  ADMISSION_REASON: 500,
  ADMISSION_CLINICAL_NOTES: 1000,
  SPECIAL_INSTRUCTIONS: 1000,
};

export interface ValidationResult {
  isValid: boolean;
  error: string | null;
}

export function validateClinicalText(
  val: string | undefined | null,
  fieldName: string,
  maxLen: number,
  required = false,
  customInvalidMsg?: string
): string | null {
  const trimmed = typeof val === "string" ? val.trim() : "";
  if (!trimmed) {
    if (required) return `${fieldName} is required`;
    return null;
  }

  if (trimmed.length > maxLen) {
    return "Maximum allowed character limit exceeded";
  }

  const hasAlphanumeric = /[a-zA-Z0-9]/.test(trimmed);
  const hasScriptOrTag = /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>|javascript:|<[^>]*>/i.test(trimmed);
  if (!hasAlphanumeric || hasScriptOrTag) {
    return customInvalidMsg || "Please enter valid data";
  }

  return null;
}

// Phase 2: Vitals
export function validateTemperature(val: string | undefined | null): string | null {
  const trimmed = typeof val === "string" ? val.trim() : "";
  if (!trimmed) return null;

  // Numeric check (reject alphabetic characters, unsupported special chars, malformed decimals)
  if (!/^\d+(\.\d+)?$/.test(trimmed)) {
    return "Please enter a valid temperature in °F";
  }

  const num = parseFloat(trimmed);
  if (isNaN(num)) {
    return "Please enter a valid temperature in °F";
  }

  // Clinical limits for Fahrenheit (70°F - 115°F broad, typical 90°F - 110°F)
  if (num < 90 || num > 110) {
    return "Temperature is outside the allowed range";
  }

  return null;
}

export function validateBloodPressure(val: string | undefined | null): string | null {
  const trimmed = typeof val === "string" ? val.trim() : "";
  if (!trimmed) return null;

  // Combined systolic/diastolic format e.g. 120/80
  const match = trimmed.match(/^(\d{2,3})\s*[\/]\s*(\d{2,3})$/);
  if (!match) {
    return "Please enter a valid blood pressure value (e.g., 120/80)";
  }

  const systolic = parseInt(match[1], 10);
  const diastolic = parseInt(match[2], 10);

  if (
    isNaN(systolic) ||
    isNaN(diastolic) ||
    systolic < 50 ||
    systolic > 260 ||
    diastolic < 30 ||
    diastolic > 160 ||
    systolic <= diastolic
  ) {
    return "Please enter a valid blood pressure value (e.g., 120/80)";
  }

  return null;
}

export function validatePulseRate(val: string | undefined | null): string | null {
  const trimmed = typeof val === "string" ? val.trim() : "";
  if (!trimmed) return null;

  if (!/^\d{1,3}$/.test(trimmed)) {
    return "Please enter a valid pulse rate";
  }

  const num = parseInt(trimmed, 10);
  if (isNaN(num) || num < 30 || num > 250) {
    return "Please enter a valid pulse rate";
  }

  return null;
}

export function validateRespiratoryRate(val: string | undefined | null): string | null {
  const trimmed = typeof val === "string" ? val.trim() : "";
  if (!trimmed) return null;

  if (!/^\d{1,2}$/.test(trimmed)) {
    return "Please enter a valid respiratory rate";
  }

  const num = parseInt(trimmed, 10);
  if (isNaN(num) || num < 6 || num > 60) {
    return "Please enter a valid respiratory rate";
  }

  return null;
}

export function validateOxygenSaturation(val: string | undefined | null): string | null {
  const trimmed = typeof val === "string" ? val.trim().replace(/%$/, "").trim() : "";
  if (!trimmed) return null;

  if (!/^\d+(\.\d+)?$/.test(trimmed)) {
    return "Oxygen saturation must be between 0 and 100%";
  }

  const num = parseFloat(trimmed);
  if (isNaN(num) || num < 0 || num > 100) {
    return "Oxygen saturation must be between 0 and 100%";
  }

  return null;
}

export function validateWeight(val: string | undefined | null): string | null {
  const trimmed = typeof val === "string" ? val.trim().replace(/kg$/i, "").trim() : "";
  if (!trimmed) return null;

  if (!/^\d+(\.\d+)?$/.test(trimmed)) {
    return "Please enter a valid weight in KG";
  }

  const num = parseFloat(trimmed);
  if (isNaN(num) || num <= 0 || num > 500) {
    return "Please enter a valid weight in KG";
  }

  return null;
}

// Phase 3: Medication
export function validateMedicineName(val: string | undefined | null): string | null {
  const trimmed = typeof val === "string" ? val.trim() : "";
  if (!trimmed) {
    return "Please enter a valid medicine name";
  }
  if (trimmed.length > CONSULTATION_LIMITS.MEDICINE_NAME) {
    return "Maximum allowed character limit exceeded";
  }
  const hasAlphanumeric = /[a-zA-Z0-9]/.test(trimmed);
  const hasScriptOrTag = /<[^>]*>|javascript:/i.test(trimmed);
  if (!hasAlphanumeric || hasScriptOrTag) {
    return "Please enter a valid medicine name";
  }
  return null;
}

export function validateMedicineStrength(val: string | undefined | null, isCustom = false): string | null {
  const trimmed = typeof val === "string" ? val.trim() : "";
  if (isCustom && !trimmed) {
    return "Please enter a valid medicine strength";
  }
  if (!trimmed) return null;

  if (trimmed.length > CONSULTATION_LIMITS.MEDICINE_STRENGTH) {
    return "Maximum allowed character limit exceeded";
  }
  const hasAlphanumeric = /[a-zA-Z0-9]/.test(trimmed);
  const hasScriptOrTag = /<[^>]*>|javascript:/i.test(trimmed);
  if (!hasAlphanumeric || hasScriptOrTag) {
    return "Please enter a valid medicine strength";
  }
  return null;
}

export function validateDosage(val: string | undefined | null): string | null {
  const trimmed = typeof val === "string" ? val.trim() : "";
  if (!trimmed) return null;

  if (trimmed.length > CONSULTATION_LIMITS.DOSAGE) {
    return "Maximum allowed character limit exceeded";
  }
  const hasAlphanumeric = /[a-zA-Z0-9]/.test(trimmed);
  const hasScriptOrTag = /<[^>]*>|javascript:/i.test(trimmed);
  if (!hasAlphanumeric || hasScriptOrTag) {
    return "Please enter a valid dosage";
  }
  return null;
}

export function validateFrequency(val: string | undefined | null): string | null {
  const trimmed = typeof val === "string" ? val.trim() : "";
  if (!trimmed) return null;

  if (trimmed.length > CONSULTATION_LIMITS.FREQUENCY) {
    return "Maximum allowed character limit exceeded";
  }
  const hasAlphanumeric = /[a-zA-Z0-9]/.test(trimmed);
  const hasScriptOrTag = /<[^>]*>|javascript:/i.test(trimmed);
  if (!hasAlphanumeric || hasScriptOrTag) {
    return "Please enter a valid frequency";
  }
  return null;
}

export function validateDuration(val: string | undefined | null): string | null {
  const trimmed = typeof val === "string" ? val.trim() : "";
  if (!trimmed) return null;

  if (trimmed.length > CONSULTATION_LIMITS.DURATION) {
    return "Maximum allowed character limit exceeded";
  }
  // Check for positive numeric or duration expression (e.g. "5", "5 days", "1 week")
  const hasAlphanumeric = /[a-zA-Z0-9]/.test(trimmed);
  const hasScriptOrTag = /<[^>]*>|javascript:/i.test(trimmed);
  const isPureLetters = /^[a-zA-Z\s]+$/.test(trimmed) && !/\b(day|days|week|weeks|month|months)\b/i.test(trimmed);
  const isZeroOrNegative = /^-\d+|^\s*0+(\s*(day|days))?\s*$/i.test(trimmed);

  if (!hasAlphanumeric || hasScriptOrTag || isPureLetters || isZeroOrNegative) {
    return "Please enter a valid duration";
  }
  return null;
}

// Phase 4: Radiology
export function validateRadiologyNotes(val: string | undefined | null): string | null {
  const trimmed = typeof val === "string" ? val.trim() : "";
  if (!trimmed) return null;

  if (trimmed.length > CONSULTATION_LIMITS.RADIOLOGY_NOTES) {
    return "Clinical Notes / Indications exceeds the maximum allowed length";
  }
  const hasAlphanumeric = /[a-zA-Z0-9]/.test(trimmed);
  const hasScriptOrTag = /<[^>]*>|javascript:/i.test(trimmed);
  if (!hasAlphanumeric || hasScriptOrTag) {
    return "Please enter valid clinical notes / indications";
  }
  return null;
}

// Phase 5: Recommend Admission
export function validatePrimaryDiagnosis(val: string | undefined | null): string | null {
  const trimmed = typeof val === "string" ? val.trim() : "";
  if (!trimmed) {
    return "Please enter a valid primary diagnosis";
  }
  if (trimmed.length > CONSULTATION_LIMITS.PRIMARY_DIAGNOSIS) {
    return "Maximum allowed character limit exceeded";
  }
  const hasAlphanumeric = /[a-zA-Z0-9]/.test(trimmed);
  const hasScriptOrTag = /<[^>]*>|javascript:/i.test(trimmed);
  if (!hasAlphanumeric || hasScriptOrTag) {
    return "Please enter a valid primary diagnosis";
  }
  return null;
}

export function validateExpectedStay(val: string | undefined | null): string | null {
  const trimmed = typeof val === "string" ? val.trim() : "";
  if (!trimmed) return null;

  if (trimmed.length > CONSULTATION_LIMITS.EXPECTED_STAY) {
    return "Expected stay duration exceeds the maximum allowed value";
  }

  // Reject negative, zero, or unsupported symbols
  if (/^-\d+|^\s*0+(\s*(day|days))?\s*$/i.test(trimmed)) {
    return "Please enter a valid expected stay duration";
  }

  // If purely numeric, enforce max value e.g. 365
  if (/^\d+$/.test(trimmed)) {
    const num = parseInt(trimmed, 10);
    if (num <= 0) return "Please enter a valid expected stay duration";
    if (num > 365) return "Expected stay duration exceeds the maximum allowed value";
    return null;
  }

  // Match expressions like "3 Days", "1 Week", "2 Months"
  const validExp = /^\d+\s*(day|days|week|weeks|month|months)$/i.test(trimmed);
  if (!validExp) {
    const hasScript = /<[^>]*>|javascript:/i.test(trimmed);
    const hasAlpha = /[a-zA-Z0-9]/.test(trimmed);
    if (!hasAlpha || hasScript) {
      return "Please enter a valid expected stay duration";
    }
  }

  return null;
}

export function validateAdmissionReason(val: string | undefined | null): string | null {
  const trimmed = typeof val === "string" ? val.trim() : "";
  if (!trimmed) return null;

  if (trimmed.length > CONSULTATION_LIMITS.ADMISSION_REASON) {
    return "Maximum allowed character limit exceeded";
  }
  const hasAlphanumeric = /[a-zA-Z0-9]/.test(trimmed);
  const hasScriptOrTag = /<[^>]*>|javascript:/i.test(trimmed);
  if (!hasAlphanumeric || hasScriptOrTag) {
    return "Please enter a valid admission reason";
  }
  return null;
}

export function validateAdmissionClinicalNotes(val: string | undefined | null): string | null {
  const trimmed = typeof val === "string" ? val.trim() : "";
  if (!trimmed) return null;

  if (trimmed.length > CONSULTATION_LIMITS.ADMISSION_CLINICAL_NOTES) {
    return "Maximum allowed character limit exceeded";
  }
  const hasAlphanumeric = /[a-zA-Z0-9]/.test(trimmed);
  const hasScriptOrTag = /<[^>]*>|javascript:/i.test(trimmed);
  if (!hasAlphanumeric || hasScriptOrTag) {
    return "Please enter valid clinical notes / diagnosis remarks";
  }
  return null;
}

export function validateSpecialInstructions(val: string | undefined | null): string | null {
  const trimmed = typeof val === "string" ? val.trim() : "";
  if (!trimmed) return null;

  if (trimmed.length > CONSULTATION_LIMITS.SPECIAL_INSTRUCTIONS) {
    return "Maximum allowed character limit exceeded";
  }
  const hasAlphanumeric = /[a-zA-Z0-9]/.test(trimmed);
  const hasScriptOrTag = /<[^>]*>|javascript:/i.test(trimmed);
  if (!hasAlphanumeric || hasScriptOrTag) {
    return "Please enter valid special instructions";
  }
  return null;
}
