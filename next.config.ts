import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */

  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com", // ✅ อนุญาตรูปโปรไฟล์จาก Google
      },
      {
        protocol: "https",
        hostname: "*.googleusercontent.com", // ✅ ครอบคลุม Google ทั้งหมด
      },
      // ✅ เติมส่วนนี้: อนุญาตให้โหลดรูปจาก "ทุกโดเมน" ที่เป็น https
      // ช่วยแก้ปัญหาเวลามีรูปจากเว็บแปลกๆ หรือ Mock Data
      {
        protocol: "https",
        hostname: "**",
      },
    ],
  },
};

export default nextConfig;