import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { Header } from './Header'
import styles from './AppShell.module.css'

/**
 * Fixed sidebar + fixed header + scrolling main content area, per the
 * required layout. Every module route renders inside <Outlet /> here.
 */
export function AppShell() {
  return (
    <div className={styles.shell}>
      <Sidebar />
      <Header />

      <main className={styles.content}>
        <div className={styles.contentInner}>
          <Outlet />
        </div>
      </main>
    </div>
  )
}
