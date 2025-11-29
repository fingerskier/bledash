import styles from '../styles/Base.module.css'

function OptionalServicesPanel({ allowedServices, customServicesInput, onCustomServicesChange }) {
  return (
    <div className={`${styles.panel} ${styles.inlinePanel}`}>
      <div className={styles.stack}>
        <div className={styles.panelHeader}>
          <div>
            <p className={styles.eyebrow}>Optional services</p>
            <h3>Include custom service UUIDs</h3>
            <p className={styles.muted}>
              Default Bluetooth services are prefilled. Add UUIDs or service names to include custom services when
              requesting a device.
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
          onChange={(event) => onCustomServicesChange(event.target.value)}
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
  )
}

export default OptionalServicesPanel
