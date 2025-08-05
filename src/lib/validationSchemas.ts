import { z } from "zod";

export const profileUpdateSchema = z.object({
  full_name: z
    .string()
    .min(1, "Full name is required")
    .max(100, "Full name must be less than 100 characters")
    .regex(/^[a-zA-Z\s'-]+$/, "Full name can only contain letters, spaces, hyphens, and apostrophes"),
  email: z
    .string()
    .min(1, "Email is required")
    .email("Please enter a valid email address")
    .max(254, "Email must be less than 254 characters"),
});

export const employeeSchema = z.object({
  name: z
    .string()
    .min(1, "Employee name is required")
    .max(100, "Employee name must be less than 100 characters")
    .regex(/^[a-zA-Z\s'-]+$/, "Name can only contain letters, spaces, hyphens, and apostrophes"),
});

export const companySchema = z.object({
  name: z
    .string()
    .min(1, "Company name is required")
    .max(100, "Company name must be less than 100 characters"),
});

export const storeSchema = z.object({
  name: z
    .string()
    .min(1, "Store name is required")
    .max(100, "Store name must be less than 100 characters"),
});

export const timeOffSchema = z.object({
  start_date: z.date(),
  end_date: z.date(),
  type: z.enum(["vacation", "sick", "personal", "other"]),
  notes: z
    .string()
    .max(500, "Notes must be less than 500 characters")
    .optional(),
}).refine((data) => data.end_date >= data.start_date, {
  message: "End date must be after or equal to start date",
  path: ["end_date"],
});