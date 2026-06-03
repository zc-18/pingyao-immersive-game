export const poiList = [
	{
		id: 'county-office',
		name: '县衙',
		type: 'historic',
		shortName: '衙',
		description: '平遥古城的重要政务场景，适合承载断案、礼制讲解与官衙体验任务。',
		baseStatus: 'nearby',
		distance: 120,
		mapPosition: { x: 30, y: 42 },
		npcTopic: '客官，前头就是县衙。要不要听一段关于断案规制与堂前旧事的讲解？'
	},
	{
		id: 'confucius-temple',
		name: '文庙',
		type: 'culture',
		shortName: '文',
		description: '红墙古柏与泮池相映，适合展开科举文化、礼学故事与研学任务。',
		baseStatus: 'discoverable',
		distance: 260,
		mapPosition: { x: 62, y: 26 },
		npcTopic: '文庙晨钟余韵还在，若你愿意，我带你看看平遥学子的入门之路。'
	},
	{
		id: 'vinegar-workshop',
		name: '醋坊',
		type: 'craft',
		shortName: '醋',
		description: '手作作坊里陈列着缸坛与蒸料器具，适合承接民俗体验与商贸支线。',
		baseStatus: 'quest',
		distance: 310,
		mapPosition: { x: 68, y: 60 },
		npcTopic: '这家醋坊火候正好，我给你讲讲一滴老醋是怎样走上万里商路的。'
	},
	{
		id: 'rishengchang',
		name: '日升昌票号',
		type: 'bank',
		shortName: '票',
		description: '晋商金融传奇的代表建筑，适合展开票号兑换、银钥成长与账房叙事。',
		baseStatus: 'hot',
		distance: 86,
		mapPosition: { x: 48, y: 40 },
		npcTopic: '账房里的算盘声已经响起，想不想进去看看票号如何汇通天下？'
	},
	{
		id: 'mingqing-street',
		name: '明清一条街',
		type: 'street',
		shortName: '市',
		description: '古城最有烟火气的主街，商铺、牌楼与打卡点都汇在这里，是探索路线的重要枢纽。',
		baseStatus: 'route',
		distance: 168,
		mapPosition: { x: 50, y: 54 },
		npcTopic: '明清一条街正热闹着。若想长见识，也想攒点银钥，这里最值得慢慢逛。'
	},
	{
		id: 'city-wall',
		name: '古城墙',
		type: 'historic',
		shortName: '墙',
		description: '青砖夯土的明代古城墙，绕城一周六公里，是俯瞰平遥的最佳视角。',
		baseStatus: 'discoverable',
		distance: 420,
		mapPosition: { x: 12, y: 14 },
		npcTopic: '若想看清古城全貌，登上城墙最合适，垛口之下，全城尽收眼底。'
	},
	{
		id: 'city-god-temple',
		name: '城隍庙',
		type: 'culture',
		shortName: '隍',
		description: '古城精神坐标，砖雕与彩塑保留完整，是研究民俗信仰的好去处。',
		baseStatus: 'discoverable',
		distance: 360,
		mapPosition: { x: 38, y: 24 },
		npcTopic: '城隍爷管的不止平安，更管这一城的来去。我们去殿前听听旧规矩。'
	},
	{
		id: 'shuanglin-monastery',
		name: '双林寺',
		type: 'culture',
		shortName: '寺',
		description: '城外古刹，以彩塑闻名于世，是少有的彩塑艺术博物馆级遗存。',
		baseStatus: 'discoverable',
		distance: 1200,
		mapPosition: { x: 84, y: 78 },
		npcTopic: '双林寺的彩塑能让人发愣。要去得趁清早，光线进殿才好看。'
	},
	{
		id: 'protection-bureau',
		name: '同兴公镖局',
		type: 'historic',
		shortName: '镖',
		description: '清末民初有名的镖局旧址，承载押银走货、商道护卫的江湖故事。',
		baseStatus: 'route',
		distance: 220,
		mapPosition: { x: 56, y: 64 },
		npcTopic: '镖局的"威信"二字，是用一程程黑路换出来的。我说给你听。'
	},
	{
		id: 'zhongtang-courtyard',
		name: '中堂故院',
		type: 'historic',
		shortName: '院',
		description: '晋商大宅院落，砖雕影壁、抄手游廊保留完整，是老宅生活的缩影。',
		baseStatus: 'discoverable',
		distance: 280,
		mapPosition: { x: 22, y: 70 },
		npcTopic: '一进、二进、三进，看着是院落，其实是晋商人家的体面与规矩。'
	},
	{
		id: 'tea-house',
		name: '老茶铺',
		type: 'craft',
		shortName: '茶',
		description: '青花砖灶、铜壶煮水，老茶铺保留了晋中喝茶老规矩，适合慢坐听书。',
		baseStatus: 'route',
		distance: 140,
		mapPosition: { x: 64, y: 56 },
		npcTopic: '坐下来喝一盏，平遥的故事有一半都从茶碗里漂出来。'
	},
	{
		id: 'lantern-square',
		name: '灯影广场',
		type: 'street',
		shortName: '灯',
		description: '夜里灯笼连成河的取景地，是打卡爱好者必到的灯影长街。',
		baseStatus: 'discoverable',
		distance: 95,
		mapPosition: { x: 76, y: 48 },
		npcTopic: '夜里头来，灯笼连成线，正好留一张古城最亮的照片。'
	}
]

export const poiMap = poiList.reduce((map, item) => {
	map[item.id] = item
	return map
}, {})

export default poiList
