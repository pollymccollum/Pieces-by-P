import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // Photo uploads go through server actions, and those cap the request
      // body at 1MB by default. Every photo Polly takes on her phone is
      // bigger than that, so uploading one failed with a framework error
      // while the code's own check cheerfully allowed up to 10MB — the app
      // said 10MB was fine and the framework refused at 1MB.
      //
      // 12mb, not 10: the limit counts the raw HTTP body, which for a
      // multipart upload includes boundaries and part headers on top of the
      // file itself. A 10MB photo is a slightly-over-10MB request, so a 10mb
      // ceiling would reject the exact size the admin says is allowed.
      bodySizeLimit: "12mb",
    },
  },
};

export default nextConfig;
