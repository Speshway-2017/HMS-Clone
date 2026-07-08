import { Types } from "mongoose";
import { UserDocument } from "../models/User";

declare global {
  namespace Express {
    interface Request {
      user?: UserDocument;
      hospitalFilter?: { hospital?: Types.ObjectId | string };
    }
  }
}

export {};
