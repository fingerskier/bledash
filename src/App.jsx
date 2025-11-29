import { useEffect, useMemo, useState } from 'react'
import ServiceCard from './components/ServiceCard'
import styles from './styles/Base.module.css'
import {
  defaultServices,
  formatUuidWithDescriptor,
  inspectCharacteristic,
} from './utils/bluetooth'

function App() {
  const [supported, setSupported] = useState(false)
  const [isScanning, setIsScanning] = useState(false)
  const [deviceInfo, setDeviceInfo] = useState(null)
  const [services, setServices] = useState([])
  const [error, setError] = useState('')
  const [customServicesInput, setCustomServicesInput] = useState('')

  useEffect(() => {
    setSupported(typeof navigator !== 'undefined' && 'bluetooth' in navigator)
  }, [])

  const customServices = useMemo(
    () =>
      customServicesInput
        .split(/[\n,]/)
        .map((service) => service.trim())
        .filter(Boolean),
    [customServicesInput]
  )

  const allowedServices = useMemo(
    () => Array.from(new Set([...defaultServices, ...customServices])),
    [customServices]
  )

  const handleDisconnect = (event) => {
    const device = event?.target
    console.log('Device disconnected from GATT server', {
      id: device?.id,
      name: device?.name,
    })
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
      console.log('Starting device scan: calling navigator.bluetooth.requestDevice', {
        optionalServices: allowedServices,
      })
      const device = await navigator.bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: allowedServices,
      })

      console.log('Device selected', { id: device.id, name: device.name })
      setDeviceInfo({ name: device.name || 'Unknown device', id: device.id })
      device.addEventListener('gattserverdisconnected', handleDisconnect)

      console.log('Connecting to GATT server…')
      const server = await device.gatt.connect()
      console.log('Connected to GATT server')

      console.log('Fetching primary services…')
      const primaryServices = await server.getPrimaryServices()

      const detailedServices = await Promise.all(
        primaryServices.map(async (service) => {
          const characteristics = await service.getCharacteristics()
          console.log('Enumerated characteristics for service', service.uuid, {
            count: characteristics.length,
            uuids: characteristics.map((char) => char.uuid),
          })
          const characteristicDetails = await Promise.all(
            characteristics.map((char) => inspectCharacteristic(char))
          )
          return {
            uuid: service.uuid,
            name: formatUuidWithDescriptor(service.uuid, 'service'),
            characteristics: characteristicDetails,
          }
        })
      )

      setServices(detailedServices)
    } catch (err) {
      console.error('Scan failed', { name: err?.name, message: err?.message })
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
          <div className={`${styles.panel} ${styles.inlinePanel}`}>
            <div className={styles.stack}>
              <div className={styles.panelHeader}>
                <div>
                  <p className={styles.eyebrow}>Optional services</p>
                  <h3>Include custom service UUIDs</h3>
                  <p className={styles.muted}>
                    Default Bluetooth services are prefilled. Add UUIDs or service names to include custom
                    services when requesting a device.
                  </p>
                </div>
              </div>
              <label className={styles.label} htmlFor="services-input">
                Additional services (comma or newline separated)
              </label>
              <textarea
                id="services-input"
                className={styles.textarea}
                value={customServicesInput}
                onChange={(event) => setCustomServicesInput(event.target.value)}
                placeholder="custom_service, 12345678-1234-1234-1234-1234567890ab"
                rows={3}
              />
              <p className={`${styles.muted} ${styles.helpText}`}>
                We will request these services along with defaults to ensure custom characteristics are returned.
              </p>
              <div className={styles.pillRow}>
                {allowedServices.map((service) => (
                  <span key={service} className={`${styles.pill} ${styles.pillNeutral}`}>
                    {service}
                  </span>
                ))}
              </div>
            </div>
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
