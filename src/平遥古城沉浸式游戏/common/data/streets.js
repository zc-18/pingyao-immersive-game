export const streetScenes = [
	{
		id: 'bank-house',
		name: '票号街景',
		title: '票号旧巷',
		subtitle: '青石微亮，账房灯影还停在灰墙深处。',
		playerHint: '先靠近日升昌门前灯影，完成入城第一段故事。',
		entryLabel: '入城主线',
		themeName: '晋商账房',
		showcaseMoments: ['入城欢迎演出', '票号热点讲解'],
		heroPoiId: 'rishengchang',
		defaultPoiId: 'rishengchang',
		nearbyPoiRadius: 90,
		poiIds: ['rishengchang', 'mingqing-street'],
		poiOverrides: {
			rishengchang: { distance: 52, status: 'hot', mapPosition: { x: 44, y: 38, depth: 3 } },
			'mingqing-street': { distance: 118, status: 'route', mapPosition: { x: 57, y: 50, depth: 1 } }
		},
		playerStart: { x: 51, y: 74, bearing: 18, useMockLocation: true },
		recommendedCamera: { distance: 10, polar: 1.1, azimuth: 0.2 },
		ambience: {
			fogDensity: 0.02,
			groundColor: '#9e9e8e',
			keyLight: '#ffd77f',
			accentColor: '#d4a574'
		},
		sceneTone: {
			skyTop: '#d7c0a2',
			skyBottom: '#f6ead7',
			inkColor: 'rgba(72, 53, 40, 0.18)',
			roadGlow: 'rgba(212, 165, 116, 0.28)'
		},
		landmarks: ['日升昌门楼', '账房窗灯', '镖局影壁'],
		targetArrow: { label: '日升昌方向', rotation: -14 },
		buildings: [
			{ id: 'ledger-yard', label: '票号前院', left: '8%', width: '20%', height: '42%', depth: 1, style: 'courtyard', poiId: 'rishengchang' },
			{ id: 'rishengchang', label: '账房门楼', left: '28%', width: '16%', height: '52%', depth: 2, style: 'bank', poiId: 'rishengchang' },
			{ id: 'escort-wall', label: '镖局影壁', left: '60%', width: '14%', height: '46%', depth: 2, style: 'wall' },
			{ id: 'exchange-window', label: '银号铺面', left: '75%', width: '18%', height: '40%', depth: 1, style: 'shop' }
		],
		routePoints: [{ left: '50%', top: '78%' }, { left: '49%', top: '68%' }, { left: '48%', top: '58%' }, { left: '46%', top: '48%' }, { left: '44%', top: '38%' }],
		futureLocationConfig: { triggerRadius: 80, enableGpsBinding: false, coordinateSystem: 'gcj02' }
	},
	{
		id: 'south-avenue',
		name: '县衙街景',
		title: '县衙前街',
		subtitle: '门楼层层后退，官署气象从街心慢慢压来。',
		playerHint: '跟着灯标靠近县衙，完成第二段主线。',
		entryLabel: '规矩与人心',
		themeName: '县衙威仪',
		showcaseMoments: ['县衙前街切场', '堂前讲解'],
		heroPoiId: 'county-office',
		defaultPoiId: 'county-office',
		nearbyPoiRadius: 90,
		poiIds: ['county-office', 'mingqing-street'],
		poiOverrides: {
			'county-office': { distance: 86, status: 'nearby', mapPosition: { x: 58, y: 48, depth: 3 } },
			'mingqing-street': { distance: 132, status: 'route', mapPosition: { x: 44, y: 58, depth: 1 } }
		},
		playerStart: { x: 56, y: 72, bearing: 4, useMockLocation: true },
		recommendedCamera: { distance: 11, polar: 1.05, azimuth: -0.1 },
		ambience: {
			fogDensity: 0.024,
			groundColor: '#a69887',
			keyLight: '#f7d795',
			accentColor: '#c9ae8a'
		},
		sceneTone: {
			skyTop: '#d8c6b0',
			skyBottom: '#f8efe2',
			inkColor: 'rgba(66, 47, 34, 0.16)',
			roadGlow: 'rgba(201, 174, 138, 0.28)'
		},
		landmarks: ['县衙外门', '照壁', '鼓楼视线'],
		targetArrow: { label: '县衙方向', rotation: 6 },
		buildings: [
			{ id: 'ceremonial-wall', label: '照壁', left: '6%', width: '22%', height: '38%', depth: 1, style: 'wall' },
			{ id: 'county-office', label: '县衙外门', left: '32%', width: '18%', height: '58%', depth: 3, style: 'gate', poiId: 'county-office' },
			{ id: 'drum-tower-line', label: '鼓楼视线', left: '56%', width: '13%', height: '48%', depth: 2, style: 'tower' },
			{ id: 'station-front', label: '驿站铺面', left: '73%', width: '18%', height: '38%', depth: 1, style: 'shop' }
		],
		routePoints: [{ left: '54%', top: '76%' }, { left: '55%', top: '66%' }, { left: '56%', top: '56%' }, { left: '57%', top: '46%' }, { left: '58%', top: '36%' }],
		futureLocationConfig: { triggerRadius: 90, enableGpsBinding: false, coordinateSystem: 'gcj02' }
	},
	{
		id: 'academy-lane',
		name: '书院街景',
		title: '书院横巷',
		subtitle: '晨光落在檐角与碑亭之间，气息比主街更静一些。',
		playerHint: '若想听支线故事，可以在这里靠近文庙或醋坊。',
		entryLabel: '静巷支线',
		themeName: '书香静巷',
		showcaseMoments: ['文庙支线', '醋坊旧香'],
		heroPoiId: 'confucius-temple',
		defaultPoiId: 'confucius-temple',
		nearbyPoiRadius: 105,
		poiIds: ['confucius-temple', 'vinegar-workshop', 'city-god-temple'],
		poiOverrides: {
			'confucius-temple': { distance: 96, status: 'discoverable', mapPosition: { x: 42, y: 34, depth: 3 } },
			'vinegar-workshop': { distance: 146, status: 'quest', mapPosition: { x: 67, y: 54, depth: 1 } },
			'city-god-temple': { distance: 220, status: 'discoverable', mapPosition: { x: 22, y: 22, depth: 2 } }
		},
		playerStart: { x: 46, y: 74, bearing: -8, useMockLocation: true },
		recommendedCamera: { distance: 9.5, polar: 1.02, azimuth: 0.1 },
		ambience: {
			fogDensity: 0.018,
			groundColor: '#b4ac98',
			keyLight: '#eedbb0',
			accentColor: '#d4a574'
		},
		sceneTone: {
			skyTop: '#d9ccb8',
			skyBottom: '#fbf4ea',
			inkColor: 'rgba(62, 48, 36, 0.14)',
			roadGlow: 'rgba(212, 165, 116, 0.22)'
		},
		landmarks: ['碑亭', '大成门', '醋坊巷口'],
		targetArrow: { label: '文庙方向', rotation: -8 },
		buildings: [
			{ id: 'stele-pavilion', label: '碑亭', left: '10%', width: '16%', height: '34%', depth: 1, style: 'pavilion' },
			{ id: 'confucius-temple', label: '文庙大成门', left: '30%', width: '22%', height: '56%', depth: 3, style: 'temple', poiId: 'confucius-temple' },
			{ id: 'city-god-temple', label: '城隍庙照壁', left: '50%', width: '14%', height: '40%', depth: 2, style: 'temple', poiId: 'city-god-temple' },
			{ id: 'academy-study', label: '书肆', left: '64%', width: '12%', height: '42%', depth: 2, style: 'shop' },
			{ id: 'vinegar-workshop', label: '醋坊巷口', left: '78%', width: '14%', height: '36%', depth: 1, style: 'craft', poiId: 'vinegar-workshop' }
		],
		routePoints: [{ left: '46%', top: '76%' }, { left: '46%', top: '66%' }, { left: '45%', top: '56%' }, { left: '44%', top: '46%' }, { left: '42%', top: '34%' }],
		futureLocationConfig: { triggerRadius: 100, enableGpsBinding: false, coordinateSystem: 'gcj02' }
	},
	{
		id: 'market-crossing',
		name: '市井街景',
		title: '市集十字口',
		subtitle: '幌子、酒旗与行人影子交叠，是古城里最热闹的一段。',
		playerHint: '靠近明清一条街，再完成一次街铺交互，为第一阶段主线收尾。',
		entryLabel: '烟火收束',
		themeName: '市井烟火',
		showcaseMoments: ['十字口切场', '点亮旅程卷轴'],
		heroPoiId: 'mingqing-street',
		defaultPoiId: 'mingqing-street',
		nearbyPoiRadius: 120,
		poiIds: ['mingqing-street', 'vinegar-workshop', 'county-office'],
		poiOverrides: {
			'mingqing-street': { distance: 72, status: 'route', mapPosition: { x: 52, y: 62, depth: 2 } },
			'vinegar-workshop': { distance: 124, status: 'quest', mapPosition: { x: 34, y: 55, depth: 2 } },
			'county-office': { distance: 154, status: 'discoverable', mapPosition: { x: 66, y: 41, depth: 1 } }
		},
		playerStart: { x: 53, y: 76, bearing: 12, useMockLocation: true },
		recommendedCamera: { distance: 12, polar: 1, azimuth: 0 },
		ambience: {
			fogDensity: 0.022,
			groundColor: '#a99a85',
			keyLight: '#ffd588',
			accentColor: '#c41e3a'
		},
		sceneTone: {
			skyTop: '#d7b998',
			skyBottom: '#faefdd',
			inkColor: 'rgba(74, 52, 34, 0.18)',
			roadGlow: 'rgba(196, 30, 58, 0.14)'
		},
		landmarks: ['主街牌楼', '食肆幌子', '茶铺灯影'],
		targetArrow: { label: '热闹街心', rotation: 12 },
		buildings: [
			{ id: 'food-court', label: '食肆', left: '7%', width: '18%', height: '40%', depth: 1, style: 'food' },
			{ id: 'cloth-store', label: '布庄', left: '25%', width: '16%', height: '46%', depth: 2, style: 'shop' },
			{ id: 'mingqing-street', label: '主街牌楼', left: '42%', width: '20%', height: '54%', depth: 3, style: 'gate', poiId: 'mingqing-street' },
			{ id: 'tea-house', label: '茶铺', left: '67%', width: '12%', height: '42%', depth: 2, style: 'shop', poiId: 'tea-house' },
			{ id: 'vinegar-front', label: '醋坊门脸', left: '80%', width: '12%', height: '36%', depth: 1, style: 'craft', poiId: 'vinegar-workshop' }
		],
		routePoints: [{ left: '52%', top: '78%' }, { left: '52%', top: '68%' }, { left: '53%', top: '58%' }, { left: '53%', top: '48%' }, { left: '52%', top: '38%' }],
		futureLocationConfig: { triggerRadius: 120, enableGpsBinding: false, coordinateSystem: 'gcj02' }
	},
	{
		id: 'lantern-quarter',
		name: '灯影街景',
		title: '灯影长街',
		subtitle: '入夜后红灯连成河，是古城最适合慢走的一段。',
		playerHint: '走到灯影广场拍一张，再回头看城墙。',
		entryLabel: '夜灯打卡',
		themeName: '夜灯古城',
		showcaseMoments: ['灯影广场打卡', '城墙俯瞰'],
		heroPoiId: 'lantern-square',
		defaultPoiId: 'lantern-square',
		nearbyPoiRadius: 110,
		poiIds: ['lantern-square', 'city-wall', 'protection-bureau'],
		poiOverrides: {
			'lantern-square': { distance: 60, status: 'hot', mapPosition: { x: 50, y: 50, depth: 2 } },
			'city-wall': { distance: 250, status: 'route', mapPosition: { x: 18, y: 22, depth: 3 } },
			'protection-bureau': { distance: 130, status: 'discoverable', mapPosition: { x: 70, y: 64, depth: 2 } }
		},
		playerStart: { x: 50, y: 78, bearing: 0, useMockLocation: true },
		recommendedCamera: { distance: 12, polar: 1, azimuth: 0 },
		ambience: {
			fogDensity: 0.026,
			groundColor: '#7a6e58',
			keyLight: '#ffb35a',
			accentColor: '#c41e3a'
		},
		sceneTone: {
			skyTop: '#1a2240',
			skyBottom: '#3d2a4a',
			inkColor: 'rgba(20, 15, 30, 0.32)',
			roadGlow: 'rgba(255, 130, 60, 0.3)'
		},
		landmarks: ['灯影长街', '镖局门面', '城墙剪影'],
		targetArrow: { label: '灯影广场', rotation: 0 },
		buildings: [
			{ id: 'lantern-archway', label: '灯影牌楼', left: '14%', width: '20%', height: '54%', depth: 3, style: 'gate' },
			{ id: 'protection-bureau', label: '同兴公镖局', left: '38%', width: '16%', height: '46%', depth: 2, style: 'shop', poiId: 'protection-bureau' },
			{ id: 'lantern-square', label: '灯影广场', left: '58%', width: '20%', height: '50%', depth: 2, style: 'shop', poiId: 'lantern-square' },
			{ id: 'wall-front', label: '城墙剪影', left: '82%', width: '14%', height: '60%', depth: 3, style: 'wall', poiId: 'city-wall' }
		],
		routePoints: [{ left: '52%', top: '78%' }, { left: '52%', top: '68%' }, { left: '52%', top: '58%' }, { left: '50%', top: '50%' }],
		futureLocationConfig: { triggerRadius: 130, enableGpsBinding: false, coordinateSystem: 'gcj02' }
	}
]

export default streetScenes
