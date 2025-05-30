exports.resolvePolarEnv = (req) => {
  const origin = (req.get("origin") || req.get("host") || "").toLowerCase();
  if (
    origin.includes("localhost") ||
    origin.includes("127.0.0.1") ||
    origin.endsWith(".dev") || // Add any other dev domains
    process.env.NODE_ENV !== "production"
  ) {
    // console.info('[Polar] Resolved environment: sandbox from origin', origin);
    return "sandbox";
  }
  // console.info('[Polar] Resolved environment: production from origin', origin);
  return "production";
};