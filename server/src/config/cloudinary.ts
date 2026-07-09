import { v2 as cloudinary } from "cloudinary";

const CLOUDINARY_URL_PATTERN = /^cloudinary:\/\/(?<apiKey>[^:]+):(?<apiSecret>[^@]+)@(?<cloudName>.+)$/;

function configureCloudinary(): void {
  const url = process.env.CLOUDINARY_URL;
  if (!url) {
    throw new Error("Missing required environment variable: CLOUDINARY_URL");
  }

  const match = url.match(CLOUDINARY_URL_PATTERN);
  if (!match?.groups) {
    throw new Error("CLOUDINARY_URL is not in the expected cloudinary://<api_key>:<api_secret>@<cloud_name> format.");
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
