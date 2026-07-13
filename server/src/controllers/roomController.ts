import { Request, Response } from "express";
import { catchAsync } from "../utils/catchAsync";
import { AppError } from "../utils/AppError";
import { Room } from "../models/Room";
import { Ward } from "../models/Ward";
import { Bed } from "../models/Bed";

export const listRooms = catchAsync(async (req: Request, res: Response) => {
  const hospitalId = req.hospitalFilter!.hospital;
  const { search, ward, status, page = 1, limit = 10 } = req.query;

  const query: any = { hospital: hospitalId };

  if (search) {
    query.$or = [
      { roomNumber: new RegExp(String(search), "i") },
      { roomName: new RegExp(String(search), "i") }
    ];
  }

  if (ward) {
    query.ward = ward;
  }

  if (status) {
    query.status = status;
  }

  const pageNum = Math.max(1, Number(page));
  const limitNum = Math.max(1, Number(limit));
  const skip = (pageNum - 1) * limitNum;

  const [rooms, total] = await Promise.all([
    Room.find(query).populate("ward", "name code wardType").sort({ roomNumber: 1 }).skip(skip).limit(limitNum).lean(),
    Room.countDocuments(query)
  ]);

  res.json({
    status: "success",
    data: {
      rooms,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum)
      }
    }
  });
});

export const createRoom = catchAsync(async (req: Request, res: Response) => {
  const hospitalId = req.hospitalFilter!.hospital;
  const { roomNumber, roomName, wardId, floor, roomType, capacity, description, status } = req.body;

  if (!roomNumber || !wardId || floor === undefined || !roomType || !capacity) {
    throw new AppError("Room Number, Ward, Floor, Room Type, and Capacity are required.", 400);
  }

  // Verify ward exists and fetch its name
  const ward = await Ward.findOne({ _id: wardId, hospital: hospitalId });
  if (!ward) {
    throw new AppError("Selected ward does not exist.", 404);
  }

  // Check unique roomNumber in hospital
  const existingRoom = await Room.findOne({ hospital: hospitalId, roomNumber: roomNumber.trim() });
  if (existingRoom) {
    throw new AppError(`Room number "${roomNumber}" already exists in this hospital.`, 400);
  }

  const room = await Room.create({
    hospital: hospitalId,
    roomNumber: roomNumber.trim(),
    roomName: roomName ? roomName.trim() : "",
    ward: wardId,
    wardName: ward.name, // Cached for reception module compatibility
    floor: Number(floor),
    roomType,
    capacity: Number(capacity),
    description: description || "",
    status: status || "Active"
  });

  res.status(201).json({ status: "success", data: { room } });
});

export const updateRoom = catchAsync(async (req: Request, res: Response) => {
  const hospitalId = req.hospitalFilter!.hospital;
  const { id } = req.params;
  const { roomNumber, roomName, wardId, floor, roomType, capacity, description, status } = req.body;

  const room = await Room.findOne({ _id: id, hospital: hospitalId });
  if (!room) {
    throw new AppError("Room not found.", 404);
  }

  if (roomNumber && roomNumber.trim() !== room.roomNumber) {
    const existing = await Room.findOne({ hospital: hospitalId, roomNumber: roomNumber.trim() });
    if (existing) {
      throw new AppError(`Room number "${roomNumber}" already exists in this hospital.`, 400);
    }
    room.roomNumber = roomNumber.trim();
  }

  if (wardId && String(wardId) !== String(room.ward)) {
    const ward = await Ward.findOne({ _id: wardId, hospital: hospitalId });
    if (!ward) {
      throw new AppError("Selected ward does not exist.", 404);
    }
    room.ward = wardId;
    room.wardName = ward.name;
  }

  if (roomName !== undefined) room.roomName = roomName.trim();
  if (floor !== undefined) room.floor = Number(floor);
  if (roomType) room.roomType = roomType;
  if (capacity !== undefined) room.capacity = Number(capacity);
  if (description !== undefined) room.description = description;
  if (status) room.status = status;

  await room.save();

  res.json({ status: "success", data: { room } });
});

export const deleteRoom = catchAsync(async (req: Request, res: Response) => {
  const hospitalId = req.hospitalFilter!.hospital;
  const { id } = req.params;

  // Check if room contains beds
  const bedsCount = await Bed.countDocuments({ hospital: hospitalId, room: id });
  if (bedsCount > 0) {
    throw new AppError("Cannot delete room because it contains active bed entries.", 400);
  }

  const room = await Room.findOneAndDelete({ _id: id, hospital: hospitalId });
  if (!room) {
    throw new AppError("Room not found.", 404);
  }

  res.json({ status: "success", message: "Room deleted successfully." });
});
