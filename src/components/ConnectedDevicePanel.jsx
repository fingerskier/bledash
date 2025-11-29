import styles from '../styles/Base.module.css'

function ConnectedDevicePanel({ deviceInfo, servicesCount }) {
  if (!deviceInfo) return null

  return (
    <section className={styles.panel}>
      <div className={styles.panelHeader}>
        <div>
          <p className={styles.eyebrow}>Connected device</p>
          <h2>{deviceInfo.name}</h2>
          <p className={`${styles.muted} ${styles.mono}`}>{deviceInfo.id}</p>
        </div>
        <div className={styles.pill}>{servicesCount} services</div>
      </div>
    </section>
  )
}

export default ConnectedDevicePanel
