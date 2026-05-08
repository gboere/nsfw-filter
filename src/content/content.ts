import { getSettings } from '../utils/storage'
import { DOMWatcher } from './DOMWatcher/DOMWatcher'
import { ImageFilter } from './Filter/ImageFilter'

const init = (): void => {
  const imageFilter = new ImageFilter()
  const domWatcher = new DOMWatcher(imageFilter)

  imageFilter.setSettings({ filterEffect: 'blur' })

  getSettings()
    .then(({ enabled }) => { if (enabled) domWatcher.watch() })
    .catch(() => domWatcher.watch())
}

if (window.self === window.top) init()
