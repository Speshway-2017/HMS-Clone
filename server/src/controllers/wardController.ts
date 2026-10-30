import { Request, Response } from "express";
import { catchAsync } from "../utils/catchAsync";
import { AppError } from "../utils/AppError";
import { Ward } from "../models/Ward";
import { Room } from "../models/Room";
import { z } from "zod";
import {
  requiredTrimmedString,
  optionalTrimmedString,
  codeValidator,
} from "../utils/validators";

const wardSchema = z.object({
  name: requiredTrimmedString("Ward name", 2, 100),
  code: codeValidator("Ward code", 1, 20, true),
  wardType: requiredTrimmedString("Ward type", 1, 50),
  floorNumber: z.coerce
    .number({ invalid_type_error: "Floor number must be a number" })
    .min(-5, "Floor number cannot be less than -5")
    .max(100, "Floor number cannot exceed 100"),
  description: optionalTrimmedString("Description", 500),
  status: z.enum(["Active", "Inactive", "Maintenance"]).optional().default("Active"),
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
  const hospitalId = req.hospitalFilter!.hospital;
  const branchId = req.hospitalFilter?.branch ?? null;
  const { name, code, wardType, floorNumber, maxRooms, nurseStation, description, status } = req.body;

  if (!name || !code || !wardType || floorNumber === undefined) {
    throw new AppError("Name, Code, Ward Type, and Floor Number are required.", 400);
  }

  // Check unique name and code within scope
  const [existingName, existingCode] = await Promise.all([
    Ward.findOne({ ...req.hospitalFilter, name: name.trim() }),
    Ward.findOne({ ...req.hospitalFilter, code: code.trim().toUpperCase() })
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
    name: name.trim(),
    code: code.trim().toUpperCase(),
    wardType,
    floorNumber: Number(floorNumber),
    maxRooms: maxRooms !== undefined ? Number(maxRooms) : 20,
    nurseStation: nurseStation || "",
    description: description || "",
    status: status || "Active"
  });

  res.status(201).json({ status: "success", data: { ward } });
});

export const updateWard = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { name, code, wardType, floorNumber, maxRooms, nurseStation, description, status } = req.body;

  const ward = await Ward.findOne({ _id: id, ...req.hospitalFilter });
  if (!ward) {
    throw new AppError("Ward not found.", 404);
  }

  if (name && name.trim() !== ward.name) {
    const existing = await Ward.findOne({ ...req.hospitalFilter, name: name.trim(), _id: { $ne: id } });
    if (existing) {
      throw new AppError(`Ward name "${name}" already exists in this branch.`, 400);
    }
    ward.name = name.trim();
    
    // Update linked rooms' wardName field for compatibility
    await Room.updateMany({ ...req.hospitalFilter, ward: id }, { wardName: name.trim() });
  }

  if (code && code.trim().toUpperCase() !== ward.code) {
    const existing = await Ward.findOne({ ...req.hospitalFilter, code: code.trim().toUpperCase(), _id: { $ne: id } });
    if (existing) {
      throw new AppError(`Ward code "${code}" already exists in this branch.`, 400);
    }
    ward.code = code.trim().toUpperCase();
  }

  if (wardType) ward.wardType = wardType;
  if (floorNumber !== undefined) ward.floorNumber = Number(floorNumber);
  if (maxRooms !== undefined) ward.maxRooms = Number(maxRooms);
  if (nurseStation !== undefined) ward.nurseStation = nurseStation;
  if (description !== undefined) ward.description = description;
  if (status) ward.status = status;

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
