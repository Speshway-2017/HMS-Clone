import { Request, Response } from "express";
import { catchAsync } from "../utils/catchAsync";
import { AppError } from "../utils/AppError";
import { Bed } from "../models/Bed";
import { Room } from "../models/Room";

export const listBeds = catchAsync(async (req: Request, res: Response) => {
  const { search, ward, room, status, page = 1, limit = 10 } = req.query;

  const query: any = { ...req.hospitalFilter };

  if (search) {
    query.$or = [
      { bedNumber: new RegExp(String(search), "i") },
      { bedCode: new RegExp(String(search), "i") }
    ];
  }

  if (ward) {
    query.ward = ward;
  }

  if (room) {
    query.room = room;
  }

  if (status) {
    query.status = status;
  }

  const pageNum = Math.max(1, Number(page));
  const limitNum = Math.max(1, Number(limit));
  const skip = (pageNum - 1) * limitNum;

  const [beds, total] = await Promise.all([
    Bed.find(query)
      .populate("ward", "name code")
      .populate("room", "roomNumber roomName")
      .populate("patient", "name uhid patientCode phone")
      .populate("admission", "admissionNumber admissionDate status")
      .sort({ bedNumber: 1 })
      .skip(skip)
      .limit(limitNum)
      .lean(),
    Bed.countDocuments(query)
  ]);

  res.json({
    status: "success",
    data: {
      beds,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum)
      }
    }
  });
});

export const getBed = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const bed = await Bed.findOne({ _id: id, ...req.hospitalFilter })
    .populate("ward", "name code")
    .populate("room", "roomNumber roomName capacity");
  if (!bed) {
    throw new AppError("Bed not found.", 404);
  }
  res.json({ status: "success", data: { bed } });
});

export const createBed = catchAsync(async (req: Request, res: Response) => {
  const hospitalId = req.hospitalFilter!.hospital;
  const branchId = req.hospitalFilter?.branch ?? null;
  const { bedNumber, roomId, bedType, status } = req.body;

  if (!bedNumber || !roomId) {
    throw new AppError("Bed Number and Room are required.", 400);
  }

  // Verify room exists
  const room = await Room.findOne({ _id: roomId, ...req.hospitalFilter });
  if (!room) {
    throw new AppError("Selected room does not exist in this branch.", 404);
  }

  // Count existing beds in the room to ensure we do not exceed capacity
  const activeBedsCount = await Bed.countDocuments({ ...req.hospitalFilter, room: roomId });
  if (activeBedsCount >= room.capacity) {
    throw new AppError(`Cannot add bed. Room capacity of ${room.capacity} beds has been reached.`, 400);
  }

  // Generate bed code automatically based on ward name/code and room number (e.g. ICU-201-B1)
  const codeSuffix = bedNumber.trim().toUpperCase().replace(/\s+/g, "-");
  const bedCode = `${room.roomNumber}-${codeSuffix}`;

  // Check unique bedCode or bedNumber in this room
  const [existingCode, existingNumber] = await Promise.all([
    Bed.findOne({ ...req.hospitalFilter, bedCode }),
    Bed.findOne({ ...req.hospitalFilter, room: roomId, bedNumber: bedNumber.trim() })
  ]);

  if (existingCode) {
    throw new AppError(`Bed code "${bedCode}" already exists in this branch.`, 400);
  }

  if (existingNumber) {
    throw new AppError(`Bed number "${bedNumber}" already exists in this room.`, 400);
  }

  const bed = await Bed.create({
    hospital: hospitalId,
    branch: branchId,
    ward: room.ward,
    room: roomId,
    bedNumber: bedNumber.trim(),
    bedCode,
    bedType: bedType || "Standard",
    status: status || "Available"
  });

  res.status(201).json({ status: "success", data: { bed } });
});

export const updateBed = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { bedNumber, roomId, bedType, status } = req.body;

  const bed = await Bed.findOne({ _id: id, ...req.hospitalFilter });
  if (!bed) {
    throw new AppError("Bed not found.", 404);
  }

  if (roomId && String(roomId) !== String(bed.room)) {
    const room = await Room.findOne({ _id: roomId, ...req.hospitalFilter });
    if (!room) {
      throw new AppError("Selected room does not exist in this branch.", 404);
    }
    
    // Validate capacity of new room
    const activeBedsCount = await Bed.countDocuments({ ...req.hospitalFilter, room: roomId });
    if (activeBedsCount >= room.capacity) {
      throw new AppError(`Cannot move bed. Destination room capacity of ${room.capacity} beds has been reached.`, 400);
    }

    bed.room = roomId;
    bed.ward = room.ward;
  }

  // If changing bed number, regenerate bedCode
  if (bedNumber && bedNumber.trim() !== bed.bedNumber) {
    const currentRoom = await Room.findOne({ _id: bed.room, ...req.hospitalFilter });
    if (currentRoom) {
      const codeSuffix = bedNumber.trim().toUpperCase().replace(/\s+/g, "-");
      const newBedCode = `${currentRoom.roomNumber}-${codeSuffix}`;
      
      const [existingCode, existingNumber] = await Promise.all([
        Bed.findOne({ ...req.hospitalFilter, bedCode: newBedCode }),
        Bed.findOne({ ...req.hospitalFilter, room: bed.room, bedNumber: bedNumber.trim() })
      ]);

      if (existingCode && String(existingCode._id) !== String(id)) {
        throw new AppError(`Bed code "${newBedCode}" already exists in this branch.`, 400);
      }

      if (existingNumber && String(existingNumber._id) !== String(id)) {
        throw new AppError(`Bed number "${bedNumber}" already exists in this room.`, 400);
      }

      bed.bedNumber = bedNumber.trim();
      bed.bedCode = newBedCode;
    }
  }

  if (bedType) bed.bedType = bedType;
  if (status) {
    if (bed.status === "Occupied" && status !== "Occupied") {
      throw new AppError("Occupied beds can only be made available via inpatient transfer or discharge.", 400);
    }
    bed.status = status;
  }

  await bed.save();

  res.json({ status: "success", data: { bed } });
});

export const deleteBed = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;

  const bed = await Bed.findOne({ _id: id, ...req.hospitalFilter });
  if (!bed) {
    throw new AppError("Bed not found.", 404);
  }

  if (bed.status === "Occupied" || bed.isOccupied) {
    throw new AppError("Cannot delete bed because it is currently occupied by a patient.", 400);
  }

  await Bed.deleteOne({ _id: id, ...req.hospitalFilter });

  res.json({ status: "success", message: "Bed deleted successfully." });
});
