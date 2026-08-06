import CrudSimples from '../components/CrudSimples.jsx'

export default function Unidade() {
  return (
    <CrudSimples
      table="unidades"
      entityLabel="Unidade"
      codePrefix="UNI"
      fields={[{ key: 'nome', label: 'Nome da Unidade', required: true }]}
    />
  )
}
