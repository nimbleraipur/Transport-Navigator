export const VEHICLE_IMAGES: Record<string, any> = {
  // Auto / Rickshaw
  'auto': require('@/assets/images/auto.webp'),
  'rickshaw': require('@/assets/images/auto.webp'),
  'auto-rickshaw': require('@/assets/images/auto.webp'),
  'e-rickshaw': require('@/assets/images/e-rickshaw.webp'),

  // Tempo / Small Van
  'tempo': require('@/assets/images/tempo.webp'),
  'truck-delivery': require('@/assets/images/tempo.webp'),
  'van-utility': require('@/assets/images/tempo.webp'),

  // Standard Truck
  'truck': require('@/assets/images/satndaed truk.webp'),
  'standard-truck': require('@/assets/images/satndaed truk.webp'),

  // Heavy Truck / Trailer
  'truck-trailer': require('@/assets/images/haivy truck.webp'),
  'heavy': require('@/assets/images/haivy truck.webp'),
  'heavy-truck': require('@/assets/images/haivy truck.webp'),

  // Pickup / Small Pickup
  'pickup': require('@/assets/images/pickup.webp'),
  'van-passenger': require('@/assets/images/pickup.webp'),
};

export function getVehicleImageSource(icon?: string, type?: string): any {
  const iconKey = icon ? icon.toLowerCase() : '';
  const typeKey = type ? type.toLowerCase() : '';

  if (iconKey && VEHICLE_IMAGES[iconKey]) {
    return VEHICLE_IMAGES[iconKey];
  }
  if (typeKey && VEHICLE_IMAGES[typeKey]) {
    return VEHICLE_IMAGES[typeKey];
  }
  // Try partial match or fallbacks
  if (iconKey.includes('e-rickshaw') || typeKey.includes('e-rickshaw')) {
    return VEHICLE_IMAGES['e-rickshaw'];
  }
  if (iconKey.includes('rickshaw') || typeKey.includes('auto')) {
    return VEHICLE_IMAGES['auto'];
  }
  if (iconKey.includes('delivery') || typeKey.includes('tempo')) {
    return VEHICLE_IMAGES['tempo'];
  }
  if (iconKey.includes('trailer') || typeKey.includes('heavy') || typeKey.includes('haivy')) {
    return VEHICLE_IMAGES['truck-trailer'];
  }
  if (iconKey.includes('passenger') || typeKey.includes('pickup')) {
    return VEHICLE_IMAGES['pickup'];
  }
  return VEHICLE_IMAGES['truck'];
}
