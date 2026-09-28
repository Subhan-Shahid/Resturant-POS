import { useEffect } from 'react'

/**
 * Custom hook to lock/unlock body scroll when modal is open
 * @param {boolean} isOpen - Whether the modal is open
 */
export function useModalScrollLock(isOpen) {
  useEffect(() => {
    if (isOpen) {
      // Store original overflow style
      const originalStyle = window.getComputedStyle(document.body).overflow
      
      // Lock scroll
      document.body.style.overflow = 'hidden'
      
      // Cleanup function to restore scroll
      return () => {
        document.body.style.overflow = originalStyle
      }
    }
  }, [isOpen])
}

export default useModalScrollLock
