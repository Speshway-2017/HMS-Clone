import { Request, Response } from "express";
import { catchAsync } from "../utils/catchAsync";
import { AppError } from "../utils/AppError";
import { Bed } from "../models/Bed";
import { Room } from "../models/Room";
import { Admission } from "../models/Admission";
import { buildBranchQuery } from "../utils/branchQueryHelper";
import { z } from "zod";
import {
  requiredTrimmedString,
  optionalTrimmedString,
  codeValidator,
} from "../utils/validators";

const BED_NUMBER_REGEX = /^[A-Za-z0-9\-_./\s]+$/;

const bedSchema = z.object({
  roomId: z
    .string({ invalid_type_error: "Please enter valid data" })
    .trim()
    .min(1, "Please select a destination Room. Please fill out this field"),
  bedNumber: z
    .string({ invalid_type_error: "Please enter valid data" })
    .trim()
    .min(1, "Bed Number / Prefix is required. Please fill out this field")
    .max(50, "Bed Number cannot exceed 50 characters. Please enter valid data")
    .refine((val) => BED_NUMBER_REGEX.test(val), {
      message: "Bed Number contains invalid data. Please enter valid data",
    }),
  bedType: z
    .string({ invalid_type_error: "Please enter valid data" })
    .trim()
    .max(50, "Bed Hardware Type cannot exceed 50 characters. Please enter valid data")
    .optional()
    .default("Standard"),
  status: z
    .enum(["Available", "Occupied", "Maintenance", "Reserved", "Cleaning", "Blocked"])
    .optional()
    .default("Available"),
  lastSanitized: z.string().optional(),
});

export const listBeds = catchAsync(async (req: Request, res: Response) => {
  const { search, ward, room, status, page = 1, limit = 10 } = req.query;

  const query: any = buildBranchQuery(req.hospitalFilter);

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
      .populate("room", "roomNumber roomName roomType tariff capacity")
      .populate("patient", "name uhid patientCode phone")
      .populate("admission", "admissionNumber admissionDate status")
      .sort({ bedNumber: 1 })
      .skip(skip)
      .limit(limitNum)
      .lean(),
    Bed.countDocuments(query)
  ]);

  // Enrich occupied beds with patient details if missing from direct reference
  const enrichedBeds = await Promise.all(
    beds.map(async (b: any) => {
      if ((!b.admission || !b.patient) && (b.isOccupied || b.status === "Occupied")) {
        const activeAdm = await Admission.findOne({
          hospital: req.hospitalFilter?.hospital,
          $or: [{ bed: b._id }, ...(b.patient ? [{ patient: (b.patient as any)._id || b.patient }] : [])],
          status: { $nin: ["discharged", "Discharged", "Cancelled", "Expired", "Transferred Out (Final)"] }
        })
          .populate("patient", "name uhid patientCode phone")
          .lean();

        if (activeAdm) {
          return {
            ...b,
            patient: activeAdm.patient || b.patient,
            admission: {
              _id: activeAdm._id,
              admissionNumber: activeAdm.admissionNumber,
              status: activeAdm.status
            }
          };
        }
      }
      return b;
    })
  );

  res.json({
    status: "success",
    data: {
      beds: enrichedBeds,
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
  const parsed = bedSchema.parse(req.body);
  const hospitalId = req.hospitalFilter!.hospital;
  const branchId = req.hospitalFilter?.branch ?? null;
  const { bedNumber, roomId, bedType, status } = parsed;

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
  const parsed = bedSchema.partial().parse(req.body);
  const { id } = req.params;
  const { bedNumber, roomId, bedType, status } = parsed;

  const hospitalId = req.hospitalFilter?.hospital || (req.user as any)?.hospital;
  const bed = await Bed.findOne({ _id: id, hospital: hospitalId });
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

    bed.room = roomId as any;
    bed.ward = room.ward as any;
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
    if (bed.status === "Occupied" && status !== "Occupied" && (bed.patient || bed.isOccupied)) {
      throw new AppError("Occupied beds can only be made available via inpatient transfer or discharge.", 400);
    }
    bed.status = status;
    bed.isOccupied = status === "Occupied";
    if (status !== "Occupied" && !bed.patient) {
      bed.isOccupied = false;
    }
    if (status === "Cleaning") {
      bed.lastSanitized = new Date();
    }
  }

  if (req.body.lastSanitized) {
    bed.lastSanitized = new Date(req.body.lastSanitized);
  }

  await bed.save();

  await bed.populate([
    { path: "ward", select: "name code" },
    { path: "room", select: "roomNumber roomName roomType capacity tariff" },
    { path: "patient", select: "name uhid patientCode phone" },
    { path: "admission", select: "admissionNumber admissionDate status" }
  ]);

  res.json({ status: "success", data: { bed } });
});

export const deleteBed = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;

  const hospitalId = req.hospitalFilter?.hospital || (req.user as any)?.hospital;
  const bed = await Bed.findOne({ _id: id, hospital: hospitalId });
  if (!bed) {
    throw new AppError("Bed not found.", 404);
  }

  if (bed.status === "Occupied" || (bed.patient && bed.isOccupied)) {
    throw new AppError("Cannot delete bed because it is currently occupied by a patient.", 400);
  }

  await Bed.deleteOne({ _id: id });

  res.json({ status: "success", message: "Bed deleted successfully." });
});
