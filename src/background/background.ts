import { getSettings, updateSettings, onSettingsChanged } from '../utils/storage'
import { ILogger, Logger } from '../utils/Logger'
import { PredictionRequest, PredictionResponse } from '../utils/messages'
import { Model } from './Model'
import { DEFAULT_TAB_ID, TabIdUrl } from './Queue/QueueBase'
import { QueueWrapper as Queue } from './Queue/QueueWrapper'

declare const tf: typeof import('@tensorflow/tfjs')
declare const nsfwjs: typeof import('nsfwjs')

export type StoreState = {
	settings: { logging: boolean; filterStrictness: number }
	statistics: { totalBlocked: number }
}
export type IReduxedStorage = {
	getState: () => StoreState
	dispatch: (action: { type: string; payload?: any }) => void | Promise<void>
}

console.log('[BG] module executing')

	tf.enableProdMode()
	let attempts = 0
	let queue: Queue | null = null

	const buildTabIdUrl = (tab: chrome.tabs.Tab): TabIdUrl => ({
		tabId: tab?.id ?? DEFAULT_TAB_ID,
		tabUrl: tab?.url ?? `${DEFAULT_TAB_ID}`
	})

	console.log('[BG] registering message listener')

	chrome.runtime.onMessage.addListener((req: PredictionRequest, sender, cb: (r: PredictionResponse) => void) => {
		console.log('[BG] message received, type:', req.type, 'queue ready:', queue !== null)
		if (req.type === 'SIGN_CONNECT') return
			if (queue === null) {
				cb(new PredictionResponse(false, req.url, 'Model not ready'))
				return true
			}
			const tabIdUrl = buildTabIdUrl(sender.tab as chrome.tabs.Tab)
			queue.predict(req.url, tabIdUrl)
			.then(result => cb(new PredictionResponse(result, req.url)))
			.catch(err => cb(new PredictionResponse(false, req.url, err.message)))
			return true
	})

	const load = async (logger: ILogger, store: IReduxedStorage): void => {
		console.log('[BG] loadModel starting, attempt:', attempts)
		try {
			await tf.ready()
		} catch (err) {
			logger.error(err as Error)
			if (++attempts < 5) setTimeout(() => load(logger, store), 200)
				return
		}

		nsfwjs.load(chrome.runtime.getURL('models/'))
		.then(nsfwModel => {
			console.log('[BG] model loaded, setting up queue')
			const { filterStrictness } = store.getState().settings
			const model = new Model(nsfwModel, logger, { filterStrictness })
			queue = new Queue(model, logger, store)

			chrome.tabs.onCreated.addListener(tab => queue!.addTabIdUrl(buildTabIdUrl(tab)))
			chrome.tabs.onRemoved.addListener(tabId => queue!.clearByTabId(tabId))
			chrome.tabs.onUpdated.addListener((_id, info, tab) => {
				if (info.status === 'loading') queue!.updateTabIdUrl(buildTabIdUrl(tab))
			})
		chrome.tabs.onActivated.addListener(({ tabId }) => queue!.setActiveTabId(tabId))

		chrome.runtime.onConnect.addListener(port => port.onDisconnect.addListener(() => {
			getSettings().then(({ logging, strictMode }) => {
				logging ? logger.enable() : logger.disable()
				model.setSettings({ filterStrictness: strictMode ? 80 : 40 })
				queue!.clearCache()
			})
		}))

		onSettingsChanged(({ logging, strictMode }) => {
			logging ? logger.enable() : logger.disable()
			model.setSettings({ filterStrictness: strictMode ? 80 : 40 })
		})
		})
		.catch(err => {
			console.error('[BG] model load failed:', err)
			logger.error(err)
			if (++attempts < 5) setTimeout(() => load(logger, store), 200)
		})
	}

	const init = async (): Promise<void> => {
		console.log('[BG] init called')
		const s = await getSettings()
		let state: StoreState = {
			settings: { logging: s.logging, filterStrictness: s.strictMode ? 80 : 40 },
			statistics: { totalBlocked: s.totalBlocked }
		}
		const store: IReduxedStorage = {
			getState: () => state,
				dispatch: async ({ payload }) => {
				if (payload?.totalBlocked !== undefined) {
					state = { ...state, statistics: { totalBlocked: payload.totalBlocked } }
					await updateSettings({ totalBlocked: payload.totalBlocked })
				}
			}
		}
		const logger = new Logger()
		if (s.logging) logger.enable()
			load(logger, store)
	}

	init()
