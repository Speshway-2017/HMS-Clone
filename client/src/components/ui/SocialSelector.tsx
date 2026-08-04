import React, { useState } from "react";

type SVGProps = React.SVGProps<SVGSVGElement>;

export const XIcon: React.FC<SVGProps> = (props) => (
  <svg viewBox="0 0 512 512" fill="currentColor" {...props}>
    <title>X icon</title>
    <path d="M389.2 48h70.6L305.6 224.2 487 464H345L233.7 318.6 106.5 464H35.8L200.7 275.5 26.8 48H172.4L272.9 180.9 389.2 48zM364.4 421.8h39.1L151.1 88h-42L364.4 421.8z" />
  </svg>
);

export const ThreadsIcon: React.FC<SVGProps> = (props) => (
  <svg viewBox="0 0 448 512" fill="currentColor" {...props}>
    <title>Threads icon</title>
    <path d="M331.5 235.7c2.2 .9 4.2 1.9 6.3 2.8c29.2 14.1 50.6 35.2 61.8 61.4c15.7 36.5 17.2 95.8-30.3 143.2c-36.2 36.2-80.3 52.5-142.6 53h-.3c-70.2-.5-124.1-24.1-160.4-70.2c-32.3-41-48.9-98.1-49.5-169.6V256v-.2C17 184.3 33.6 127.2 65.9 86.2C102.2 40.1 156.2 16.5 226.4 16h.3c70.3 .5 124.9 24 162.3 69.9c18.4 22.7 32 50 40.6 81.7l-40.4 10.8c-7.1-25.8-17.8-47.8-32.2-65.4c-29.2-35.8-73-54.2-130.5-54.6c-57 .5-100.1 18.8-128.2 54.4C72.1 146.1 58.5 194.3 58 256c.5 61.7 14.1 109.9 40.3 143.3c28 35.6 71.2 53.9 128.2 54.4c51.4-.4 85.4-12.6 113.7-40.9c32.3-32.2 31.7-71.8 21.4-95.9c-6.1-14.2-17.1-26-31.9-34.9c-3.7 26.9-11.8 48.3-24.7 64.8c-17.1 21.8-41.4 33.6-72.7 35.3c-23.6 1.3-46.3-4.4-63.9-16c-20.8-13.8-33-34.8-34.3-59.3c-2.5-48.3 35.7-83 95.2-86.4c21.1-1.2 40.9-.3 59.2 2.8c-2.4-14.8-7.3-26.6-14.6-35.2c-10-11.7-25.6-17.7-46.2-17.8H227c-16.6 0-39 4.6-53.3 26.3l-34.4-23.6c19.2-29.1 50.3-45.1 87.8-45.1h.8c62.6 .4 99.9 39.5 103.7 107.7l-.2 .2zm-156 68.8c1.3 25.1 28.4 36.8 54.6 35.3c25.6-1.4 54.6-11.4 59.5-73.2c-13.2-2.9-27.8-4.4-43.4-4.4c-4.8 0-9.6 .1-14.4 .4c-42.9 2.4-57.2 23.2-56.2 41.8l-.1 .1z" />
  </svg>
);

export const BskyIcon: React.FC<SVGProps> = (props) => (
  <svg viewBox="0 0 512 512" fill="currentColor" {...props}>
    <title>Bluesky icon</title>
    <path d="M111.8 62.2C170.2 105.9 233 194.7 256 242.4c23-47.6 85.8-136.4 144.2-180.2c42.1-31.6 110.3-56 110.3 21.8c0 15.5-8.9 130.5-14.1 149.2C478.2 298 412 314.6 353.1 304.5c102.9 17.5 129.1 75.5 72.5 133.5c-107.4 110.2-154.3-27.6-166.3-62.9l0 0c-1.7-4.9-2.6-7.8-3.3-7.8s-1.6 3-3.3 7.8l0 0c-12 35.3-59 173.1-166.3 62.9c-56.5-58-30.4-116 72.5-133.5C100 314.6 33.8 298 15.7 233.1C10.4 214.4 1.5 99.4 1.5 83.9c0-77.8 68.2-53.4 110.3-21.8z" />
  </svg>
);

export const FacebookIcon: React.FC<SVGProps> = (props) => (
  <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
    <title>Facebook icon</title>
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
  </svg>
);

export const InstagramIcon: React.FC<SVGProps> = (props) => (
  <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
    <title>Instagram icon</title>
    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
  </svg>
);

export interface Platform {
  domain: string;
  icon: React.ReactNode;
  name: string;
  url: string;
  brandColor: string;
}

const defaultPlatforms: Platform[] = [
  {
    domain: "facebook.com",
    icon: <FacebookIcon className="h-5 w-5" />,
    name: "Facebook",
    url: "https://facebook.com",
    brandColor: "#1877F2",
  },
  {
    domain: "x.com",
    icon: <XIcon className="h-5 w-5" />,
    name: "X",
    url: "https://x.com",
    brandColor: "#000000",
  },
  {
    domain: "instagram.com",
    icon: <InstagramIcon className="h-5 w-5" />,
    name: "Instagram",
    url: "https://instagram.com",
    brandColor: "#E4405F",
  },
  {
    domain: "bsky.app",
    icon: <BskyIcon className="h-5 w-5" />,
    name: "Bluesky",
    url: "https://bsky.app",
    brandColor: "#0085FF",
  },
  {
    domain: "threads.net",
    icon: <ThreadsIcon className="h-5 w-5" />,
    name: "Threads",
    url: "https://threads.net",
    brandColor: "#000000",
  },
];

export interface SocialSelectorProps {
  className?: string;
  handle?: string;
  onChange?: (platform: Platform) => void;
  platforms?: Platform[];
  selectedPlatform?: Platform;
}

export default function SocialSelector({
  platforms = defaultPlatforms,
  handle = "sunrisehospital",
  selectedPlatform: controlledSelected,
  onChange,
  className = "",
}: SocialSelectorProps) {
  const [internalSelected, setInternalSelected] = useState<Platform>(platforms[0]);
  const selectedPlatform = controlledSelected ?? internalSelected;
  const selectedIndex = platforms.findIndex((p) => p.name === selectedPlatform.name);

  return (
    <div className={`w-full text-left ${className}`}>
      <div className="space-y-3">
        <div className="flex items-center justify-start">
          <div className="relative inline-flex items-center justify-start gap-[6px] bg-slate-100/90 p-[6px] rounded-full border border-slate-200 shadow-inner overflow-hidden">
            {/* Smooth Sliding Brand Color Pill Indicator */}
            <div
              className="absolute left-[6px] top-[6px] h-9 w-9 rounded-full shadow-md z-0"
              style={{
                backgroundColor: selectedPlatform.brandColor,
                transform: `translateX(${selectedIndex * 42}px)`,
                transition: "transform 0.35s cubic-bezier(0.16, 1, 0.3, 1), background-color 0.35s ease",
              }}
            />

            {platforms.map((platform) => {
              const isSelected = selectedPlatform.name === platform.name;
              return (
                <button
                  aria-label={`Select ${platform.name} platform`}
                  className="relative z-10 cursor-pointer rounded-full h-9 w-9 flex items-center justify-center transition-colors duration-200 group"
                  key={platform.name}
                  onClick={() => {
                    if (onChange) {
                      onChange(platform);
                    } else {
                      setInternalSelected(platform);
                    }
                  }}
                  type="button"
                >
                  <span
                    className={`flex items-center justify-center transition-all duration-300 ${
                      isSelected ? "text-white scale-105" : "text-slate-600 group-hover:text-slate-900"
                    }`}
                  >
                    {platform.icon}
                  </span>
                  <span className="sr-only">{platform.name}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="text-xs text-slate-500 font-medium space-y-0.5 pl-1">
          <div>
            Follow us on{" "}
            <a
              href={selectedPlatform.url}
              target="_blank"
              rel="noopener noreferrer"
              className="font-extrabold hover:underline transition-all"
              style={{ color: selectedPlatform.brandColor }}
            >
              {selectedPlatform.domain}
            </a>
          </div>
          <div>
            <a
              href={selectedPlatform.url}
              target="_blank"
              rel="noopener noreferrer"
              className="font-extrabold text-slate-900 hover:opacity-80 transition-opacity"
            >
              @{handle}
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
