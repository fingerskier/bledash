import { useEffect, useMemo, useState } from 'react'
import ServiceCard from './components/ServiceCard'
import styles from './styles/Base.module.css'
import { defaultServices, formatProperties, normalizeUuid } from './utils/bluetooth'

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
    <div className={styles.page}>
      <header className={styles.hero}>
        <div>
          <p className={styles.eyebrow}>BLE dashboard</p>
          <h1>Scan for a Bluetooth device</h1>
          <p className={styles.muted}>
            Start a scan to pick a nearby device, connect, and inspect its available services and
            characteristics.
          </p>
          <div className={styles.actions}>
            <button type="button" className={styles.button} onClick={scanForDevice} disabled={isScanning}>
              {isScanning ? 'Scanning…' : 'Start scan'}
            </button>
            {!supported && <span className={`${styles.pill} ${styles.pillWarning}`}>Web Bluetooth unavailable</span>}
          </div>
          {error && <p className={styles.error}>{error}</p>}
        </div>
      </header>

      {deviceInfo && (
        <section className={styles.panel}>
          <div className={styles.panelHeader}>
            <div>
              <p className={styles.eyebrow}>Connected device</p>
              <h2>{deviceInfo.name}</h2>
              <p className={`${styles.muted} ${styles.mono}`}>{deviceInfo.id}</p>
            </div>
            <div className={styles.pill}>{services.length} services</div>
          </div>
        </section>
      )}

      <section className={styles.stack}>
        {services.length === 0 && !deviceInfo && (
          <div className={`${styles.panel} ${styles.muted}`}>Scan to list available services.</div>
        )}

        {services.map((service) => (
          <ServiceCard key={service.uuid} service={service} />
        ))}
      </section>
    </div>
  )
}

export default App
