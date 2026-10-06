import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { FaChevronDown, FaSearch } from 'react-icons/fa'

// Limite de itens renderizados na lista (a busca continua valendo para todos)
const MAX_RENDER = 200

// Remove acentos e deixa minúsculo para comparar ("Câmera" ~ "camera")
function normalizar(texto) {
  return String(texto ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
}

/**
 * Select com campo de busca.
 *
 * props:
 *  - value: valor selecionado (string ou número)
 *  - onChange(valor: string)
 *  - options: [{ value, label }]
 *  - placeholder: texto quando nada está selecionado
 *  - required: participa da validação nativa do formulário
 *  - variant: 'field' (formulários) ou 'filter' (barra de filtros)
 */
export default function SearchableSelect({
  value,
  onChange,
  options,
  placeholder = 'Selecione...',
  required = false,
  disabled = false,
  variant = 'field',
}) {
  const [open, setOpen] = useState(false)
  const [busca, setBusca] = useState('')
  const [destaque, setDestaque] = useState(0)
  const [pos, setPos] = useState(null)

  const triggerRef = useRef(null)
  const panelRef = useRef(null)
  const searchRef = useRef(null)
  const listRef = useRef(null)

  const selecionado = options.find((o) => String(o.value) === String(value ?? ''))

  const filtradas = useMemo(() => {
    const termos = normalizar(busca).split(/\s+/).filter(Boolean)
    if (termos.length === 0) return options
    return options.filter((o) => {
      const label = normalizar(o.label)
      return termos.every((t) => label.includes(t))
    })
  }, [options, busca])

  const visiveis = filtradas.slice(0, MAX_RENDER)

  function abrir() {
    if (disabled) return
    setBusca('')
    const idx = options.findIndex((o) => String(o.value) === String(value ?? ''))
    setDestaque(idx >= 0 && idx < MAX_RENDER ? idx : 0)
    setOpen(true)
  }

  function fechar() {
    setOpen(false)
    triggerRef.current?.focus()
  }

  function escolher(opcao) {
    onChange(String(opcao.value))
    fechar()
  }

  // Posiciona o painel logo abaixo (ou acima, se não couber) do campo
  useLayoutEffect(() => {
    if (!open) return
    function atualizar() {
      const r = triggerRef.current?.getBoundingClientRect()
      if (!r) return
      const alturaPainel = 320
      const abaixo = window.innerHeight - r.bottom
      const abrirAcima = abaixo < alturaPainel && r.top > abaixo
      setPos({
        left: r.left,
        width: Math.max(r.width, 260),
        top: abrirAcima ? undefined : r.bottom + 4,
        bottom: abrirAcima ? window.innerHeight - r.top + 4 : undefined,
      })
    }
    atualizar()
    window.addEventListener('resize', atualizar)
    window.addEventListener('scroll', atualizar, true)
    return () => {
      window.removeEventListener('resize', atualizar)
      window.removeEventListener('scroll', atualizar, true)
    }
  }, [open])

  // Foca a busca ao abrir e fecha ao clicar fora
  useEffect(() => {
    if (!open) return
    searchRef.current?.focus()
    function cliqueFora(e) {
      if (triggerRef.current?.contains(e.target) || panelRef.current?.contains(e.target)) return
      setOpen(false)
    }
    document.addEventListener('mousedown', cliqueFora)
    return () => document.removeEventListener('mousedown', cliqueFora)
  }, [open])

  // Mantém o item destacado visível ao navegar pelo teclado
  useEffect(() => {
    if (!open) return
    listRef.current?.children[destaque]?.scrollIntoView({ block: 'nearest' })
  }, [destaque, open])

  function onKeyDownBusca(e) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setDestaque((d) => Math.min(d + 1, visiveis.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setDestaque((d) => Math.max(d - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (visiveis[destaque]) escolher(visiveis[destaque])
    } else if (e.key === 'Escape') {
      e.preventDefault()
      fechar()
    } else if (e.key === 'Tab') {
      setOpen(false)
    }
  }

  function onKeyDownTrigger(e) {
    if (['Enter', ' ', 'ArrowDown'].includes(e.key)) {
      e.preventDefault()
      abrir()
    }
  }

  return (
    <div className={`ss ss-${variant}${disabled ? ' ss-disabled' : ''}`}>
      <button
        type="button"
        ref={triggerRef}
        className={`ss-trigger${open ? ' ss-open' : ''}`}
        onClick={() => (open ? setOpen(false) : abrir())}
        onKeyDown={onKeyDownTrigger}
        disabled={disabled}
        title={selecionado?.label || placeholder}
      >
        <span className={selecionado ? 'ss-value' : 'ss-placeholder'}>
          {selecionado ? selecionado.label : placeholder}
        </span>
        <FaChevronDown className="ss-chevron" />
      </button>

      {required && (
        // Input invisível só para a validação nativa do formulário ("preencha este campo")
        <input
          className="ss-required"
          tabIndex={-1}
          aria-hidden="true"
          required
          value={selecionado ? String(value) : ''}
          onChange={() => {}}
          onFocus={abrir}
        />
      )}

      {open && pos && createPortal(
        <div
          ref={panelRef}
          className="ss-panel"
          style={{ left: pos.left, width: pos.width, top: pos.top, bottom: pos.bottom }}
        >
          <div className="ss-search-wrap">
            <FaSearch className="ss-search-icon" />
            <input
              ref={searchRef}
              className="ss-search"
              placeholder="Digite para pesquisar..."
              value={busca}
              onChange={(e) => { setBusca(e.target.value); setDestaque(0) }}
              onKeyDown={onKeyDownBusca}
            />
          </div>
          <ul ref={listRef} className="ss-list" role="listbox">
            {visiveis.length === 0 ? (
              <li className="ss-empty">Nenhum resultado</li>
            ) : (
              visiveis.map((o, i) => (
                <li
                  key={o.value}
                  role="option"
                  aria-selected={String(o.value) === String(value ?? '')}
                  className={
                    'ss-option' +
                    (i === destaque ? ' ss-highlight' : '') +
                    (String(o.value) === String(value ?? '') ? ' ss-selected' : '')
                  }
                  onMouseEnter={() => setDestaque(i)}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => escolher(o)}
                >
                  {o.label}
                </li>
              ))
            )}
          </ul>
          {filtradas.length > MAX_RENDER && (
            <div className="ss-more">
              Mostrando {MAX_RENDER} de {filtradas.length}. Digite para refinar a busca.
            </div>
          )}
        </div>,
        document.body
      )}
    </div>
  )
}
