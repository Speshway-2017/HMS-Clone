import { v2 as cloudinary } from "cloudinary";

const CLOUDINARY_URL_PATTERN = /^cloudinary:\/\/(?<apiKey>[^:]+):(?<apiSecret>[^@]+)@(?<cloudName>.+)$/;

export const CLOUDINARY_ROOT_FOLDER = process.env.CLOUDINARY_ROOT_FOLDER || "HMS_Preethi_Fertility";

function configureCloudinary(): void {
  const url = process.env.CLOUDINARY_URL;
  if (!url) {
    throw new Error("Missing required environment variable: CLOUDINARY_URL");
  }

  const match = url.match(CLOUDINARY_URL_PATTERN);
  if (!match?.groups) {
    throw new Error("CLOUDINARY_URL is not in the expected cloudinary://<api_key>:<api_secret>@<cloud_name> format.");
  }

  if (match.groups.apiKey === match.groups.apiSecret) {
    console.warn(
      "\n⚠️ [CLOUDINARY CONFIG WARNING] The API Key and API Secret in CLOUDINARY_URL are identical!\n" +
      "Cloudinary requires your unique API Secret (found in your Cloudinary Dashboard under 'Product Environment Credentials' or Settings > Access Keys).\n" +
      "Uploads will be rejected by Cloudinary with 'Invalid Signature' (401) until the actual API Secret is updated in server/.env.\n"
    );
  }

  cloudinary.config({
    cloud_name: match.groups.cloudName,
    api_key: match.groups.apiKey,
    api_secret: match.groups.apiSecret,
    secure: true,
  });
}

configureCloudinary();

export { cloudinary };
