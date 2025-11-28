export const defaultServices = ['generic_access', 'generic_attribute', 'device_information', 'battery_service']

export function normalizeUuid(uuid) {
  if (!uuid) return 'Unknown UUID'
  if (uuid.startsWith('0000') && uuid.endsWith('-0000-1000-8000-00805f9b34fb')) {
    return uuid.slice(4, 8)
  }
  return uuid
}

export function formatProperties(props) {
  return Object.entries(props)
    .filter(([, isSupported]) => isSupported)
    .map(([key]) => key.replace(/[A-Z]/g, (letter) => ` ${letter.toLowerCase()}`))
}
