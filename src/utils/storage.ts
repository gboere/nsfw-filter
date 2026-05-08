export type Settings = {
  enabled: boolean
  strictMode: boolean
  totalBlocked: number
  darkTheme: boolean
  logging?: boolean
}

const DEFAULTS: Settings = {
  enabled: true,
  strictMode: false,
  totalBlocked: 0,
  darkTheme: true,
  logging: false,
}

export const getSettings = (): Promise<Settings> =>
  new Promise((resolve, reject) => {
    chrome.storage.local.get(DEFAULTS, items => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError)
        return
      }

      resolve(items as Settings)
    })
  })

export const updateSettings = (
  patch: Partial<Settings>
): Promise<void> =>
  new Promise((resolve, reject) => {
    chrome.storage.local.set(patch, () => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError)
        return
      }

      resolve()
    })
  })

export const onSettingsChanged = (
  cb: (s: Settings) => void
) => {
  chrome.storage.onChanged.addListener((_changes, area) => {
    if (area !== 'local') return
    getSettings().then(cb)
  })
}
