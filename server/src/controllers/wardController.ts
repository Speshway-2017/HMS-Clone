import { Request, Response } from "express";
import { catchAsync } from "../utils/catchAsync";
import { AppError } from "../utils/AppError";
import { Ward } from "../models/Ward";
import { Room } from "../models/Room";

export const listWards = catchAsync(async (req: Request, res: Response) => {
  const hospitalId = req.hospitalFilter!.hospital;
  const { search, wardType, status, page = 1, limit = 10 } = req.query;

  const query: any = { hospital: hospitalId };

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

export const createWard = catchAsync(async (req: Request, res: Response) => {
  const hospitalId = req.hospitalFilter!.hospital;
  const { name, code, wardType, floorNumber, description, status } = req.body;

  if (!name || !code || !wardType || floorNumber === undefined) {
    throw new AppError("Name, Code, Ward Type, and Floor Number are required.", 400);
  }

  // Check unique name and code
  const [existingName, existingCode] = await Promise.all([
    Ward.findOne({ hospital: hospitalId, name: name.trim() }),
    Ward.findOne({ hospital: hospitalId, code: code.trim().toUpperCase() })
  ]);

  if (existingName) {
    throw new AppError(`Ward name "${name}" already exists.`, 400);
  }

  if (existingCode) {
    throw new AppError(`Ward code "${code}" already exists.`, 400);
  }

  const ward = await Ward.create({
    hospital: hospitalId,
    name: name.trim(),
    code: code.trim().toUpperCase(),
    wardType,
    floorNumber: Number(floorNumber),
    description: description || "",
    status: status || "Active"
  });

  res.status(201).json({ status: "success", data: { ward } });
});

export const updateWard = catchAsync(async (req: Request, res: Response) => {
  const hospitalId = req.hospitalFilter!.hospital;
  const { id } = req.params;
  const { name, code, wardType, floorNumber, description, status } = req.body;

  const ward = await Ward.findOne({ _id: id, hospital: hospitalId });
  if (!ward) {
    throw new AppError("Ward not found.", 404);
  }

  if (name && name.trim() !== ward.name) {
    const existing = await Ward.findOne({ hospital: hospitalId, name: name.trim() });
    if (existing) {
      throw new AppError(`Ward name "${name}" already exists.`, 400);
    }
    ward.name = name.trim();
    
    // Update linked rooms' wardName field for compatibility
    await Room.updateMany({ hospital: hospitalId, ward: id }, { wardName: name.trim() });
  }

  if (code && code.trim().toUpperCase() !== ward.code) {
    const existing = await Ward.findOne({ hospital: hospitalId, code: code.trim().toUpperCase() });
    if (existing) {
      throw new AppError(`Ward code "${code}" already exists.`, 400);
    }
    ward.code = code.trim().toUpperCase();
  }

  if (wardType) ward.wardType = wardType;
  if (floorNumber !== undefined) ward.floorNumber = Number(floorNumber);
  if (description !== undefined) ward.description = description;
  if (status) ward.status = status;

  await ward.save();

  res.json({ status: "success", data: { ward } });
});

export const deleteWard = catchAsync(async (req: Request, res: Response) => {
  const hospitalId = req.hospitalFilter!.hospital;
  const { id } = req.params;

  // Check if ward contains rooms
  const roomsCount = await Room.countDocuments({ hospital: hospitalId, ward: id });
  if (roomsCount > 0) {
    throw new AppError("Cannot delete ward because it contains active room assignments.", 400);
  }

  const ward = await Ward.findOneAndDelete({ _id: id, hospital: hospitalId });
  if (!ward) {
    throw new AppError("Ward not found.", 404);
  }

  res.json({ status: "success", message: "Ward deleted successfully." });
});
