import { getSettings, updateSettings } from '../utils/storage'

const enabled = document.getElementById('enabled') as HTMLInputElement
const strictMode = document.getElementById('strictMode') as HTMLInputElement
const blocked = document.getElementById('blocked')!

const init = async () => {
  const settings = await getSettings()

  enabled.checked = settings.enabled
  strictMode.checked = settings.strictMode
  blocked.textContent = `Blocked: ${settings.totalBlocked}`
}

enabled.addEventListener('change', () => {
  updateSettings({ enabled: enabled.checked })
})

strictMode.addEventListener('change', () => {
  updateSettings({ strictMode: strictMode.checked })
})

init()
