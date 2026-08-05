import { Request, Response } from "express";
import { catchAsync } from "../utils/catchAsync";
import { AppError } from "../utils/AppError";
import { Room } from "../models/Room";
import { Ward } from "../models/Ward";
import { Bed } from "../models/Bed";
import { RoomTariff } from "../models/RoomTariff";

// Helper function to convert integer index (0, 1, 2...) into Letter suffix (A, B, C...)
function getBedLetter(index: number): string {
  let label = "";
  let i = index;
  while (i >= 0) {
    label = String.fromCharCode(65 + (i % 26)) + label;
    i = Math.floor(i / 26) - 1;
  }
  return label;
}

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

  // Fetch bed statistics for these rooms
  const roomIds = rooms.map((r) => r._id);
  const beds = await Bed.find({ hospital: hospitalId, room: { $in: roomIds } }).select("room status isOccupied").lean();

  const bedsMap: Record<string, { totalBeds: number; occupiedBeds: number; availableBeds: number }> = {};
  for (const b of beds) {
    const rId = String(b.room);
    if (!bedsMap[rId]) {
      bedsMap[rId] = { totalBeds: 0, occupiedBeds: 0, availableBeds: 0 };
    }
    bedsMap[rId].totalBeds += 1;
    if (b.isOccupied || b.status === "Occupied") {
      bedsMap[rId].occupiedBeds += 1;
    } else if (b.status === "Available") {
      bedsMap[rId].availableBeds += 1;
    }
  }

  const enrichedRooms = rooms.map((r) => {
    const stats = bedsMap[String(r._id)] || { totalBeds: 0, occupiedBeds: 0, availableBeds: 0 };
    const actualCapacity = r.capacity || stats.totalBeds || 1;
    return {
      ...r,
      capacity: actualCapacity,
      totalBeds: stats.totalBeds,
      occupiedBeds: stats.occupiedBeds,
      availableBeds: Math.max(0, actualCapacity - stats.occupiedBeds)
    };
  });

  res.json({
    status: "success",
    data: {
      rooms: enrichedRooms,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum)
      }
    }
  });
});

export const getRoom = catchAsync(async (req: Request, res: Response) => {
  const hospitalId = req.hospitalFilter!.hospital;
  const { id } = req.params;
  const room = await Room.findOne({ _id: id, hospital: hospitalId }).populate("ward", "name code wardType").lean();
  if (!room) {
    throw new AppError("Room not found.", 404);
  }

  const beds = await Bed.find({ hospital: hospitalId, room: id }).select("status isOccupied").lean();
  const occupiedCount = beds.filter((b) => b.isOccupied || b.status === "Occupied").length;
  const actualCapacity = room.capacity || beds.length || 1;

  res.json({
    status: "success",
    data: {
      room: {
        ...room,
        capacity: actualCapacity,
        totalBeds: beds.length,
        occupiedBeds: occupiedCount,
        availableBeds: Math.max(0, actualCapacity - occupiedCount)
      }
    }
  });
});

export const createRoom = catchAsync(async (req: Request, res: Response) => {
  const hospitalId = req.hospitalFilter!.hospital;
  const {
    roomNumber,
    roomName,
    wardId,
    floor,
    roomType,
    acType,
    acSubTypes,
    capacity,
    description,
    status,
    autoGenerateBeds = true,
    tariff
  } = req.body;

  // Real-world validation: Cannot create room without selecting a ward
  if (!wardId) {
    throw new AppError("Cannot create room without selecting a ward.", 400);
  }

  if (!roomNumber || floor === undefined || !roomType || !capacity) {
    throw new AppError("Room Number, Ward, Floor, Room Category, and Capacity are required.", 400);
  }

  const ward = await Ward.findOne({ _id: wardId, hospital: hospitalId });
  if (!ward) {
    throw new AppError("Selected ward does not exist.", 404);
  }

  // Real-world rules enforcement
  let resolvedAcType = acType || "Non AC";
  let resolvedAcSubTypes: string[] = Array.isArray(acSubTypes) ? acSubTypes : [];

  if (roomType === "ICU" || ward.wardType === "ICU") {
    resolvedAcType = "AC";
  }

  if (roomType === "NICU" || ward.wardType === "NICU") {
    resolvedAcType = "AC";
    if (!resolvedAcSubTypes.includes("Temperature Controlled")) {
      resolvedAcSubTypes.push("Temperature Controlled");
    }
  }

  if (ward.wardType === "Operation Theatre" && resolvedAcType === "Non AC") {
    throw new AppError("Operation Theatre rooms should not allow Non AC.", 400);
  }

  // Check unique room number in hospital
  const existingRoom = await Room.findOne({ hospital: hospitalId, roomNumber: roomNumber.trim() });
  if (existingRoom) {
    throw new AppError(`Room number "${roomNumber}" already exists in this hospital.`, 400);
  }

  const parsedCapacity = Number(capacity);
  if (parsedCapacity <= 0) {
    throw new AppError("Room bed capacity must be at least 1.", 400);
  }

  // Embedded tariff payload
  const roomTariffData = {
    roomChargePerDay: tariff?.roomChargePerDay ? Number(tariff.roomChargePerDay) : 0,
    admissionDeposit: tariff?.admissionDeposit ? Number(tariff.admissionDeposit) : 0,
    extraBedCharge: tariff?.extraBedCharge ? Number(tariff.extraBedCharge) : 0,
    nursingCharge: tariff?.nursingCharge ? Number(tariff.nursingCharge) : 0,
    serviceCharge: tariff?.serviceCharge ? Number(tariff.serviceCharge) : 0,
    emergencyCharge: tariff?.emergencyCharge ? Number(tariff.emergencyCharge) : 0,
    discountPercent: tariff?.discountPercent ? Number(tariff.discountPercent) : 0,
    gstPercent: tariff?.gstPercent ? Number(tariff.gstPercent) : 0,
    effectiveFrom: tariff?.effectiveFrom ? new Date(tariff.effectiveFrom) : new Date(),
    status: tariff?.status || "Active"
  };

  const room = await Room.create({
    hospital: hospitalId,
    roomNumber: roomNumber.trim(),
    roomName: roomName ? roomName.trim() : "",
    ward: wardId,
    wardName: ward.name,
    floor: Number(floor),
    roomType,
    acType: resolvedAcType,
    acSubTypes: resolvedAcSubTypes,
    capacity: parsedCapacity,
    description: description || "",
    status: status || "Active",
    tariff: roomTariffData
  });

  // Auto-generate beds
  const createdBeds = [];
  if (autoGenerateBeds) {
    for (let i = 0; i < parsedCapacity; i++) {
      const letter = getBedLetter(i);
      const bedNumber = `${roomNumber.trim()}-${letter}`;
      const bedCode = `Bed-${roomNumber.trim()}-${letter}`;

      const bed = await Bed.create({
        hospital: hospitalId,
        ward: wardId,
        room: room._id,
        bedNumber,
        bedCode,
        bedType: "Standard",
        status: "Available",
        isOccupied: false
      });
      createdBeds.push(bed);
    }
  }

  // Sync with RoomTariff model for IP Billing compatibility
  try {
    await RoomTariff.findOneAndUpdate(
      { hospital: hospitalId, ward: ward.name, roomType: resolvedAcType },
      {
        tariff: roomTariffData.roomChargePerDay,
        nursingTariff: roomTariffData.nursingCharge,
        status: roomTariffData.status,
        effectiveDate: roomTariffData.effectiveFrom
      },
      { upsert: true, new: true }
    );
  } catch (err) {
    // Non-blocking sync log
    console.error("RoomTariff sync notice:", err);
  }

  res.status(201).json({
    status: "success",
    data: {
      room,
      bedsCreated: createdBeds.length
    }
  });
});

export const updateRoom = catchAsync(async (req: Request, res: Response) => {
  const hospitalId = req.hospitalFilter!.hospital;
  const { id } = req.params;
  const {
    roomNumber,
    roomName,
    wardId,
    floor,
    roomType,
    acType,
    acSubTypes,
    capacity,
    description,
    status,
    tariff,
    autoGenerateBeds = true
  } = req.body;

  const room = await Room.findOne({ _id: id, hospital: hospitalId });
  if (!room) {
    throw new AppError("Room not found.", 404);
  }

  let targetWardId = room.ward;
  let targetWardName = room.wardName;

  if (wardId && String(wardId) !== String(room.ward)) {
    const ward = await Ward.findOne({ _id: wardId, hospital: hospitalId });
    if (!ward) {
      throw new AppError("Selected ward does not exist.", 404);
    }
    targetWardId = ward._id;
    targetWardName = ward.name;
    room.ward = targetWardId;
    room.wardName = targetWardName;
  }

  if (roomNumber && roomNumber.trim() !== room.roomNumber) {
    const existing = await Room.findOne({ hospital: hospitalId, roomNumber: roomNumber.trim() });
    if (existing) {
      throw new AppError(`Room number "${roomNumber}" already exists in this hospital.`, 400);
    }
    room.roomNumber = roomNumber.trim();
  }

  const targetRoomType = roomType || room.roomType;
  let targetAcType = acType || room.acType;
  let targetAcSubTypes = acSubTypes !== undefined ? acSubTypes : room.acSubTypes;

  const currentWard = await Ward.findById(targetWardId);
  if (currentWard) {
    if (targetRoomType === "ICU" || currentWard.wardType === "ICU") {
      targetAcType = "AC";
    }
    if (targetRoomType === "NICU" || currentWard.wardType === "NICU") {
      targetAcType = "AC";
      if (!targetAcSubTypes.includes("Temperature Controlled")) {
        targetAcSubTypes.push("Temperature Controlled");
      }
    }
    if (currentWard.wardType === "Operation Theatre" && targetAcType === "Non AC") {
      throw new AppError("Operation Theatre rooms should not allow Non AC.", 400);
    }
  }

  // Handle bed capacity change logic safely
  if (capacity !== undefined && Number(capacity) !== room.capacity) {
    const newCap = Number(capacity);
    if (newCap <= 0) {
      throw new AppError("Room capacity must be at least 1.", 400);
    }

    const existingBeds = await Bed.find({ hospital: hospitalId, room: id });
    const occupiedCount = existingBeds.filter((b) => b.isOccupied || b.status === "Occupied").length;

    if (newCap < occupiedCount) {
      throw new AppError(
        `Cannot reduce capacity to ${newCap}. There are currently ${occupiedCount} occupied beds in this room.`,
        400
      );
    }

    if (newCap > existingBeds.length && autoGenerateBeds) {
      // Regenerate missing beds without deleting occupied ones
      const currentBedNumbers = new Set(existingBeds.map((b) => b.bedNumber));
      for (let i = 0; i < newCap; i++) {
        const letter = getBedLetter(i);
        const bNum = `${room.roomNumber}-${letter}`;
        if (!currentBedNumbers.has(bNum)) {
          const bedCode = `Bed-${room.roomNumber}-${letter}`;
          await Bed.create({
            hospital: hospitalId,
            ward: targetWardId,
            room: id,
            bedNumber: bNum,
            bedCode,
            bedType: "Standard",
            status: "Available",
            isOccupied: false
          });
        }
      }
    } else if (newCap < existingBeds.length) {
      // Safely trim excess unassigned / available beds
      const availableBeds = existingBeds.filter((b) => !b.isOccupied && b.status === "Available");
      const bedsToRemoveCount = existingBeds.length - newCap;
      const bedsToRemove = availableBeds.slice(0, bedsToRemoveCount);
      const removeIds = bedsToRemove.map((b) => b._id);

      if (removeIds.length > 0) {
        await Bed.deleteMany({ _id: { $in: removeIds }, hospital: hospitalId });
      }
    }

    room.capacity = newCap;
  }

  if (roomName !== undefined) room.roomName = roomName.trim();
  if (floor !== undefined) room.floor = Number(floor);
  room.roomType = targetRoomType;
  room.acType = targetAcType;
  room.acSubTypes = targetAcSubTypes;
  if (description !== undefined) room.description = description;
  if (status) room.status = status;

  if (tariff) {
    room.tariff = {
      roomChargePerDay: tariff.roomChargePerDay !== undefined ? Number(tariff.roomChargePerDay) : room.tariff?.roomChargePerDay || 0,
      admissionDeposit: tariff.admissionDeposit !== undefined ? Number(tariff.admissionDeposit) : room.tariff?.admissionDeposit || 0,
      extraBedCharge: tariff.extraBedCharge !== undefined ? Number(tariff.extraBedCharge) : room.tariff?.extraBedCharge || 0,
      nursingCharge: tariff.nursingCharge !== undefined ? Number(tariff.nursingCharge) : room.tariff?.nursingCharge || 0,
      serviceCharge: tariff.serviceCharge !== undefined ? Number(tariff.serviceCharge) : room.tariff?.serviceCharge || 0,
      emergencyCharge: tariff.emergencyCharge !== undefined ? Number(tariff.emergencyCharge) : room.tariff?.emergencyCharge || 0,
      discountPercent: tariff.discountPercent !== undefined ? Number(tariff.discountPercent) : room.tariff?.discountPercent || 0,
      gstPercent: tariff.gstPercent !== undefined ? Number(tariff.gstPercent) : room.tariff?.gstPercent || 0,
      effectiveFrom: tariff.effectiveFrom ? new Date(tariff.effectiveFrom) : room.tariff?.effectiveFrom || new Date(),
      status: tariff.status || room.tariff?.status || "Active"
    };
  }

  await room.save();

  // Also update ward and bed references if ward changed
  if (wardId && String(wardId) !== String(room.ward)) {
    await Bed.updateMany({ hospital: hospitalId, room: id }, { ward: targetWardId });
  }

  res.json({ status: "success", data: { room } });
});

export const deleteRoom = catchAsync(async (req: Request, res: Response) => {
  const hospitalId = req.hospitalFilter!.hospital;
  const { id } = req.params;

  // Real-world validation: Cannot delete room if patients are admitted
  const occupiedBedsCount = await Bed.countDocuments({
    hospital: hospitalId,
    room: id,
    $or: [{ isOccupied: true }, { status: "Occupied" }]
  });

  if (occupiedBedsCount > 0) {
    throw new AppError("Room cannot be deleted because patients are currently admitted in this room.", 400);
  }

  // Remove beds associated with this room safely
  await Bed.deleteMany({ hospital: hospitalId, room: id });

  const room = await Room.findOneAndDelete({ _id: id, hospital: hospitalId });
  if (!room) {
    throw new AppError("Room not found.", 404);
  }

  res.json({ status: "success", message: "Room and its associated vacant beds deleted successfully." });
});
