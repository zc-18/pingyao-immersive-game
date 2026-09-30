export const QUEST_STATUS = {
	locked: 'locked',
	available: 'available',
	active: 'active',
	completed: 'completed'
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
		completionLine: '市井烟火已收入行旅册。接下来去书院礼巷，读一读商路之外的文脉。',
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
		id: 'main-academy-lane',
		type: QUEST_TYPE.main,
		title: '一城文脉',
		description: '从市声转入书院礼巷，在文庙的书香与礼制中，读懂晋商重信尚学的来处。',
		introLine: '买卖之外，还有诗书传家。随我去书院礼巷的文庙，把这一页读完。',
		approachLine: '前往书院礼巷，走近文庙，听讲解并查看礼学线索。',
		completionLine: '商道、规矩、烟火与文脉已连成一线。最后去灯影长街，登城望一望来时路。',
		trigger: { type: 'auto', condition: { roleSelected: true } },
		objectives: [
			{ id: 'load-academy', type: 'explore', target: 'academy-lane', targetName: '书院礼巷', current: 0, required: 1, desc: '抵达书院礼巷', storyLine: '前往书院礼巷，开启文脉一章。' },
			{ id: 'visit-confucius', type: 'visit', target: 'confucius-temple', targetName: '文庙', current: 0, required: 1, desc: '到访文庙', storyLine: '走近文庙，檐下书声仍有回响。' },
			{ id: 'talk-confucius', type: 'talk', target: 'npc-owl', poiId: 'confucius-temple', targetName: '晋小鸦', current: 0, required: 1, desc: '听文庙讲解', storyLine: '听晋小鸦讲一段尊师尚学的旧事。' },
			{ id: 'explore-confucius', type: 'explore', target: 'confucius-temple', targetName: '文庙礼学', current: 0, required: 1, desc: '查看文庙线索', storyLine: '查看文庙的礼学线索，将这一城文脉记入册。' }
		],
		rewards: { exp: 160, silver: 80, silverKey: 30, score: 50 },
		roleBonus: commonRoleBonus,
		npcHints: [{ stage: 0, text: '书院礼巷里，生意人的孩子也要从一笔一画读起。去文庙看看。' }, { stage: 1, text: '礼与信从来相通，听完这一段，再看门前的线索。' }],
		sceneId: 'academy-lane',
		prerequisite: 'main-market-crossing'
	},
	{
		id: 'main-lantern-finale',
		type: QUEST_TYPE.main,
		title: '万家灯火',
		description: '从灯影广场走到古城墙，听完守城往事，为五街行旅落下最后一印。',
		introLine: '五街只差最后一程。去灯影长街，在广场留一帧，再到城墙听我说完这座城。',
		approachLine: '前往灯影长街，先探灯影广场，再到古城墙听讲解、寻线索。',
		completionLine: '五街行旅圆满：你读过商道、规矩、烟火与文脉，也见过万家灯火。行旅册已为你留存这一程，城里的支线与日常仍在等你。',
		trigger: { type: 'auto', condition: { roleSelected: true } },
		objectives: [
			{ id: 'load-lantern', type: 'explore', target: 'lantern-quarter', targetName: '灯影长街', current: 0, required: 1, desc: '抵达灯影长街', storyLine: '前往灯影长街，走完最后一程主线。' },
			{ id: 'visit-square', type: 'visit', target: 'lantern-square', targetName: '灯影广场', current: 0, required: 1, desc: '到访灯影广场', storyLine: '靠近灯影广场，看看古城的万家灯火。' },
			{ id: 'explore-square', type: 'explore', target: 'lantern-square', targetName: '灯影广场', current: 0, required: 1, desc: '查看灯影广场线索', storyLine: '查看灯影广场线索，为旅途留下一帧灯影。' },
			{ id: 'visit-finale-wall', type: 'visit', target: 'city-wall', targetName: '古城墙', current: 0, required: 1, desc: '到访古城墙', storyLine: '走到古城墙，在垛口回望来时路。' },
			{ id: 'talk-finale-wall', type: 'talk', target: 'npc-owl', poiId: 'city-wall', targetName: '晋小鸦', current: 0, required: 1, desc: '听古城墙讲解', storyLine: '在古城墙听完守城往事，为五街行旅收束。' },
			{ id: 'explore-finale-wall', type: 'explore', target: 'city-wall', targetName: '古城墙', current: 0, required: 1, desc: '查看城墙线索', storyLine: '查看城墙线索，收下五街行旅的最后一印。' }
		],
		rewards: { exp: 220, silver: 100, silverKey: 50, score: 80 },
		roleBonus: commonRoleBonus,
		npcHints: [{ stage: 0, text: '先在灯影广场收一帧灯火，再到古城墙回望五街。' }, { stage: 1, text: '灯影广场的线索别落下，古城墙还有最后一段守城故事。' }],
		sceneId: 'lantern-quarter',
		prerequisite: 'main-academy-lane'
	},
	{
		id: 'side-vinegar-workshop',
		type: QUEST_TYPE.side,
		title: '醋坊旧香',
		description: '去醋坊闻一闻火候，看古城的手作和买卖如何一起留下味道。',
		introLine: '醋坊那边有另一种古城气味，若你愿意，我带你过去。',
		approachLine: '在市集或书院横巷靠近醋坊热点，听一段手作旧事。',
		completionLine: '这一口酸香也被收进行旅册了。',
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
		id: 'side-study-citygod',
		type: QUEST_TYPE.side,
		title: '城隍问俗',
		description: '研学者的专属一程：走进城隍庙，从砖雕彩塑里读出平遥的民俗信仰与礼制章法。',
		introLine: '你既爱考据，城隍庙的旧规矩最该听。随我去书院横巷那头看看。',
		approachLine: '进入书院横巷，靠近城隍庙照壁，我替你把民俗源流一一道来。',
		completionLine: '砖雕里的章法你都记下了，这一段民俗考据收入行旅册。',
		trigger: { type: 'poi', condition: { roleId: 'study' } },
		objectives: [
			{ id: 'visit-citygod', type: 'visit', target: 'city-god-temple', targetName: '城隍庙', current: 0, required: 1, desc: '前往城隍庙', storyLine: '靠近城隍庙照壁，听一段民俗旧规。' },
			{ id: 'talk-citygod', type: 'talk', target: 'npc-owl', targetName: '晋小鸦', current: 0, required: 1, desc: '听晋小鸦讲城隍信仰', storyLine: '展开对话，把砖雕背后的故事听全。' },
			{ id: 'explore-citygod', type: 'explore', target: 'city-god-temple', targetName: '城隍庙', current: 0, required: 1, desc: '细看城隍庙砖雕', storyLine: '与城隍庙交互，记下这处民俗考据。' }
		],
		rewards: { exp: 150, silver: 50, silverKey: 18, score: 30 },
		roleBonus: commonRoleBonus,
		npcHints: [
			{ stage: 0, text: '城隍庙管的不止平安，更管这一城的来去。我们去殿前看看。' },
			{ stage: 1, text: '你看这砖雕上的章法，礼与俗都刻在里头。' },
			{ stage: 2, text: '考据这一程，你算把平遥的里子也读懂了一层。' }
		],
		sceneId: 'academy-lane',
		prerequisite: 'main-market-crossing'
	},
	{
		id: 'side-treasure-wall',
		type: QUEST_TYPE.side,
		title: '城墙寻匣',
		description: '寻宝人的专属一程：登上城墙马道，在垛口与暗格之间，找出当年守军遗落的旧物线索。',
		introLine: '你这双眼是寻宝的。城墙马道暗格多，跟我去灯影长街那头碰碰运气。',
		approachLine: '到灯影长街，靠近城墙，留意垛口下那些不起眼的砖缝。',
		completionLine: '暗格里的旧物线索被你寻着了，这一程寻宝收入行旅册。',
		trigger: { type: 'poi', condition: { roleId: 'treasure' } },
		objectives: [
			{ id: 'visit-wall', type: 'visit', target: 'city-wall', targetName: '古城墙', current: 0, required: 1, desc: '登上古城墙', storyLine: '靠近城墙，垛口之下别有洞天。' },
			{ id: 'explore-wall', type: 'explore', target: 'city-wall', targetName: '城墙暗格', current: 0, required: 1, desc: '搜寻城墙暗格', storyLine: '与城墙交互，翻出守军遗落的线索。' }
		],
		rewards: { exp: 90, silver: 60, silverKey: 42, score: 30 },
		roleBonus: commonRoleBonus,
		npcHints: [
			{ stage: 0, text: '城墙绕城六公里，藏东西的地方可不少。先登上去。' },
			{ stage: 1, text: '马道暗格最易被忽略，你这眼力该用在这儿。' }
		],
		sceneId: 'lantern-quarter',
		prerequisite: 'main-market-crossing'
	},
	{
		id: 'side-encounter-tea',
		type: QUEST_TYPE.side,
		title: '茶铺偶遇',
		description: '偶遇客的专属一程：在市集十字口的老茶铺坐下，一盏茶的工夫，遇见一段平遥人情。',
		introLine: '你不赶路，最配坐茶铺。市集那头的老茶铺，正好歇脚听故事。',
		approachLine: '到市集十字口，靠近老茶铺，邻座一搭话，缘分就来了。',
		completionLine: '一盏茶喝完，一段偶遇也收进了行旅册。',
		trigger: { type: 'poi', condition: { roleId: 'encounter' } },
		objectives: [
			{ id: 'visit-tea', type: 'visit', target: 'tea-house', targetName: '老茶铺', current: 0, required: 1, desc: '走进老茶铺', storyLine: '靠近茶铺，铜壶煮水声里坐下来。' },
			{ id: 'talk-tea', type: 'talk', target: 'npc-owl', targetName: '晋小鸦', current: 0, required: 1, desc: '在茶铺听一段偶遇', storyLine: '与邻座搭话，听一段不期而遇的故事。' }
		],
		rewards: { exp: 110, silver: 55, silverKey: 22, score: 35 },
		roleBonus: commonRoleBonus,
		npcHints: [
			{ stage: 0, text: '老茶铺最聚人气，坐下便有故事漂过来。' },
			{ stage: 1, text: '你听，这一桌的闲话，比账本还热闹。' }
		],
		sceneId: 'market-crossing',
		prerequisite: 'main-market-crossing'
	},
	{
		id: 'side-checkin-lantern',
		type: QUEST_TYPE.side,
		title: '灯影集印',
		description: '打卡爱好者的专属一程：灯影长街连盖两枚旅印，灯影广场与城墙俯瞰，一气收齐。',
		introLine: '你目标最明确。灯影长街那头有两枚旅印等你，一气盖完最痛快。',
		approachLine: '到灯影长街，先打卡灯影广场，再登城墙补一枚俯瞰章。',
		completionLine: '两枚旅印连盖收齐，灯影这一程在行旅册里亮成一片。',
		trigger: { type: 'poi', condition: { roleId: 'checkin' } },
		objectives: [
			{ id: 'visit-lantern', type: 'visit', target: 'lantern-square', targetName: '灯影广场', current: 0, required: 1, desc: '打卡灯影广场', storyLine: '灯影广场灯连成河，先盖一枚。' },
			{ id: 'visit-wall-checkin', type: 'visit', target: 'city-wall', targetName: '古城墙', current: 0, required: 1, desc: '登城墙补一枚俯瞰章', storyLine: '登上城墙俯瞰全城，再盖一枚。' },
			{ id: 'explore-lantern', type: 'explore', target: 'lantern-square', targetName: '灯影广场', current: 0, required: 1, desc: '在灯影广场定格一帧', storyLine: '与灯影广场交互，定格最亮一帧。' }
		],
		rewards: { exp: 90, silver: 50, silverKey: 20, score: 72 },
		roleBonus: commonRoleBonus,
		npcHints: [
			{ stage: 0, text: '灯影广场是必到的打卡点，等灯全亮，先盖一枚。' },
			{ stage: 1, text: '城墙俯瞰那枚章也别落下，登高一张才算圆满。' },
			{ stage: 2, text: '两枚连盖收齐，你的旅印墙又亮一片。' }
		],
		sceneId: 'lantern-quarter',
		prerequisite: 'main-market-crossing'
	},
	{
		id: 'side-helper-escort',
		type: QUEST_TYPE.side,
		title: '镖局相托',
		description: '帮不忙行的专属一程：到同兴公镖局搭把手，护一程信义，换来一城人的高看。',
		introLine: '你最肯搭手。同兴公镖局正缺人照应，随我去灯影长街那头。',
		approachLine: '到灯影长街，靠近镖局，问一句"可有要帮忙的"，事就来了。',
		completionLine: '镖局这桩委托办妥，"威信"二字也记了你一份人情。',
		trigger: { type: 'poi', condition: { roleId: 'helper' } },
		objectives: [
			{ id: 'visit-escort', type: 'visit', target: 'protection-bureau', targetName: '同兴公镖局', current: 0, required: 1, desc: '前往同兴公镖局', storyLine: '靠近镖局门面，问一句可有要帮忙的。' },
			{ id: 'talk-escort', type: 'talk', target: 'npc-owl', targetName: '晋小鸦', current: 0, required: 1, desc: '听镖局当家说委托', storyLine: '听当家说完委托的来龙去脉。' },
			{ id: 'explore-escort', type: 'explore', target: 'protection-bureau', targetName: '镖局器械架', current: 0, required: 1, desc: '帮镖局清点器械', storyLine: '与镖局交互，把这桩委托办妥。' }
		],
		rewards: { exp: 100, silver: 92, silverKey: 20, score: 30 },
		roleBonus: commonRoleBonus,
		npcHints: [
			{ stage: 0, text: '镖局重情义，肯搭手的人最被高看。先过去。' },
			{ stage: 1, text: '"威信"二字，是一程程黑路换出来的，听他说说。' },
			{ stage: 2, text: '事办妥了，这一城的人情，先记你一份。' }
		],
		sceneId: 'lantern-quarter',
		prerequisite: 'main-market-crossing'
	},
	{
		id: 'daily-walk',
		type: QUEST_TYPE.daily,
		title: '古城漫步',
		description: '今日在古城里多走一段，别让这趟旅程只停在看见。',
		introLine: '今日的步数账本还空着，不如沿街多走几步。',
		approachLine: '保持移动，日常步数会在街景里自动结算。',
		completionLine: '今天的步数账已经记满。',
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
