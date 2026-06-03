export const QUEST_STATUS = {
	locked: 'locked',
	available: 'available',
	active: 'active',
	completed: 'completed',
	claimed: 'claimed'
}

export const QUEST_TYPE = {
	main: 'main',
	side: 'side',
	daily: 'daily'
}

const commonRoleBonus = {
	study: { exp: 1.1, desc: '研学者：文化主线奖励提升 10%' },
	treasure: { silverKey: 1.15, desc: '寻宝人：银钥奖励提升 15%' },
	encounter: { random: 1.3, desc: '偶遇客：额外奇遇奖励概率更高' },
	checkin: { score: 1.2, desc: '打卡爱好者：积分奖励提升 20%' },
	helper: { silver: 1.1, desc: '帮不忙行：银两奖励提升 10%' }
}

export const questList = [
	{
		id: 'main-rishengchang',
		type: QUEST_TYPE.main,
		title: '入城第一账',
		description: '晋小鸦带你沿票号旧巷入城，先识日升昌，再懂这座古城为何能汇通天下。',
		introLine: '先随我穿过票号旧巷，城里的第一段故事，就从日升昌开账。',
		approachLine: '沿着金色引线前往日升昌票号，靠近门前灯影便会触发讲解。',
		completionLine: '你已识得票号门道，接下来该去县衙前街，看一看古城秩序如何立住人心。',
		sceneEventBindings: ['poi_entered', 'npc_dialog_completed', 'building_interacted'],
		trigger: {
			type: 'auto',
			condition: { roleSelected: true }
		},
		objectives: [
			{
				id: 'visit-rishengchang',
				type: 'visit',
				target: 'rishengchang',
				targetName: '日升昌票号',
				current: 0,
				required: 1,
				desc: '前往日升昌票号',
				storyLine: '靠近日升昌门前，听晋小鸦开场。'
			},
			{
				id: 'talk-rishengchang',
				type: 'talk',
				target: 'npc-owl',
				targetName: '晋小鸦',
				current: 0,
				required: 1,
				desc: '听晋小鸦讲解票号来历',
				storyLine: '展开对话，听一段关于汇通天下的旧事。'
			},
			{
				id: 'explore-rishengchang',
				type: 'explore',
				target: 'rishengchang',
				targetName: '票号大厅',
				current: 0,
				required: 1,
				desc: '查看票号大厅线索',
				storyLine: '与票号热点交互，完成第一段入城体验。'
			}
		],
		rewards: {
			exp: 100,
			silver: 50,
			silverKey: 20,
			score: 30
		},
		roleBonus: commonRoleBonus,
		npcHints: [
			{ stage: 0, text: '客官，前头就是日升昌。别急着赶路，先把古城的第一笔账看明白。' },
			{ stage: 1, text: '这里的算盘和账册，曾让千里商路变得可信。再近些，我说给你听。' },
			{ stage: 2, text: '看过这间票号，你就明白平遥不是一座静止的古城。' }
		],
		sceneId: 'bank-house',
		prerequisite: null
	},
	{
		id: 'main-county-office',
		type: QUEST_TYPE.main,
		title: '县衙前街',
		description: '票号之外，古城还需要秩序与公信。去县衙前街，听一段关于规矩与人心的旧事。',
		introLine: '账本看过了，接下来去县衙前街。古城的骨架，不只靠生意撑着。',
		approachLine: '切到县衙前街，朝灯标靠近，晋小鸦会在那里等你。',
		completionLine: '你已走过票号与县衙，下一步该进到市井十字口，看古城真正的烟火气。',
		sceneEventBindings: ['scene_loaded', 'poi_entered', 'npc_dialog_completed', 'building_interacted'],
		trigger: {
			type: 'poi',
			condition: { completedQuests: ['main-rishengchang'] }
		},
		objectives: [
			{
				id: 'load-south-avenue',
				type: 'explore',
				target: 'south-avenue',
				targetName: '县衙前街',
				current: 0,
				required: 1,
				desc: '抵达县衙前街',
				storyLine: '切换到县衙前街，进入下一段主线舞台。'
			},
			{
				id: 'visit-county-office',
				type: 'visit',
				target: 'county-office',
				targetName: '县衙',
				current: 0,
				required: 1,
				desc: '靠近县衙讲解点',
				storyLine: '走近县衙，听晋小鸦讲一讲堂前旧事。'
			},
			{
				id: 'talk-county-office',
				type: 'talk',
				target: 'npc-owl',
				targetName: '晋小鸦',
				current: 0,
				required: 1,
				desc: '完成县衙对话',
				storyLine: '完成对话，收下下一段市井线索。'
			}
		],
		rewards: {
			exp: 130,
			silver: 70,
			silverKey: 25,
			score: 40
		},
		roleBonus: commonRoleBonus,
		npcHints: [
			{ stage: 0, text: '前面这条街，比票号更肃静。县衙前街，要看的是古城如何立规矩。' },
			{ stage: 1, text: '走近些，听我说说这座县衙为何能压住一城的人心。' },
			{ stage: 2, text: '规矩与买卖并行，平遥这才像一座活着的城。' }
		],
		sceneId: 'south-avenue',
		prerequisite: 'main-rishengchang'
	},
	{
		id: 'main-market-crossing',
		type: QUEST_TYPE.main,
		title: '十字市声',
		description: '从规整的县衙转入喧闹的市井十字口，古城的温度从这里开始真正贴近你。',
		introLine: '现在去市集十字口，账房和县衙之外，平遥真正的烟火气在那里。',
		approachLine: '抵达市集十字口后，先靠近明清一条街，再完成一次街铺交互。',
		completionLine: '第一阶段主线已经走通，地图、票号兑换处和行旅册都已为你点亮。',
		sceneEventBindings: ['scene_loaded', 'poi_entered', 'building_interacted'],
		trigger: {
			type: 'poi',
			condition: { completedQuests: ['main-county-office'] }
		},
		objectives: [
			{
				id: 'load-market-crossing',
				type: 'explore',
				target: 'market-crossing',
				targetName: '市集十字口',
				current: 0,
				required: 1,
				desc: '抵达市集十字口',
				storyLine: '切到最热闹的街口，准备收束第一阶段主线。'
			},
			{
				id: 'visit-mingqing',
				type: 'visit',
				target: 'mingqing-street',
				targetName: '明清一条街',
				current: 0,
				required: 1,
				desc: '靠近明清一条街热点',
				storyLine: '靠近明清一条街，感受古城最热闹的主街脉搏。'
			},
			{
				id: 'interact-market',
				type: 'explore',
				target: 'mingqing-street',
				targetName: '街铺热点',
				current: 0,
				required: 1,
				desc: '完成一次市井交互',
				storyLine: '和街铺热点交互，为第一阶段主线收尾。'
			}
		],
		rewards: {
			exp: 160,
			silver: 90,
			silverKey: 35,
			score: 60
		},
		roleBonus: commonRoleBonus,
		npcHints: [
			{ stage: 0, text: '热闹的街口就在前面。走完这段路，你就算真正进了平遥。' },
			{ stage: 1, text: '明清一条街最会留住人。看灯、看铺子，也看人情。' },
			{ stage: 2, text: '好，第一程走完了。接下来的地图、兑换和行旅册，都是为你这趟旅程服务。' }
		],
		sceneId: 'market-crossing',
		prerequisite: 'main-county-office'
	},
	{
		id: 'side-confucius-temple',
		type: QUEST_TYPE.side,
		title: '书院横巷',
		description: '从主线烟火中抽身，去书院横巷与文庙看看另一种安静的平遥。',
		introLine: '若想暂离主街，不妨转入书院横巷，听一段更安静的故事。',
		approachLine: '进入书院横巷后，靠近文庙热点即可触发讲解。',
		completionLine: '你在安静处也留下了足迹，文脉的线索已被收入行旅册。',
		sceneEventBindings: ['scene_loaded', 'poi_entered'],
		trigger: {
			type: 'level',
			condition: { level: 2 }
		},
		objectives: [
			{ id: 'load-academy-lane', type: 'explore', target: 'academy-lane', targetName: '书院横巷', current: 0, required: 1, desc: '抵达书院横巷', storyLine: '切到书院横巷，放慢一点脚步。' },
			{ id: 'visit-temple', type: 'visit', target: 'confucius-temple', targetName: '文庙', current: 0, required: 1, desc: '前往文庙', storyLine: '靠近文庙热点，听晋小鸦讲讲城里的书香。' }
		],
		rewards: { exp: 80, silver: 40, silverKey: 15, score: 25 },
		roleBonus: commonRoleBonus,
		npcHints: [{ stage: 0, text: '文庙那边清静些，适合慢慢听故事。' }],
		sceneId: 'academy-lane',
		prerequisite: null
	},
	{
		id: 'side-vinegar-workshop',
		type: QUEST_TYPE.side,
		title: '醋坊旧香',
		description: '去醋坊闻一闻火候，看古城的手作和买卖如何一起留下味道。',
		introLine: '醋坊那边有另一种古城气味，若你愿意，我带你过去。',
		approachLine: '在市集或书院横巷靠近醋坊热点，听一段手作旧事。',
		completionLine: '这一口酸香也被收进行旅册了。',
		sceneEventBindings: ['poi_entered', 'npc_dialog_completed'],
		trigger: {
			type: 'poi',
			condition: { nearPoi: 'vinegar-workshop' }
		},
		objectives: [
			{ id: 'visit-workshop', type: 'visit', target: 'vinegar-workshop', targetName: '醋坊', current: 0, required: 1, desc: '前往醋坊', storyLine: '走近醋坊，闻闻这座城的手作气味。' },
			{ id: 'talk-workshop', type: 'talk', target: 'npc-owl', targetName: '晋小鸦', current: 0, required: 1, desc: '完成醋坊讲解', storyLine: '听完讲解，这条支线就算收住。' }
		],
		rewards: { exp: 60, silver: 30, silverKey: 12, score: 20 },
		roleBonus: commonRoleBonus,
		npcHints: [{ stage: 0, text: '这家醋坊火候正好，离近些，我慢慢讲。' }],
		sceneId: 'academy-lane',
		prerequisite: null
	},
	{
		id: 'daily-walk',
		type: QUEST_TYPE.daily,
		title: '古城漫步',
		description: '今日在古城里多走一段，别让这趟旅程只停在看见。',
		introLine: '今日的步数账本还空着，不如沿街多走几步。',
		approachLine: '保持移动，日常步数会在街景里自动结算。',
		completionLine: '今天的步数账已经记满。',
		sceneEventBindings: ['scene_loaded'],
		trigger: {
			type: 'auto',
			condition: { daily: true }
		},
		objectives: [
			{ id: 'walk-steps', type: 'collect', target: 'steps', targetName: '步数', current: 0, required: 1000, desc: '走满 1000 步', storyLine: '让今日步数继续累积。' }
		],
		rewards: { exp: 30, silver: 15, silverKey: 8, score: 10 },
		roleBonus: commonRoleBonus,
		npcHints: [{ stage: 0, text: '今天的步数还没记满，继续走走吧。' }],
		sceneId: 'bank-house',
		prerequisite: null,
		resetDaily: true
	}
]

export const questMap = questList.reduce((map, quest) => {
	map[quest.id] = quest
	return map
}, {})

export default questList
