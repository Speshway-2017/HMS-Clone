const mongoose = require("mongoose");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });

const mongoUri = process.env.MONGO_URI || "";

async function testDirectController() {
  await mongoose.connect(mongoUri);
  const db = mongoose.connection.db;

  // Import models
  require("./models/User");
  require("./models/Doctor");
  require("./models/Patient");
  require("./models/Department");
  require("./models/Appointment");

  const { getTodayAppointments, getAnalytics } = require("./controllers/doctorDashboardController");

  // User Vishal
  const user = await db.collection("users").findOne({ email: "vishal@hms.com" });

  const req = {
    user: user,
    hospitalFilter: { hospital: user.hospital, branch: null }
  };

  let todayData = null;
  const resToday = {
    json: (obj) => { todayData = obj; }
  };

  await getTodayAppointments(req, resToday, (err) => { if (err) console.error("Err:", err); });

  console.log("=== getTodayAppointments direct call result ===");
  console.log("Status:", todayData?.status);
  console.log("Count:", todayData?.data?.length);
  console.log("Data:", todayData?.data);

  let analyticsData = null;
  const resAnalytics = {
    json: (obj) => { analyticsData = obj; }
  };

  await getAnalytics(req, resAnalytics, (err) => { if (err) console.error("Err:", err); });

  console.log("\n=== getAnalytics direct call result ===");
  console.log("Metrics todayAppointments:", analyticsData?.data?.metrics?.todayAppointments);

  await mongoose.disconnect();
}

testDirectController().catch(err => console.error(err));
