export const defaultServices = ['generic_access', 'generic_attribute', 'device_information', 'battery_service']

const BASE_UUID_SUFFIX = '-0000-1000-8000-00805f9b34fb'

const namedUuidShortcodes = {
  generic_access: '1800',
  generic_attribute: '1801',
  device_information: '180a',
  battery_service: '180f',
}

const standardServices = {
  '1800': 'Generic Access',
  '1801': 'Generic Attribute',
  '180a': 'Device Information',
  '180f': 'Battery Service',
}

const standardCharacteristics = {
  '2a00': 'Device Name',
  '2a01': 'Appearance',
  '2a19': 'Battery Level',
  '2a29': 'Manufacturer Name String',
  '2a24': 'Model Number String',
  '2a25': 'Serial Number String',
  '2a26': 'Firmware Revision String',
  '2a27': 'Hardware Revision String',
  '2a28': 'Software Revision String',
}

const standardDescriptors = {
  '2901': 'Characteristic User Description',
  '2902': 'Client Characteristic Configuration',
  '2904': 'Characteristic Presentation Format',
}

function normalizeToShortUuid(uuid) {
  if (!uuid) return 'Unknown UUID'
  const normalizedUuid = uuid.toLowerCase()

  if (normalizedUuid in namedUuidShortcodes) {
    return namedUuidShortcodes[normalizedUuid]
  }

  if (normalizedUuid.startsWith('0000') && normalizedUuid.endsWith(BASE_UUID_SUFFIX)) {
    return normalizedUuid.slice(4, 8)
  }

  return normalizedUuid
}

export function normalizeUuid(uuid) {
  return normalizeToShortUuid(uuid).toUpperCase()
}

function describeKnownUuid(uuid, type) {
  const lookup = type === 'service' ? standardServices : type === 'descriptor' ? standardDescriptors : standardCharacteristics
  const name = lookup[uuid]
  return name ? `${normalizeUuid(uuid)} (${name})` : normalizeUuid(uuid)
}

export function formatUuidWithDescriptor(uuid, type) {
  const shortUuid = normalizeToShortUuid(uuid)
  return describeKnownUuid(shortUuid, type)
}

export function formatProperties(props = {}) {
  return Object.entries(props)
    .filter(([, isSupported]) => isSupported)
    .map(([key]) => key.replace(/[A-Z]/g, (letter) => ` ${letter.toLowerCase()}`))
}

const PRESENTATION_FORMATS = {
  0x01: 'boolean',
  0x02: '2-bit',
  0x04: 'uint8',
  0x05: 'uint12',
  0x06: 'uint16',
  0x07: 'uint24',
  0x08: 'uint32',
  0x09: 'uint48',
  0x0a: 'uint64',
  0x0b: 'uint128',
  0x0c: 'sint8',
  0x0d: 'sint12',
  0x0e: 'sint16',
  0x0f: 'sint24',
  0x10: 'sint32',
  0x11: 'sint48',
  0x12: 'sint64',
  0x13: 'sint128',
  0x14: 'float32',
  0x15: 'float64',
  0x16: 'sfloat',
  0x17: 'float',
  0x1e: 'utf-8 string',
  0x1f: 'utf-16 string',
}

function parsePresentationFormat(descriptorValue) {
  const format = descriptorValue.getUint8(0)
  const exponent = descriptorValue.getInt8(1)
  const unit = descriptorValue.getUint16(2, true)
  const description = descriptorValue.getUint16(6, true)

  const formatLabel = PRESENTATION_FORMATS[format] || `0x${format.toString(16)}`

  return `Format: ${formatLabel}, exponent: ${exponent}, unit: 0x${unit.toString(16)}, description: 0x${description.toString(16)}`
}

function deriveCapabilities(characteristic) {
  const properties = characteristic?.properties || {}

  return {
    supportsRead: Boolean(properties.read),
    supportsWrite: Boolean(properties.write || properties.writeWithoutResponse),
    supportsNotify: Boolean(properties.notify || properties.indicate),
  }
}

async function describeDescriptor(descriptor) {
  const normalizedUuid = normalizeToShortUuid(descriptor.uuid)
  const label = formatUuidWithDescriptor(normalizedUuid, 'descriptor')

  if (!descriptor.readValue) {
    return { uuid: descriptor.uuid, label }
  }

  try {
    const value = await descriptor.readValue()
    if (normalizedUuid === '2901') {
      const description = new TextDecoder('utf-8').decode(value.buffer)
      return { uuid: descriptor.uuid, label, value: description }
    }

    if (normalizedUuid === '2904' && value.byteLength >= 7) {
      return { uuid: descriptor.uuid, label, presentation: parsePresentationFormat(value) }
    }

    return { uuid: descriptor.uuid, label }
  } catch (error) {
    console.warn('Unable to read descriptor value', { uuid: descriptor.uuid, error })
    return { uuid: descriptor.uuid, label }
  }
}

export async function inspectCharacteristic(characteristic) {
  const capabilities = deriveCapabilities(characteristic)
  const base = {
    uuid: characteristic.uuid,
    displayUuid: formatUuidWithDescriptor(characteristic.uuid, 'characteristic'),
    properties: formatProperties(characteristic.properties),
    descriptors: [],
    presentation: '',
    bluetoothCharacteristic: characteristic,
    ...capabilities,
  }

  if (typeof characteristic.getDescriptors !== 'function') {
    return base
  }

  try {
    const descriptors = await characteristic.getDescriptors()
    const descriptorDetails = await Promise.all(descriptors.map((descriptor) => describeDescriptor(descriptor)))
    const presentation = descriptorDetails.find((item) => item.presentation)?.presentation || ''

    return {
      ...base,
      descriptors: descriptorDetails,
      presentation,
    }
  } catch (error) {
    console.warn('Descriptor introspection failed', { uuid: characteristic.uuid, error })
    return base
  }
}
