/** Build-time switches. Both enhancements are off in an ordinary build. */
export const features = {
  fixedPriceCatalog: process.env.NEXT_PUBLIC_FEATURE_FIXED_PRICE_CATALOG === "true",
  chatVehicleCards:
    process.env.NEXT_PUBLIC_FEATURE_FIXED_PRICE_CATALOG === "true" &&
    process.env.NEXT_PUBLIC_FEATURE_CHAT_VEHICLE_CARDS === "true",
} as const;
