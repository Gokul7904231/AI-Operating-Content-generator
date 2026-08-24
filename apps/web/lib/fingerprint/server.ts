import { NextRequest } from "next/server";

export interface DeviceContext {
  fingerprint: string;
  ipAddress: string;
  userAgent: string;
}

/**
 * Extracts device context from incoming Next.js API Request.
 */
export function extractDeviceContext(request: NextRequest | Request): DeviceContext {
  const headers = request.headers;
  
  const fingerprint = (
    headers.get("x-device-fingerprint") ||
    headers.get("x-visitor-id") ||
    "unknown_device"
  ).trim();

  const ipAddress = (
    headers.get("x-forwarded-for")?.split(",")[0] ||
    headers.get("x-real-ip") ||
    "127.0.0.1"
  ).trim();

  const userAgent = (
    headers.get("user-agent") ||
    "Unknown Agent"
  ).trim();

  return {
    fingerprint,
    ipAddress,
    userAgent,
  };
}
