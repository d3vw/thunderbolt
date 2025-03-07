import './index.css'

import { JSXElement, onMount } from 'solid-js'

import { createAppDataDir } from './lib/fs'
import { getSetting, setSetting } from './lib/settings'
import { createTray } from './lib/tray'

export default function App({ children }: { children?: JSXElement }) {
  onMount(() => {
    createTray()
    createAppDataDir()

    setSetting('openai_api_key', '1234567890').then(() => {
      getSetting('openai_api_key').then((setting) => {
        console.log(setting)
      })
    })
  })

  return <main class="flex h-screen w-screen">{children}</main>
}
