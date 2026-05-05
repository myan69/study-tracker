import { createContext, useContext, useState, useCallback } from 'react'

const ModalContext = createContext({
  showAlert: () => {},
  showConfirm: () => {}
})

export function ModalProvider({ children }) {
  const [modal, setModal] = useState({
    isOpen: false,
    message: '',
    type: 'alert',
    resolve: null
  })

  const showAlert = useCallback((message) => {
    return new Promise((resolve) => {
      setModal({ isOpen: true, message, type: 'alert', resolve })
    })
  }, [])

  const showConfirm = useCallback((message) => {
    return new Promise((resolve) => {
      setModal({ isOpen: true, message, type: 'confirm', resolve })
    })
  }, [])

  const handleClose = (result) => {
    const { resolve } = modal
    setModal(prev => ({ ...prev, isOpen: false }))
    if (resolve) resolve(result)
  }

  return (
    <ModalContext.Provider value={{ showAlert, showConfirm }}>
      {children}
      {modal.isOpen && (
        <div className="modal-overlay">
          <div className="modal-content" role="dialog" aria-modal="true">
            <p className="modal-message">{modal.message}</p>
            <div className="modal-actions">
              {modal.type === 'confirm' ? (
                <>
                  <button className="modal-button primary" onClick={() => handleClose(false)}>NO</button>
                  <button className="modal-button secondary" onClick={() => handleClose(true)}>YES</button>
                </>
              ) : (
                <button className="modal-button primary" onClick={() => handleClose(true)}>OK</button>
              )}
            </div>
          </div>
        </div>
      )}
    </ModalContext.Provider>
  )
}

export const useModal = () => useContext(ModalContext)
