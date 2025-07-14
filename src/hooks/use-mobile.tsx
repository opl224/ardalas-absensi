"use client"

import * as React from "react"

const MOBILE_BREAKPOINT = 768

export function useIsMobile() {
  // Default to false on the server and during the initial client render.
  const [isMobile, setIsMobile] = React.useState(false)

  React.useEffect(() => {
    // This effect runs only on the client, after the initial render.
    const checkDevice = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    }

    // Run the check once after mount.
    checkDevice()

    // Add a listener for window resize events.
    window.addEventListener("resize", checkDevice)

    // Cleanup the listener when the component unmounts.
    return () => {
      window.removeEventListener("resize", checkDevice)
    }
  }, [])

  return isMobile
}
