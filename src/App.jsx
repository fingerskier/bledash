import { useEffect, useMemo, useState } from 'react'
import './App.css'

const defaultServices = ['generic_access', 'generic_attribute', 'device_information', 'battery_service']

function normalizeUuid(uuid) {
  if (!uuid) return 'Unknown UUID'
  if (uuid.startsWith('0000') && uuid.endsWith('-0000-1000-8000-00805f9b34fb')) {
    return uuid.slice(4, 8)
  }
  return uuid
}

function formatProperties(props) {
  return Object.entries(props)
    .filter(([, isSupported]) => isSupported)
    .map(([key]) => key.replace(/[A-Z]/g, (letter) => ` ${letter.toLowerCase()}`))
}

function ServiceCard({ service }) {
  return (
    <div className="panel">
      <div className="panel__header">
        <div>
          <p className="eyebrow">Service</p>
          <h3>{service.name || 'Unnamed Service'}</h3>
        </div>
        <code className="mono">{normalizeUuid(service.uuid)}</code>
      </div>
      <div className="stack stack--sm">
        {service.characteristics.length === 0 ? (
          <p className="muted">No characteristics reported.</p>
        ) : (
          service.characteristics.map((char) => (
            <div key={char.uuid} className="characteristic">
              <div className="characteristic__header">
                <div>
                  <p className="eyebrow">Characteristic</p>
                  <p className="mono">{normalizeUuid(char.uuid)}</p>
                </div>
                {char.properties.length > 0 && (
                  <div className="pill" title="Supported operations">
                    {char.properties.join(' • ')}
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

function App() {
  const [supported, setSupported] = useState(false)
  const [isScanning, setIsScanning] = useState(false)
  const [deviceInfo, setDeviceInfo] = useState(null)
  const [services, setServices] = useState([])
  const [error, setError] = useState('')

  useEffect(() => {
    setSupported(typeof navigator !== 'undefined' && 'bluetooth' in navigator)
  }, [])

  const allowedServices = useMemo(
    () => Array.from(new Set(defaultServices)),
    []
  )

  const handleDisconnect = () => {
    setError('Device disconnected. Scan again to reconnect.')
  }

  const scanForDevice = async () => {
    setError('')
    setDeviceInfo(null)
    setServices([])

    if (!supported) {
      setError('Web Bluetooth is not supported in this browser.')
      return
    }

    try {
      setIsScanning(true)
      const device = await navigator.bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: allowedServices,
      })

      setDeviceInfo({ name: device.name || 'Unknown device', id: device.id })
      device.addEventListener('gattserverdisconnected', handleDisconnect)

      const server = await device.gatt.connect()
      const primaryServices = await server.getPrimaryServices()

      const detailedServices = await Promise.all(
        primaryServices.map(async (service) => {
          const characteristics = await service.getCharacteristics()
          return {
            uuid: service.uuid,
            name: normalizeUuid(service.uuid),
            characteristics: characteristics.map((char) => ({
              uuid: char.uuid,
              properties: formatProperties(char.properties),
            })),
          }
        })
      )

      setServices(detailedServices)
    } catch (err) {
      if (err?.name === 'NotFoundError') {
        setError('No device selected. Try again to scan for nearby devices.')
      } else {
        setError(err?.message || 'Unable to scan for devices.')
      }
    } finally {
      setIsScanning(false)
    }
  }

  return (
    <div className="page">
      <header className="hero">
        <div>
          <p className="eyebrow">BLE dashboard</p>
          <h1>Scan for a Bluetooth device</h1>
          <p className="muted">
            Start a scan to pick a nearby device, connect, and inspect its available services and
            characteristics.
          </p>
          <div className="actions">
            <button type="button" onClick={scanForDevice} disabled={isScanning}>
              {isScanning ? 'Scanning…' : 'Start scan'}
            </button>
            {!supported && <span className="pill pill--warning">Web Bluetooth unavailable</span>}
          </div>
          {error && <p className="error">{error}</p>}
        </div>
      </header>

      {deviceInfo && (
        <section className="panel">
          <div className="panel__header">
            <div>
              <p className="eyebrow">Connected device</p>
              <h2>{deviceInfo.name}</h2>
              <p className="muted mono">{deviceInfo.id}</p>
            </div>
            <div className="pill">{services.length} services</div>
          </div>
        </section>
      )}

      <section className="stack">
        {services.length === 0 && !deviceInfo && (
          <div className="panel muted">Scan to list available services.</div>
        )}

        {services.map((service) => (
          <ServiceCard key={service.uuid} service={service} />
        ))}
      </section>
    </div>
  )
}

export default App
