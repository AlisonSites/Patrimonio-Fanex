import { useRef } from 'react'
import { FaCamera, FaUpload } from 'react-icons/fa'

/**
 * Campo de arquivo com duas opções: tirar foto (usa a câmera do
 * dispositivo, em celulares) ou fazer upload de um arquivo já existente.
 *
 * Props:
 * - onChange(file): chamado quando um novo arquivo é selecionado
 * - accept: tipos aceitos no input de upload (ex: 'image/*' ou '.pdf,.png,.jpg')
 * - cameraAccept: tipos aceitos no input da câmera (padrão 'image/*')
 * - allowCamera: mostra ou não o botão "Tirar Foto" (padrão true)
 * - cameraLabel / uploadLabel: textos dos botões
 */
export default function FileCaptureField({
  onChange,
  accept = 'image/*',
  cameraAccept = 'image/*',
  allowCamera = true,
  cameraLabel = 'Tirar Foto',
  uploadLabel = 'Escolher Arquivo',
}) {
  const cameraInputRef = useRef(null)
  const uploadInputRef = useRef(null)

  function handleChange(e) {
    const file = e.target.files?.[0] || null
    onChange(file)
    // Permite selecionar o mesmo arquivo novamente depois, se necessário.
    e.target.value = ''
  }

  return (
    <div className="file-capture-actions">
      {allowCamera && (
        <>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => cameraInputRef.current?.click()}
          >
            <FaCamera /> {cameraLabel}
          </button>
          <input
            ref={cameraInputRef}
            type="file"
            accept={cameraAccept}
            capture="environment"
            onChange={handleChange}
            style={{ display: 'none' }}
          />
        </>
      )}

      <button
        type="button"
        className="btn btn-secondary btn-sm"
        onClick={() => uploadInputRef.current?.click()}
      >
        <FaUpload /> {uploadLabel}
      </button>
      <input
        ref={uploadInputRef}
        type="file"
        accept={accept}
        onChange={handleChange}
        style={{ display: 'none' }}
      />
    </div>
  )
}
