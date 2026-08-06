import CrudSimples from '../components/CrudSimples.jsx'

export default function Fornecedor() {
  return (
    <CrudSimples
      table="fornecedores"
      entityLabel="Fornecedor"
      codePrefix="FOR"
      fields={[
        { key: 'nome', label: 'Nome do Fornecedor', required: true },
        { key: 'cidade', label: 'Cidade', required: true },
      ]}
    />
  )
}
