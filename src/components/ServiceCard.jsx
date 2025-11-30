import { useEffect, useRef, useState } from 'react'
import styles from '../styles/Base.module.css'
import { normalizeUuid } from '../utils/bluetooth'

function formatDataView(value) {
  if (!value) return ''

  const bytes = Array.from(new Uint8Array(value.buffer))
  const hexString = bytes.map((byte) => byte.toString(16).padStart(2, '0')).join(' ')

  let textString = ''
  try {
    textString = new TextDecoder('utf-8').decode(value.buffer)
  } catch (error) {
    console.warn('Unable to decode value as UTF-8', error)
  }

  const printableText = textString && /[\x20-\x7E]+/.test(textString) ? textString : ''
  return printableText ? `${hexString} (${printableText})` : hexString || '0x00'
}

function parseWriteValue(input) {
  const trimmed = input.trim()
  if (!trimmed) return new Uint8Array()

  const hexPattern = /^([0-9a-fA-F]{2}\s*)+$/
  if (hexPattern.test(trimmed)) {
    const bytes = trimmed
      .split(/\s+/)
      .filter(Boolean)
      .map((byte) => parseInt(byte, 16))
    return new Uint8Array(bytes)
  }

  return new TextEncoder().encode(trimmed)
}

function CharacteristicActions({ detail }) {
  const { supportsRead, supportsWrite, supportsNotify, bluetoothCharacteristic } = detail
  const [readValue, setReadValue] = useState('')
  const [writeValue, setWriteValue] = useState('')
  const [notifyValue, setNotifyValue] = useState('')
  const [isNotifying, setIsNotifying] = useState(false)
  const [isReading, setIsReading] = useState(false)
  const [isWriting, setIsWriting] = useState(false)
  const [isTogglingNotifications, setIsTogglingNotifications] = useState(false)
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')
  const listenerRef = useRef(null)
  const isMountedRef = useRef(true)

  const safeCharacteristic = bluetoothCharacteristic

  const handleRead = async () => {
    if (!supportsRead || !safeCharacteristic?.readValue) {
      setError('Reading is not supported for this characteristic.')
      return
    }

    setError('')
    setStatus('Reading value…')
    setIsReading(true)
    try {
      const value = await safeCharacteristic.readValue()
      setReadValue(formatDataView(value))
      setStatus('Value read successfully')
    } catch (err) {
      console.error('Failed to read characteristic', err)
      setError(err?.message || 'Unable to read value.')
      setStatus('')
    } finally {
      setIsReading(false)
    }
  }

  const handleWrite = async () => {
    if (!supportsWrite || (!safeCharacteristic?.writeValue && !safeCharacteristic?.writeValueWithoutResponse)) {
      setError('Writing is not supported for this characteristic.')
      return
    }

    setError('')
    setStatus('Writing value…')
    setIsWriting(true)

    try {
      const payload = parseWriteValue(writeValue)
      if (safeCharacteristic.writeValue) {
        await safeCharacteristic.writeValue(payload)
      } else {
        await safeCharacteristic.writeValueWithoutResponse(payload)
      }
      setStatus('Value written successfully')
    } catch (err) {
      console.error('Failed to write characteristic', err)
      setError(err?.message || 'Unable to write value.')
      setStatus('')
    } finally {
      setIsWriting(false)
    }
  }

  const stopNotifications = async () => {
    if (!safeCharacteristic) return

    const listener = listenerRef.current
    if (listener) {
      safeCharacteristic.removeEventListener('characteristicvaluechanged', listener)
      listenerRef.current = null
    }

    try {
      if (safeCharacteristic.stopNotifications) {
        await safeCharacteristic.stopNotifications()
      }
    } catch (err) {
      console.warn('Failed to stop notifications', err)
    }

    if (isMountedRef.current) {
      setIsNotifying(false)
      setStatus('Notifications stopped')
    }
  }

  const toggleNotifications = async () => {
    if (!supportsNotify || !safeCharacteristic?.startNotifications) {
      setError('Notifications are not supported for this characteristic.')
      return
    }

    if (isNotifying) {
      await stopNotifications()
      return
    }

    setError('')
    setStatus('Starting notifications…')
    setIsTogglingNotifications(true)

    try {
      const listener = (event) => {
        setNotifyValue(formatDataView(event.target.value))
        setStatus('Receiving updates')
      }

      await safeCharacteristic.startNotifications()
      safeCharacteristic.addEventListener('characteristicvaluechanged', listener)
      listenerRef.current = listener
      setIsNotifying(true)
      setStatus('Listening for notifications')
    } catch (err) {
      console.error('Failed to start notifications', err)
      setError(err?.message || 'Unable to start notifications.')
      setStatus('')
    } finally {
      setIsTogglingNotifications(false)
    }
  }

  useEffect(() => {
    return () => {
      isMountedRef.current = false
      stopNotifications()
    }
  }, [])

  if (!supportsRead && !supportsWrite && !supportsNotify) return null

  return (
    <div className={`${styles.inlinePanel} ${styles.stackSm}`}>
      {supportsRead && (
        <div className={styles.stackSm}>
          <div className={styles.actions}>
            <button className={styles.button} onClick={handleRead} disabled={isReading || isWriting}>
              Read value
            </button>
            {readValue && <span className={`${styles.pill} ${styles.pillNeutral}`}>Last read</span>}
          </div>
          {readValue && <code className={`${styles.mono} ${styles.valueBox}`}>{readValue}</code>}
        </div>
      )}

      {supportsWrite && (
        <div className={styles.stackSm}>
          <label className={styles.label} htmlFor={`write-${detail.uuid}`}>
            Write value
          </label>
          <input
            id={`write-${detail.uuid}`}
            className={styles.input}
            placeholder="Text or hex (e.g., 01 ff 0a)"
            value={writeValue}
            onChange={(event) => setWriteValue(event.target.value)}
          />
          <div className={styles.actions}>
            <button className={styles.button} onClick={handleWrite} disabled={isWriting}>
              Send
            </button>
            <p className={`${styles.muted} ${styles.helpText}`}>
              Values are written as UTF-8 by default. Enter hex bytes to send raw data.
            </p>
          </div>
        </div>
      )}

      {supportsNotify && (
        <div className={styles.stackSm}>
          <div className={styles.actions}>
            <button className={styles.button} onClick={toggleNotifications} disabled={isTogglingNotifications}>
              {isNotifying ? 'Stop notifications' : 'Start notifications'}
            </button>
            {notifyValue && <span className={`${styles.pill} ${styles.pillNeutral}`}>Latest update</span>}
          </div>
          {notifyValue && <code className={`${styles.mono} ${styles.valueBox}`}>{notifyValue}</code>}
        </div>
      )}

      {(status || error) && (
        <div>
          {status && <p className={styles.muted}>{status}</p>}
          {error && <p className={styles.error}>{error}</p>}
        </div>
      )}
    </div>
  )
}

function ServiceCard({ service }) {
  return (
    <div className={styles.panel}>
      <div className={styles.panelHeader}>
        <div>
          <p className={styles.eyebrow}>Service</p>
          <h3>{service.name || 'Unnamed Service'}</h3>
        </div>
        <code className={styles.mono}>{normalizeUuid(service.uuid)}</code>
      </div>
      <div className={`${styles.stack} ${styles.stackSm}`}>
        {service.characteristics.length === 0 ? (
          <p className={styles.muted}>No characteristics reported.</p>
        ) : (
          service.characteristics.map((char) => (
            <div key={char.uuid} className={styles.characteristic}>
              <div className={styles.characteristicHeader}>
                <div>
                  <p className={styles.eyebrow}>Characteristic</p>
                  <p className={styles.mono}>{char.displayUuid}</p>
                  {char.presentation && (
                    <p className={`${styles.muted} ${styles.helpText}`}>
                      {char.presentation}
                    </p>
                  )}
                </div>
                {char.properties.length > 0 && (
                  <div className={styles.pill} title="Supported operations">
                    {char.properties.join(' • ')}
                  </div>
                )}
              </div>
              {char.descriptors.length > 0 && (
                <div className={`${styles.muted} ${styles.helpText}`}>
                  <span className={styles.eyebrow}>Descriptors</span>
                  <div className={styles.stackSm}>
                    {char.descriptors.map((descriptor) => (
                      <div key={descriptor.uuid}>
                        <span className={styles.mono}>{descriptor.label}</span>
                        {descriptor.value && ` — ${descriptor.value}`}
                        {descriptor.presentation && ` — ${descriptor.presentation}`}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <CharacteristicActions detail={char} />
            </div>
          ))
        )}
      </div>
    </div>
  )
}

export default ServiceCard
