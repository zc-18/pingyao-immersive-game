<template>
	<view class="check-in-card">
		<view class="check-in-card__head">
			<text class="check-in-card__eyebrow">— 每 日 行 旅 印 章 —</text>
			<text class="check-in-card__streak">连续 {{ preview.nextStreak }} 日</text>
		</view>

		<view class="check-in-card__row">
			<view
				v-for="(item, idx) in preview.rewardTable"
				:key="idx"
				class="check-in-card__cell"
				:class="{
					'check-in-card__cell--filled': isFilled(idx),
					'check-in-card__cell--current': idx === preview.nextSlotIndex && !preview.alreadyCheckedIn,
					'check-in-card__cell--milestone': item.stamp
				}"
			>
				<view class="check-in-card__cell-num">第 {{ idx + 1 }} 日</view>
				<view class="check-in-card__cell-stamp">
					<text>{{ item.stamp ? '印' : '钥' }}</text>
				</view>
				<view class="check-in-card__cell-rewards">
					<text class="check-in-card__cell-reward">+{{ item.silverKey }} 钥</text>
					<text class="check-in-card__cell-reward check-in-card__cell-reward--silver">+{{ item.silver }} 两</text>
				</view>
				<text class="check-in-card__cell-tag">{{ item.label }}</text>
			</view>
		</view>

		<view
			class="check-in-card__btn"
			:class="{ 'check-in-card__btn--done': preview.alreadyCheckedIn }"
			@tap="handleClaim"
		>
			<text>{{ preview.alreadyCheckedIn ? '今 日 已 签 ·  明 日 再 来' : '盖 章 · 收 取 当 日 奖 励' }}</text>
		</view>

		<text class="check-in-card__hint">{{ hintText }}</text>
	</view>
</template>

<script setup>
import { computed, ref } from 'vue'
import { claimDailyCheckIn, getCheckInPreview } from '@/common/utils/check-in.js'
import { syncAchievementUnlocks } from '@/common/utils/achievements.js'

const emit = defineEmits(['claimed'])

const preview = ref(getCheckInPreview())
const lastClaimResult = ref(null)

const hintText = computed(() => {
	if (lastClaimResult.value?.ok) {
		const r = lastClaimResult.value.reward
		return `已记入：银钥 +${r.silverKey} · 银两 +${r.silver} · 经验 +${r.exp}`
	}
	if (preview.value.alreadyCheckedIn) {
		return '今日的章已盖。明天来续 +' + preview.value.nextReward.silverKey + ' 银钥。'
	}
	return '盖印后会同步至行旅册，连签到第 5 日额外送印章。'
})

function isFilled(idx) {
	const streak = preview.value.state.streak
	if (preview.value.alreadyCheckedIn) {
		return idx <= ((streak - 1) % preview.value.rewardTable.length)
	}
	return idx < ((streak) % preview.value.rewardTable.length)
}

function handleClaim() {
	if (preview.value.alreadyCheckedIn) {
		uni.showToast({ title: '今日已签到', icon: 'none' })
		return
	}
	const result = claimDailyCheckIn()
	if (!result.ok) uni.showToast({ title: result.reason === 'storage' ? '保存失败，请重试' : '今日已签到', icon: 'none' })
	if (result.ok) {
		lastClaimResult.value = result
		preview.value = getCheckInPreview()
		const sync = syncAchievementUnlocks()
		emit('claimed', { ...result, newAchievements: sync.newlyUnlocked })
		uni.showToast({
			title: `+${result.reward.silverKey} 银钥`,
			icon: 'none',
			duration: 1500
		})
	}
}

defineExpose({
	refresh() {
		preview.value = getCheckInPreview()
	}
})
</script>

<style lang="scss" scoped>
@import '@/uni.scss';

.check-in-card {
	position: relative;
	padding: 22rpx 24rpx 24rpx;
	background:
		linear-gradient(180deg, rgba(255, 252, 245, 0.94) 0%, rgba(243, 233, 215, 0.92) 100%);
	border: 2rpx solid rgba(196, 30, 58, 0.32);
	border-radius: 8rpx;
	box-shadow:
		inset 0 1rpx 0 rgba(255, 248, 239, 0.45),
		0 8rpx 22rpx rgba(0, 0, 0, 0.28);
}

.check-in-card__head {
	display: flex;
	align-items: center;
	justify-content: space-between;
	margin-bottom: 14rpx;
}

.check-in-card__eyebrow {
	font-size: 18rpx;
	letter-spacing: 8rpx;
	color: $py-red;
	font-family: 'KaiTi', 'STKaiti', 'Noto Serif SC', serif;
	font-weight: 700;
}

.check-in-card__streak {
	font-size: 18rpx;
	color: rgba(110, 85, 65, 0.88);
	font-family: 'KaiTi', 'STKaiti', 'Noto Serif SC', serif;
	letter-spacing: 2rpx;
}

.check-in-card__row {
	display: grid;
	grid-template-columns: repeat(7, 1fr);
	gap: 8rpx;
	margin-bottom: 16rpx;
}

.check-in-card__cell {
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: flex-start;
	padding: 10rpx 4rpx 8rpx;
	background: rgba(255, 248, 239, 0.7);
	border: 1rpx solid rgba(110, 85, 65, 0.25);
	border-radius: 6rpx;
	gap: 4rpx;
	transition: transform 0.2s ease;
}

.check-in-card__cell--filled {
	background: rgba(196, 30, 58, 0.1);
	border-color: $py-red;
}

.check-in-card__cell--current {
	background: rgba(255, 215, 100, 0.18);
	border-color: $py-bronze;
	box-shadow: 0 0 14rpx rgba(255, 215, 100, 0.55);
	animation: cellPulse 1.6s ease-in-out infinite;
}

@keyframes cellPulse {
	0%, 100% { transform: translateY(0); }
	50%      { transform: translateY(-2rpx); }
}

.check-in-card__cell--milestone .check-in-card__cell-stamp {
	background: $py-red;
	color: $py-paper-warm;
	transform: rotate(-6deg);
}

.check-in-card__cell-num {
	font-size: 14rpx;
	color: rgba(110, 85, 65, 0.78);
	letter-spacing: 1rpx;
}

.check-in-card__cell-stamp {
	width: 34rpx;
	height: 34rpx;
	display: flex;
	align-items: center;
	justify-content: center;
	background: rgba(196, 30, 58, 0.12);
	color: $py-red;
	border: 2rpx solid $py-red;
	border-radius: 5rpx;
	font-size: 18rpx;
	font-weight: 700;
	font-family: 'KaiTi', 'STKaiti', 'Noto Serif SC', serif;
	transform: rotate(-3deg);
}

.check-in-card__cell--filled .check-in-card__cell-stamp {
	background: $py-red;
	color: $py-paper-warm;
}

.check-in-card__cell-rewards {
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 1rpx;
	margin-top: 2rpx;
}

.check-in-card__cell-reward {
	font-size: 13rpx;
	color: $py-red;
	font-weight: 700;
	letter-spacing: 1rpx;
}

.check-in-card__cell-reward--silver {
	color: rgba(110, 85, 65, 0.78);
	font-weight: 400;
}

.check-in-card__cell-tag {
	font-size: 12rpx;
	color: rgba(110, 85, 65, 0.6);
	letter-spacing: 1rpx;
	font-family: 'KaiTi', 'STKaiti', 'Noto Serif SC', serif;
}

.check-in-card__btn {
	display: flex;
	align-items: center;
	justify-content: center;
	height: 76rpx;
	border-radius: 8rpx;
	background:
		linear-gradient(135deg, $py-red 0%, #8b1a2e 50%, $py-red 100%);
	color: $py-paper-warm;
	font-size: 24rpx;
	font-weight: 700;
	letter-spacing: 6rpx;
	font-family: 'KaiTi', 'STKaiti', 'Noto Serif SC', serif;
	box-shadow:
		inset 0 1rpx 0 rgba(255, 220, 220, 0.45),
		0 6rpx 14rpx rgba(196, 30, 58, 0.42);
	transition: transform 0.18s ease;
	text-shadow: 0 1rpx 2rpx rgba(0, 0, 0, 0.6);
}

.check-in-card__btn:active {
	transform: scale(0.97);
}

.check-in-card__btn--done {
	background: linear-gradient(135deg, #6b3510 0%, $py-bronze 50%, #4a2a18 100%);
	color: rgba(255, 248, 239, 0.85);
	pointer-events: auto;
}

.check-in-card__hint {
	display: block;
	margin-top: 10rpx;
	font-size: 18rpx;
	line-height: 1.65;
	color: rgba(110, 85, 65, 0.78);
	font-family: 'KaiTi', 'STKaiti', 'Noto Serif SC', serif;
	letter-spacing: 1rpx;
}
</style>
