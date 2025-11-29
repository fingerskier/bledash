import { useEffect, useMemo, useState } from 'react'
import ConnectedDevicePanel from './components/ConnectedDevicePanel'
import HeroSection from './components/HeroSection'
import OptionalServicesPanel from './components/OptionalServicesPanel'
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
      <HeroSection
        supported={supported}
        isScanning={isScanning}
        onScan={scanForDevice}
        error={error}
      >
        <OptionalServicesPanel
          allowedServices={allowedServices}
          customServicesInput={customServicesInput}
          onCustomServicesChange={setCustomServicesInput}
        />
      </HeroSection>

      <ConnectedDevicePanel deviceInfo={deviceInfo} servicesCount={services.length} />

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
