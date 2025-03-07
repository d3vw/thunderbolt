import { ArrowLeft } from 'lucide-solid'
import { createSignal } from 'solid-js'
import { Button } from './components/button'
import { Select } from './components/select'
import { Sidebar } from './components/sidebar'
import { A } from '@solidjs/router'

export default function Settings() {
  const [selectedValue, setSelectedValue] = createSignal<string | undefined>(undefined)

  const handleChange = (value: string) => {
    console.log('value', value)
    setSelectedValue(value)
  }

  return (
    <>
      <Sidebar>
        <Button as={A} href="/" variant="outline">
          <ArrowLeft class="size-4" />
          Home
        </Button>
      </Sidebar>
      <Select
        value={selectedValue()}
        onChange={setSelectedValue}
        variant="outline"
        options={[
          { value: 'react', label: 'React' },
          { value: 'solid', label: 'Solid' },
          { value: 'vue', label: 'Vue' },
        ]}
      />
      <Select
        value={selectedValue()}
        onChange={setSelectedValue}
        variant="default"
        options={[
          { value: 'react', label: 'React' },
          { value: 'solid', label: 'Solid' },
          { value: 'vue', label: 'Vue' },
        ]}
      />
    </>
  )
}
