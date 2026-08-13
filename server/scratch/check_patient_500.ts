import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import { Patient } from "../src/models/Patient";
import { ReceptionService } from "../src/services/receptionService";

dotenv.config({ path: path.join(__dirname, "../.env") });

async function run() {
  const mongoUri = process.env.MONGODB_URI || "mongodb://localhost:27017/hospital-management-system";
  console.log("Connecting to MongoDB:", mongoUri);
  await mongoose.connect(mongoUri);

  const patientId = "6a7da281ae8dd1cee3624317";
  console.log("Testing patientId:", patientId);

  try {
    const patient = await Patient.findById(patientId);
    console.log("Patient found by ID:", patient);

    if (patient) {
      console.log("Calling ReceptionService.getPatientDetail for hospital:", patient.hospital);
      const res = await ReceptionService.getPatientDetail({ hospital: patient.hospital, branch: null }, patientId);
      console.log("getPatientDetail succeeded:", res.patient.name);
    } else {
      console.log("Patient not found in DB!");
      // Let's find any patient in DB
      const anyPatient = await Patient.findOne();
      console.log("Sample patient in DB:", anyPatient ? { id: anyPatient._id, name: anyPatient.name, hospital: anyPatient.hospital } : "None");
    }
  } catch (err: any) {
    console.error("ERROR CAUGHT IN TEST:", err);
  } finally {
    await mongoose.disconnect();
  }
}

run();
