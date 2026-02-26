<script setup lang="ts">
const appConfig = useAppConfig()
interface MetingSong {
	name: string
	artist: string
	url: string
	pic: string
}
const audioRef = ref<HTMLAudioElement | null>(null)
const currentIndex = ref(0)
const history = ref<number[]>([])
const isPlaying = ref(false)
const currentTime = ref(0)
const duration = ref(0)
const progress = computed(() => duration.value ? (currentTime.value / duration.value) * 100 : 0)
function formatTime(sec: number) {
	const m = Math.floor(sec / 60)
	const s = Math.floor(sec % 60)
	return `${m}:${s.toString().padStart(2, '0')}`
}
async function fetchPlaylist() {
	const { api, server, type, id } = appConfig.meting || {}
	if (!api || !id)
		return []
	return await $fetch<MetingSong[]>(`${api}?server=${server}&type=${type}&id=${id}`, { timeout: 10000 })
}
const { data: playlist } = useAsyncData('meting-playlist', fetchPlaylist, {
	default: () => [],
	server: false,
	lazy: true,
})
onMounted(() => {
	if (playlist.value?.length)
		currentIndex.value = Math.floor(Math.random() * playlist.value.length)
})
watch(playlist, (list) => {
	if (import.meta.client && list?.length)
		currentIndex.value = Math.floor(Math.random() * list.length)
})
const currentSong = computed(() => playlist.value?.[currentIndex.value])
watch(currentSong, () => {
	currentTime.value = 0
	duration.value = 0
})
function onTimeUpdate() {
	currentTime.value = audioRef.value?.currentTime || 0
}
function onLoadedMetadata() {
	duration.value = audioRef.value?.duration || 0
}
function togglePlay() {
	isPlaying.value ? audioRef.value?.pause() : audioRef.value?.play()
}
function prev() {
	if (history.value.length) {
		currentIndex.value = history.value.pop()!
		nextTick(() => audioRef.value?.play())
	}
}
function next() {
	if (!playlist.value?.length)
		return
	history.value.push(currentIndex.value)
	let newIndex: number
	do {
		newIndex = Math.floor(Math.random() * playlist.value.length)
	} while (newIndex === currentIndex.value && playlist.value.length > 1)
	currentIndex.value = newIndex
	nextTick(() => audioRef.value?.play())
}
function seek(e: MouseEvent) {
	const bar = e.currentTarget as HTMLElement
	const rect = bar.getBoundingClientRect()
	const percent = (e.clientX - rect.left) / rect.width
	if (audioRef.value)
		audioRef.value.currentTime = percent * duration.value
}
</script>

<template>
<BlogWidget title="随心听" class="music-card" :class="{ 'is-playing': isPlaying }">
	<!-- 有歌曲数据时的正常播放器 -->
	<template v-if="currentSong">
		<audio
			ref="audioRef"
			:src="currentSong.url"
			preload="metadata"
			@ended="next"
			@play="isPlaying = true"
			@pause="isPlaying = false"
			@timeupdate="onTimeUpdate"
			@loadedmetadata="onLoadedMetadata"
		/>

		<!-- 信息区 -->
		<div class="track-info">
			<NuxtImg class="cover" :src="currentSong.pic" :alt="currentSong.name" loading="lazy" />
			<div class="info">
				<div class="name">
					{{ currentSong.name }}
				</div>
				<div class="artist">
					{{ currentSong.artist }}
				</div>
			</div>
		</div>

		<!-- 控制区 -->
		<div class="controls">
			<button class="ctrl" title="上一首" @click="prev">
				<Icon name="ph:skip-back-fill" />
			</button>
			<button class="ctrl play-btn" :title="isPlaying ? '暂停' : '播放'" @click="togglePlay">
				<Icon :name="isPlaying ? 'ph:pause-fill' : 'ph:play-fill'" />
			</button>
			<button class="ctrl" title="下一首" @click="next">
				<Icon name="ph:skip-forward-fill" />
			</button>
		</div>

		<!-- 进度区 -->
		<div class="progress-section">
			<div class="progress-bar" @click="seek">
				<div class="progress-fill" :style="{ width: `${progress}%` }" />
			</div>
			<div class="time">
				<span>{{ formatTime(currentTime) }}</span>
				<span>{{ formatTime(duration) }}</span>
			</div>
		</div>
	</template>

	<!-- 无歌曲数据时的占位骨架，用于避免首屏布局跳动 -->
	<template v-else>
		<div class="track-info skeleton">
			<div class="cover skeleton-block" />
			<div class="info">
				<div class="name skeleton-block" />
				<div class="artist skeleton-block" />
			</div>
		</div>

		<div class="controls skeleton">
			<div class="ctrl skeleton-circle" />
			<div class="ctrl play-btn skeleton-circle" />
			<div class="ctrl skeleton-circle" />
		</div>

		<div class="progress-section skeleton">
			<div class="progress-bar">
				<div class="progress-fill skeleton-block" />
			</div>
			<div class="time">
				<span class="skeleton-block skeleton-text" />
				<span class="skeleton-block skeleton-text" />
			</div>
		</div>
	</template>
</BlogWidget>
</template>

<style lang="scss" scoped>
.music-card {
	display: flex;
	flex-direction: column;
	gap: 0.75rem;
	padding: 1rem;
	border-radius: 0.75rem;
	box-shadow: 0 0.1em 0.2em var(--ld-shadow);
	background-color: var(--ld-bg-card);
}
.track-info {
	display: flex;
	align-items: center;
	gap: 0.75rem;
}
.cover {
	width: 52px;
	height: 52px;
	border-radius: 0.5rem;
	object-fit: cover;
	.is-playing & {
		animation: spin 8s linear infinite;
	}
}
@keyframes spin {
	to { transform: rotate(360deg); }
}
.info {
	flex: 1;
	min-width: 0;
}
.name {
	overflow: hidden;
	font-weight: 600;
	white-space: nowrap;
	text-overflow: ellipsis;
	color: var(--c-text-1);
}
.artist {
	overflow: hidden;
	font-size: 0.8em;
	white-space: nowrap;
	text-overflow: ellipsis;
	color: var(--c-text-3);
}
.controls {
	display: flex;
	align-items: center;
	justify-content: center;
	gap: 1rem;
}
.ctrl {
	padding: 0.25rem;
	color: var(--c-text-2);
	transition: color 0.2s, transform 0.2s;
	&:hover {
		color: var(--c-primary);
		transform: scale(1.1);
	}
}
.play-btn {
	display: flex;
	align-items: center;
	justify-content: center;
	width: 1.8rem;
	height: 1.8rem;
	border-radius: 50%;
	background-color: var(--c-primary);
	font-size: 0.9em;
	color: #FFF;
	transition: transform 0.2s, background-color 0.2s;
	&:hover {
		background-color: var(--c-primary-soft);
		transform: scale(1.08);
	}
}
.progress-section {
	display: flex;
	flex-direction: column;
	gap: 0.25rem;
}
.progress-bar {
	overflow: hidden;
	height: 3px;
	border-radius: 1.5px;
	background-color: var(--c-border);
	cursor: pointer;
}
.progress-fill {
	height: 100%;
	border-radius: 1.5px;
	background-color: var(--c-primary);
	transition: width 0.1s linear;
}
.time {
	display: flex;
	justify-content: space-between;
	font-size: 0.7em;
	color: var(--c-text-3);
}
.skeleton {
	animation: skeleton-pulse 1.4s ease-in-out infinite;
}
.skeleton-block {
	display: block;
	border-radius: 0.25rem;
	background-color: var(--c-bg-soft);
}
.skeleton-circle {
	border-radius: 999px;
	background-color: var(--c-bg-soft);
}
.track-info.skeleton .cover {
	width: 52px;
	height: 52px;
}
.track-info.skeleton .name {
	height: 0.9rem;
	margin-bottom: 0.4rem;
}
.track-info.skeleton .artist {
	width: 60%;
	height: 0.7rem;
}
.skeleton-text {
	width: 2.5rem;
	height: 0.7rem;
}
@keyframes skeleton-pulse {
	0% { opacity: 0.6; }
	50% { opacity: 1; }
	100% { opacity: 0.6; }
}
</style>