import { Types } from "mongoose";
import { UserDocument } from "../models/User";
import { TenantContext } from "../utils/dataScope";

declare global {
  namespace Express {
    interface Request {
      user?: UserDocument;
      hospitalFilter?: any;
      tenantContext?: TenantContext;
    }
  }
}

export {};
