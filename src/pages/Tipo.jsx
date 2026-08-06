import CrudSimples from '../components/CrudSimples.jsx'

export default function Tipo() {
  return (
    <CrudSimples
      table="tipos"
      entityLabel="Tipo"
      codePrefix="TIPO"
      fields={[{ key: 'nome', label: 'Nome do Tipo', required: true }]}
    />
  )
}
