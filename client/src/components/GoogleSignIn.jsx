import { useEffect, useRef } from 'react'

export default function GoogleSignIn({ onSuccess, onError, text = 'continue_with' }) {
  const containerRef = useRef(null)

  useEffect(() => {
    const clientId = import.meta.env.GOOGLE_CLIENT_ID
    if (!clientId) return

    function renderButton() {
      if (!window.google || !containerRef.current) return
      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: (response) => {
          if (response.credential) {
            onSuccess(response.credential)
          } else {
            onError?.('Não foi possível autenticar com o Google')
          }
        },
      })
      window.google.accounts.id.renderButton(containerRef.current, {
        type: 'standard',
        shape: 'rectangular',
        size: 'large',
        text,
        width: '100%',
        locale: 'pt-BR',
      })
    }

    if (window.google) {
      renderButton()
    } else {
      const interval = setInterval(() => {
        if (window.google) {
          clearInterval(interval)
          renderButton()
        }
      }, 200)
      return () => clearInterval(interval)
    }
  }, [onSuccess, onError, text])

  const clientId = import.meta.env.GOOGLE_CLIENT_ID
  if (!clientId) return null

  return <div ref={containerRef} className="w-full flex justify-center" />
}
