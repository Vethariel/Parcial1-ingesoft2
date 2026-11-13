import { useEffect, useState } from 'react'

/** La hora actual, actualizada cada segundo (para cuentas regresivas). */
export function useNow(active = true): number {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (!active) return
    const timer = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [active])
  return now
}
