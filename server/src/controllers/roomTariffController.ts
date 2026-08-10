import { Request, Response } from "express";
import { catchAsync } from "../utils/catchAsync";
import { AppError } from "../utils/AppError";
import { RoomTariff } from "../models/RoomTariff";

export const listRoomTariffs = catchAsync(async (req: Request, res: Response) => {
  const tariffs = await RoomTariff.find({ ...req.hospitalFilter }).sort({ ward: 1, roomType: 1 });
  
  res.json({
    status: "success",
    data: tariffs
  });
});

export const createRoomTariff = catchAsync(async (req: Request, res: Response) => {
  const hospitalId = req.hospitalFilter!.hospital;
  const branchId = req.hospitalFilter?.branch ?? null;
  const { ward, roomType, tariff, nursingTariff, status, effectiveDate, description } = req.body;

  if (!ward || !roomType || tariff === undefined) {
    throw new AppError("Ward, Room Type, and Tariff are required.", 400);
  }

  // Check if tariff already exists for this combo
  const existing = await RoomTariff.findOne({ ...req.hospitalFilter, ward, roomType });
  if (existing) {
    throw new AppError(`A tariff configuration already exists for ward "${ward}" and room type "${roomType}".`, 400);
  }

  const roomTariff = await RoomTariff.create({
    hospital: hospitalId,
    branch: branchId,
    ward,
    roomType,
    tariff: Number(tariff),
    nursingTariff: nursingTariff !== undefined ? Number(nursingTariff) : 300,
    status: status || "Active",
    effectiveDate: effectiveDate ? new Date(effectiveDate) : new Date(),
    description: description || ""
  });

  res.status(201).json({
    status: "success",
    data: roomTariff
  });
});

export const updateRoomTariff = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { ward, roomType, tariff, nursingTariff, status, effectiveDate, description } = req.body;

  const roomTariff = await RoomTariff.findOne({ _id: id, ...req.hospitalFilter });
  if (!roomTariff) {
    throw new AppError("Room tariff configuration not found.", 404);
  }

  // If changing ward or type, check unique combo
  if ((ward && ward !== roomTariff.ward) || (roomType && roomType !== roomTariff.roomType)) {
    const targetWard = ward || roomTariff.ward;
    const targetRoomType = roomType || roomTariff.roomType;
    const existing = await RoomTariff.findOne({ ...req.hospitalFilter, ward: targetWard, roomType: targetRoomType });
    if (existing && String(existing._id) !== id) {
      throw new AppError(`A tariff configuration already exists for ward "${targetWard}" and room type "${targetRoomType}".`, 400);
    }
  }

  if (ward) roomTariff.ward = ward;
  if (roomType) roomTariff.roomType = roomType;
  if (tariff !== undefined) roomTariff.tariff = Number(tariff);
  if (nursingTariff !== undefined) roomTariff.nursingTariff = Number(nursingTariff);
  if (status) roomTariff.status = status;
  if (effectiveDate) roomTariff.effectiveDate = new Date(effectiveDate);
  if (description !== undefined) roomTariff.description = description;

  await roomTariff.save();

  res.json({
    status: "success",
    data: roomTariff
  });
});

export const deleteRoomTariff = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;

  const roomTariff = await RoomTariff.findOneAndDelete({ _id: id, ...req.hospitalFilter });
  if (!roomTariff) {
    throw new AppError("Room tariff configuration not found.", 404);
  }

  res.json({
    status: "success",
    message: "Room tariff configuration deleted successfully."
  });
});

export const getRoomTariffByWardAndType = catchAsync(async (req: Request, res: Response) => {
  const ward = req.query.ward as string;
  const roomType = req.query.roomType as string;

  if (!ward || !roomType) {
    throw new AppError("Ward and Room Type query parameters are required.", 400);
  }

  const tariff = await RoomTariff.findOne({
    ...req.hospitalFilter,
    ward,
    roomType,
    status: "Active"
  });

  res.json({
    status: "success",
    data: tariff || { tariff: 0, nursingTariff: 300 }
  });
});
