const FEATURE_LABELS = {
  dashboard: 'Dashboard',
  room_management: 'Room management',
  basic_reservations: 'Basic reservations',
  advanced_reservations: 'Advanced reservations',
  staff_management: 'Staff management',
  inventory: 'Inventory management',
  housekeeping: 'Housekeeping',
  reports: 'Reports',
  multi_property: 'Multi-property management',
  api_access: 'API access',
};

export function subscriptionFeatureList(features) {
  if (Array.isArray(features)) {
    return features.filter((feature) => typeof feature === 'string' && feature.trim());
  }

  if (!features || typeof features !== 'object') return [];

  return Object.entries(features)
    .filter(([, enabled]) => Boolean(enabled))
    .map(([key]) => FEATURE_LABELS[key] || key.split('_').map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(' '));
}