import { Request, Response } from "express";
import { catchAsync } from "../utils/catchAsync";
import { AppError } from "../utils/AppError";
import { Ward } from "../models/Ward";
import { Room } from "../models/Room";
import { buildBranchQuery } from "../utils/branchQueryHelper";
import { z } from "zod";

const WARD_NAME_REGEX = /^[a-zA-Z0-9\s\.\-/'&,()]+$/;
const WARD_CODE_REGEX = /^[A-Za-z0-9\-_/]+$/;

const wardSchema = z.object({
  name: z
    .string({ invalid_type_error: "Please enter valid data" })
    .trim()
    .min(1, "Ward Name is required. Field is required. Please fill out this field")
    .max(100, "Ward Name cannot exceed 100 characters. Too long text is not accepted. Please enter valid data")
    .refine((val) => WARD_NAME_REGEX.test(val), {
      message: "Ward Name contains invalid data. Invalid data is not accepted. Please enter valid data",
    }),
  code: z
    .string({ invalid_type_error: "Please enter valid data" })
    .trim()
    .min(1, "Ward Code is required. Field is required. Please fill out this field")
    .max(20, "Ward Code cannot exceed 20 characters. Too long text is not accepted. Please enter valid data")
    .refine((val) => WARD_CODE_REGEX.test(val), {
      message: "Ward Code contains invalid data. Invalid data is not accepted. Please enter valid data",
    }),
  wardType: z
    .string({ invalid_type_error: "Please enter valid data" })
    .trim()
    .min(1, "Ward Type is required. Field is required. Please fill out this field")
    .max(50, "Ward Type cannot exceed 50 characters. Too long text is not accepted. Please enter valid data"),
  floorNumber: z.coerce
    .number({ invalid_type_error: "Floor Number must be a valid number. Invalid data is not accepted. Please enter valid data" })
    .min(-5, "Floor Number cannot be less than -5. Invalid data is not accepted. Please enter valid data")
    .max(100, "Floor Number cannot exceed 100. Too long text is not accepted. Please enter valid data"),
  maxRooms: z.coerce
    .number({ invalid_type_error: "Maximum Rooms Capacity must be a valid number. Invalid data is not accepted. Please enter valid data" })
    .min(1, "Maximum Rooms Capacity must be at least 1. Invalid data is not accepted. Please enter valid data")
    .max(500, "Maximum Rooms Capacity cannot exceed 500. Too long text is not accepted. Please enter valid data")
    .optional()
    .default(20),
  nurseStation: z.string().trim().max(100).optional().default(""),
  description: z
    .string({ invalid_type_error: "Please enter valid data" })
    .trim()
    .max(500, "Description cannot exceed 500 characters. Too long text is not accepted. Please enter valid data")
    .optional()
    .default(""),
  status: z.enum(["Active", "Inactive"]).optional().default("Active"),
});

export const listWards = catchAsync(async (req: Request, res: Response) => {
  const { search, wardType, status, page = 1, limit = 10 } = req.query;

  const query: any = buildBranchQuery(req.hospitalFilter);

  if (search) {
    query.$or = [
      { name: new RegExp(String(search), "i") },
      { code: new RegExp(String(search), "i") }
    ];
  }

  if (wardType) {
    query.wardType = wardType;
  }

  if (status) {
    query.status = status;
  }

  const pageNum = Math.max(1, Number(page));
  const limitNum = Math.max(1, Number(limit));
  const skip = (pageNum - 1) * limitNum;

  const [wards, total] = await Promise.all([
    Ward.find(query).sort({ name: 1 }).skip(skip).limit(limitNum).lean(),
    Ward.countDocuments(query)
  ]);

  res.json({
    status: "success",
    data: {
      wards,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum)
      }
    }
  });
});

export const getWard = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const ward = await Ward.findOne({ _id: id, ...req.hospitalFilter });
  if (!ward) {
    throw new AppError("Ward not found.", 404);
  }
  res.json({ status: "success", data: { ward } });
});

export const createWard = catchAsync(async (req: Request, res: Response) => {
  const body = wardSchema.parse(req.body);
  const hospitalId = req.hospitalFilter!.hospital;
  const branchId = req.hospitalFilter?.branch ?? null;
  const { name, code, wardType, floorNumber, maxRooms, nurseStation, description, status } = body;

  // Check unique name and code within scope
  const [existingName, existingCode] = await Promise.all([
    Ward.findOne({ ...req.hospitalFilter, name }),
    Ward.findOne({ ...req.hospitalFilter, code: code.toUpperCase() })
  ]);

  if (existingName) {
    throw new AppError(`Ward name "${name}" already exists in this branch.`, 400);
  }

  if (existingCode) {
    throw new AppError(`Ward code "${code}" already exists in this branch.`, 400);
  }

  const ward = await Ward.create({
    hospital: hospitalId,
    branch: branchId,
    name,
    code: code.toUpperCase(),
    wardType,
    floorNumber,
    maxRooms,
    nurseStation: nurseStation || "",
    description: description || "",
    status: status || "Active"
  });

  res.status(201).json({ status: "success", data: { ward } });
});

export const updateWard = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const body = wardSchema.partial().parse(req.body);
  const { name, code, wardType, floorNumber, maxRooms, nurseStation, description, status } = body;

  const ward = await Ward.findOne({ _id: id, ...req.hospitalFilter });
  if (!ward) {
    throw new AppError("Ward not found.", 404);
  }

  if (name && name !== ward.name) {
    const existing = await Ward.findOne({ ...req.hospitalFilter, name, _id: { $ne: id } });
    if (existing) {
      throw new AppError(`Ward name "${name}" already exists in this branch.`, 400);
    }
    ward.name = name;
    
    // Update linked rooms' wardName field for compatibility
    await Room.updateMany({ ...req.hospitalFilter, ward: id }, { wardName: name });
  }

  if (code && code.toUpperCase() !== ward.code) {
    const existing = await Ward.findOne({ ...req.hospitalFilter, code: code.toUpperCase(), _id: { $ne: id } });
    if (existing) {
      throw new AppError(`Ward code "${code}" already exists in this branch.`, 400);
    }
    ward.code = code.toUpperCase();
  }

  if (wardType) (ward as any).wardType = wardType as any;
  if (floorNumber !== undefined) ward.floorNumber = floorNumber;
  if (maxRooms !== undefined) ward.maxRooms = maxRooms;
  if (nurseStation !== undefined) ward.nurseStation = nurseStation;
  if (description !== undefined) ward.description = description;
  if (status) (ward as any).status = status as any;

  await ward.save();

  res.json({ status: "success", data: { ward } });
});

export const deleteWard = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;

  // Check if ward contains rooms
  const roomsCount = await Room.countDocuments({ ...req.hospitalFilter, ward: id });
  if (roomsCount > 0) {
    throw new AppError("Cannot delete ward because it contains active room assignments.", 400);
  }

  const ward = await Ward.findOneAndDelete({ _id: id, ...req.hospitalFilter });
  if (!ward) {
    throw new AppError("Ward not found.", 404);
  }

  res.json({ status: "success", message: "Ward deleted successfully." });
});
