<template>
	<section class="journey-chapters" :class="{ 'journey-chapters--complete': journey.mainComplete }" aria-label="五街行旅章节">
		<div class="journey-chapters__heading">
			<div>
				<span class="journey-chapters__eyebrow">平遥 · 五街行旅</span>
				<h2>{{ journey.mainComplete ? '一城故事，已收入行囊' : '循着故事，走遍五街' }}</h2>
			</div>
			<strong class="journey-chapters__count">{{ journey.mainCompleted }}<small> / {{ journey.mainTotal }} 章</small></strong>
		</div>
		<p>{{ journey.mainComplete ? '商道、规矩、烟火、文脉与灯火，组成了你的平遥记忆。还可继续角色支线、每日漫步，或重访喜欢的街巷。' : '到访、听讲、寻线索，每一章都由你的脚步点亮。点击章节可前往相应街巷。' }}</p>
		<div class="journey-chapters__list">
			<button v-for="chapter in journey.chapters" :key="chapter.id" type="button"
				class="journey-chapters__chapter" :class="{ 'journey-chapters__chapter--done': chapter.completed }"
				:aria-label="`${chapter.title}，${chapter.completed ? '已完成，可重访' : chapter.available ? '待完成' : '故事待解锁，可游览'}，前往街巷`"
				@click="$emit('visit', chapter.sceneId)">
				<img :src="`/static/img/3d/culture/${chapter.sceneId}.webp`" alt="" loading="lazy" />
				<span class="journey-chapters__number">{{ ['壹', '贰', '叁', '肆', '伍'][chapter.index] }}</span>
				<span class="journey-chapters__name">{{ chapter.title }}</span>
				<span class="journey-chapters__state">{{ chapter.completed ? '已入册 · 重访' : chapter.available ? '循线前往 →' : '可游览 · 故事待解锁' }}</span>
			</button>
		</div>
		<div class="journey-chapters__footer"><span>{{ journey.mainComplete ? '五街圆满' : '主线行旅' }}</span><span>当前身份支线 {{ journey.sideCompleted }} / {{ journey.sideTotal }}</span></div>
	</section>
</template>

<script setup>
defineProps({ journey: { type: Object, required: true } })
defineEmits(['visit'])
</script>

<style scoped lang="scss">
.journey-chapters {
	grid-column: 1 / -1; min-width: 0; padding: 22px; margin: 18px 0;
	border: 1px solid rgba($py-bronze, .23); border-radius: 3px;
	background: rgba($py-paper, .86); color: #513c2c;
	&__heading { display: flex; justify-content: space-between; align-items: center; gap: 12px; }
	&__eyebrow { font-size: 11px; letter-spacing: .18em; color: #8b6345; }
	h2 { font-size: 22px; margin: 8px 0; font-weight: 500; }
	p { font-size: 13px; line-height: 1.8; margin: 4px 0 16px; max-width: 780px; }
	&__count { font-size: 32px; white-space: nowrap; color: #8b4513; }
	&__count small { font-size: 12px; font-weight: 400; }
	&__list { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 12px; }
	&__chapter { position: relative; min-width: 0; text-align: left; overflow: hidden; cursor: pointer; padding: 0 0 12px; border: 1px solid #c8b599; border-radius: 3px; color: inherit; background: #f5ede0; transition: transform .18s ease, box-shadow .18s ease; }
	&__chapter:focus-visible { outline: 3px solid #8b4513; outline-offset: 3px; }
	&__chapter:hover { transform: translateY(-3px); box-shadow: 0 6px 16px #513c2c22; }
	&__chapter img { display: block; width: 100%; aspect-ratio: 1.2; object-fit: cover; }
	&__chapter--done { border-color: #9d5037; }
	&__number { position: absolute; top: 8px; left: 8px; display: grid; place-items: center; width: 28px; height: 28px; color: #fff3df; background: #6b3f28; font-size: 15px; }
	&__chapter--done &__number { background: #a73130; }
	&__name, &__state { display: block; padding: 0 10px; }
	&__name { margin-top: 10px; font-size: 16px; }
	&__state { margin-top: 6px; font-size: 11px; line-height: 1.5; color: #8b6345; }
	&__footer { display: flex; justify-content: space-between; gap: 10px; margin-top: 16px; font-size: 12px; color: #8b6345; }
	&--complete &__footer { color: #a73130; }
	&--complete { background: linear-gradient(100deg, #f5f0e8 35%, #f5f0e8e8), url('/static/img/3d/culture/journey.webp') right center / cover; }
}
@media (max-width: 700px) {
	.journey-chapters { padding: 14px; h2 { font-size: 18px; } &__list { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; } &__chapter:last-child { grid-column: 1 / -1; display: grid; grid-template-columns: 42% 1fr; padding-bottom: 0; align-items: center; } &__chapter:last-child img { grid-row: 1 / 3; } &__chapter:last-child .journey-chapters__state { align-self: start; } }
}
@media (prefers-reduced-motion: reduce) { .journey-chapters__chapter { transition: none; transform: none; } }
</style>
