import { normalizeProps, useMachine } from '@zag-js/solid'
import * as splitter from '@zag-js/splitter'
import { createMemo, createUniqueId } from 'solid-js'
import { Motion } from 'solid-motionone'

import './App.css'

export default function App() {
  const service = useMachine(splitter.machine, {
    id: createUniqueId(),
    orientation: 'horizontal',
    defaultSize: [
      { id: 'a', size: 50, minSize: 10, maxSize: 90 },
      { id: 'b', size: 50, minSize: 10, maxSize: 90 },
    ],
  })

  const api = createMemo(() => splitter.connect(service, normalizeProps))

  const expandLeftPanel = () => {
    api().setToMinSize('b')
  }

  const collapseLeftPanel = () => {
    api().setToMinSize('a')
  }

  return (
    <div class="flex flex-col h-screen bg-gray-100">
      <header class="bg-indigo-600 text-white p-4 shadow-md flex justify-between items-center">
        <h1 class="text-2xl font-bold">Split Pane Demo</h1>
        <div class="flex gap-2">
          <button onClick={expandLeftPanel} class="bg-white text-indigo-600 px-4 py-2 rounded-md hover:bg-indigo-100 transition-colors font-medium">
            Expand Left Panel
          </button>
          <button onClick={collapseLeftPanel} class="bg-white text-indigo-600 px-4 py-2 rounded-md hover:bg-indigo-100 transition-colors font-medium">
            Collapse Left Panel
          </button>
        </div>
      </header>

      <div class="flex flex-row flex-1 overflow-hidden" {...api().getRootProps()}>
        <Motion.div
          animate={{ flex: service.context.get('size')[0].size }}
          transition={{ duration: 1, easing: 'ease-in-out' }}
          class="overflow-auto p-4 bg-white"
          {...api().getPanelProps({ id: 'a' })}
        >
          <div class="h-full rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center">
            <div class="text-center">
              <h2 class="text-xl font-semibold text-gray-700">Left Panel</h2>
              <p class="text-gray-500 mt-2">Content for panel A goes here</p>
            </div>
          </div>
        </Motion.div>

        <div class="w-1.5 bg-gray-200 hover:bg-indigo-400 transition-colors cursor-col-resize flex items-center justify-center" {...api().getResizeTriggerProps({ id: 'a:b' })}>
          <div class="w-0.5 h-8 bg-gray-400"></div>
        </div>

        <Motion.div
          animate={{ flex: service.context.get('size')[1].size }}
          transition={{ duration: 1, easing: 'ease-in-out' }}
          class="overflow-auto p-4 bg-white"
          {...api().getPanelProps({ id: 'b' })}
        >
          <div class="h-full rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center">
            <div class="text-center">
              <h2 class="text-xl font-semibold text-gray-700">Right Panel</h2>
              <p class="text-gray-500 mt-2">Content for panel B goes here</p>
            </div>
          </div>
        </Motion.div>
      </div>
    </div>
  )
}
