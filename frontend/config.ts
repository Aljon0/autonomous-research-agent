export const config = {
  apiUrl: process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000",      // for browser/client fetches
  internalApiUrl: process.env.INTERNAL_API_URL || "http://backend:4000",   // for server-side fetches inside Docker
};