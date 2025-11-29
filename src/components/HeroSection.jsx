import styles from '../styles/Base.module.css'

function HeroSection({ supported, isScanning, onScan, children, error }) {
  return (
    <header className={styles.hero}>
      <div>
        <p className={styles.eyebrow}>BLE dashboard</p>
        <h1>Scan for a Bluetooth device</h1>
        <p className={styles.muted}>
          Start a scan to pick a nearby device, connect, and inspect its available services and
          characteristics.
        </p>
        <div className={styles.actions}>
          <button type="button" className={styles.button} onClick={onScan} disabled={isScanning}>
            {isScanning ? 'Scanning…' : 'Start scan'}
          </button>
          {!supported && <span className={`${styles.pill} ${styles.pillWarning}`}>Web Bluetooth unavailable</span>}
        </div>
        {children}
        {error && <p className={styles.error}>{error}</p>}
      </div>
    </header>
  )
}

export default HeroSection
