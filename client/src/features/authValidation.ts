import { z } from "zod";

export const registrationSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, "Full Name is required.")
      .min(2, "Full Name must be at least 2 characters.")
      .max(50, "Full Name cannot exceed 50 characters.")
      .regex(
        /^[a-zA-Z\s'-]+$/,
        "Full Name can only contain letters, spaces, hyphens, and apostrophes."
      ),
    email: z
      .string()
      .trim()
      .min(1, "Email is required.")
      .max(254, "Email cannot exceed 254 characters.")
      .email("Please enter a valid email address.")
      .regex(
        /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
        "Please enter a valid email address."
      )
      .refine((val) => !val.includes(".."), "Please enter a valid email address."),
    password: z
      .string()
      .min(1, "Password is required.")
      .min(8, "Password must be at least 8 characters long.")
      .max(64, "Password cannot exceed 64 characters.")
      .regex(
        /^(?=.*[a-zA-Z])(?=.*[0-9!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).+$/,
        "Password must contain at least one letter and one number or special character."
      ),
    confirmPassword: z
      .string()
      .min(1, "Please confirm your password.")
      .max(64, "Confirm Password cannot exceed 64 characters."),
    phone: z
      .string()
      .trim()
      .min(1, "Phone Number is required.")
      .max(20, "Phone number cannot exceed 20 characters.")
      .refine(
        (val) => /^\+?[0-9]{10,15}$/.test(val.replace(/[\s\-()]/g, "")),
        "Please enter a valid 10-15 digit phone number."
      ),
    age: z
      .string()
      .trim()
      .min(1, "Valid Age is required.")
      .regex(/^\d+$/, "Age must be a valid number.")
      .refine(
        (val) => {
          const num = parseInt(val, 10);
          return !isNaN(num) && num >= 0 && num <= 150;
        },
        "Age must be between 0 and 150."
      ),
    gender: z.string().min(1, "Gender selection is required."),
    bloodGroup: z.string().min(1, "Blood Group selection is required."),
    address: z
      .string()
      .trim()
      .min(1, "Residential Address is required.")
      .min(5, "Residential Address must be at least 5 characters long.")
      .max(250, "Residential Address cannot exceed 250 characters.")
      .regex(
        /^[a-zA-Z0-9\s,.\-#/'()]+$/,
        "Address can only contain letters, numbers, spaces, commas, periods, hyphens, and slashes."
      ),
    emergencyName: z
      .string()
      .trim()
      .min(1, "Emergency Contact Name is required.")
      .min(2, "Emergency Contact Name must be at least 2 characters.")
      .max(50, "Emergency Contact Name cannot exceed 50 characters.")
      .regex(
        /^[a-zA-Z\s'-]+$/,
        "Emergency Contact Name can only contain letters, spaces, hyphens, and apostrophes."
      ),
    emergencyPhone: z
      .string()
      .trim()
      .min(1, "Emergency Contact Phone Number is required.")
      .max(20, "Emergency Contact Phone cannot exceed 20 characters.")
      .refine(
        (val) => /^\+?[0-9]{10,15}$/.test(val.replace(/[\s\-()]/g, "")),
        "Please enter a valid 10-15 digit emergency phone number."
      ),
    emergencyRelation: z
      .string()
      .trim()
      .min(1, "Emergency Contact Relationship is required.")
      .max(50, "Emergency Contact Relationship cannot exceed 50 characters."),
    allergies: z
      .string()
      .trim()
      .max(500, "Allergies cannot exceed 500 characters"),
    insuranceProvider: z
      .string()
      .trim()
      .max(100, "Insurance Provider cannot exceed 100 characters"),
    insurancePolicyNumber: z
      .string()
      .trim()
      .max(50, "Insurance Policy Number cannot exceed 50 characters"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });

export type RegistrationFormData = z.infer<typeof registrationSchema>;
