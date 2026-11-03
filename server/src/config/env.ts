import dotenv from "dotenv";
import path from "path";

dotenv.config();

// If required env var MONGO_URI is missing, try candidate paths (especially for packaged Electron app)
if (!process.env.MONGO_URI) {
  const candidatePaths = [
    path.resolve(process.cwd(), ".env"),
    path.resolve(process.cwd(), "server", ".env"),
    path.resolve(__dirname, "..", "..", ".env"),
    path.resolve(__dirname, "..", ".env"),
    path.resolve(__dirname, ".env"),
  ];
  const resPath = process.env.ELECTRON_RESOURCES_PATH || (process as any).resourcesPath;
  if (typeof resPath === "string") {
    candidatePaths.push(
      path.resolve(resPath, "server", ".env"),
      path.resolve(resPath, ".env"),
      path.resolve(resPath, "..", ".env"),
      path.resolve(resPath, "..", "server", ".env")
    );
  }
  for (const envPath of candidatePaths) {
    dotenv.config({ path: envPath });
    if (process.env.MONGO_URI) {
      console.log(`[HMS Server] Loaded environment from: ${envPath}`);
      break;
    }
  }
}

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const env = {
  port: Number(process.env.PORT ?? 5000),
  mongoUri: required("MONGO_URI"),
  jwtSecret: required("JWT_SECRET"),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? "8h",
  clientUrl: process.env.CLIENT_URL ?? "http://localhost:5173",
  nodeEnv: process.env.NODE_ENV ?? "development",
  superAdmin: {
    name: required("SUPER_ADMIN_NAME"),
    email: required("SUPER_ADMIN_EMAIL"),
    password: required("SUPER_ADMIN_PASSWORD"),
  },
};

export const isProduction = env.nodeEnv === "production";
