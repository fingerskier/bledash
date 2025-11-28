import styles from '../styles/Base.module.css'
import { normalizeUuid } from '../utils/bluetooth'

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
                  <p className={styles.mono}>{normalizeUuid(char.uuid)}</p>
                </div>
                {char.properties.length > 0 && (
                  <div className={styles.pill} title="Supported operations">
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

export default ServiceCard
