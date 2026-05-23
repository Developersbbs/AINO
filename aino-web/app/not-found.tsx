import styles from './not-found.module.css';

export default function NotFound() {
  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.icon}>!</div>
        <h1 className={styles.title}>Link Expired</h1>
        <p className={styles.desc}>
          This share link is invalid or has expired. Please ask your agent to generate a new link.
        </p>
        <div className={styles.brand}>
          <div className={styles.brandMark}>A</div>
          <span className={styles.brandName}>AINO</span>
        </div>
      </div>
    </div>
  );
}
