const npcDialogs = [
	{
		id: 'county-office-history',
		sceneTag: '县衙夜话',
		sceneTitle: '县衙旧事',
		sceneSubtitle: '晋小鸦陪你从门楼、仪门一路讲到大堂，把县衙从冷建筑讲成一座会说话的院子。',
		atmosphere: '暖黄灯火落在梁柱和卷册上，像是旧案正被轻轻翻开。',
		badgeText: '夜话导览',
		npcDescription: '当前先以本地对话原型为主，先把陪伴感、节奏感与入口结构做顺，后续再接 AI 问答或任务系统。',
		inputPlaceholder: '这里暂时不是自由输入框，点击发送会走本地回复；后续可接 AI 或任务问答。',
		systemHint: '你想追问的意思我先记下了。等后续接入 AI 或任务系统，这里再承接自由输入。',
		quickTopics: [
			{
				id: 'county-office-purpose',
				label: '县衙是做什么的',
				prompt: '县衙到底是做什么的？',
				reply: '直白些说，它就是把管事、审事、接待和秩序都收进一处院子的地方。你越往里走，越能感到那股庄重。',
				replyMeta: '晋小鸦答'
			},
			{
				id: 'county-office-layout',
				label: '为什么院落这么深',
				prompt: '为什么这座院子要修得这么深？',
				reply: '不是为了显摆大，而是把礼制、办公和起居层层分开。像翻账册一样，越往后越接近真正不能随意示人的内容。',
				replyMeta: '晋小鸦答'
			},
			{
				id: 'county-office-court',
				label: '古人怎么升堂',
				prompt: '古人升堂时，会是什么感觉？',
				reply: '人还没开口，门、鼓、仪仗和站位就先把气氛立住了。那种秩序感，本身就是一场无声的开场。',
				replyMeta: '晋小鸦答'
			}
		],
		quickActions: [
			{
				key: 'continue-story',
				label: '继续听',
				variant: 'primary',
				playerText: '继续讲吧',
				reply: '县衙最有意思的，不只是“古”，而是它把许多人真实的日常与规矩，都收进了一座院子里。',
				replyMeta: '夜话引导',
				intent: 'continue'
			},
			{
				key: 'go-see',
				label: '带我去看看',
				variant: 'secondary',
				playerText: '带我去看看',
				reply: '行，我们先盯住仪门和大堂这条线。当前还是原型阶段，我先给你保留“去看”的入口，不假装已经接通地图实景。',
				replyMeta: '场景引导',
				intent: 'route',
				targetScene: 'county-office-axis'
			},
			{
				key: 'nearby-food',
				label: '附近吃什么',
				variant: 'default',
				playerText: '附近吃什么',
				reply: '要是你想从这一段旧事里缓一缓，附近可以先记住平遥牛肉、碗托和热乎面食。听故事清口，逛街巷落胃。',
				replyMeta: '烟火推荐',
				intent: 'nearby-food'
			}
		],
		shortcutQuestions: [
			{
				id: 'county-office-tone',
				label: '讲得再生活一点',
				playerText: '讲得再生活一点',
				reply: '那我就不端着说了。你把这里想成一座白天办事、夜里还留着回音的老院子，脚步一重，木地板都像记得来来往往的人。',
				replyMeta: '语气调整'
			},
			{
				id: 'county-office-route',
				label: '切到路线引导',
				playerText: '切到路线引导',
				reply: '入口我给你留着，但当前还是原型版，不会假装已经连上实时导航。后续很适合从这里挂地图子包或任务指引。',
				replyMeta: '入口说明'
			},
			{
				id: 'county-office-food',
				label: '推荐周边烟火气',
				playerText: '推荐周边烟火气',
				reply: '想沾点街巷气，就往有热碗托、门口有灯影的小店看。平遥的好，不只在牌匾，也在转角那口热气。',
				replyMeta: '烟火推荐'
			}
		],
		messages: [
			{ id: 'history-npc-1', role: 'npc', text: '你眼前这座县衙，不只是“古建筑”三个字那么简单，它更像一部仍有余温的旧档案。', meta: '夜话第 1 段' },
			{ id: 'history-player-1', role: 'player', text: '听起来很庄重，但我有点怕它太像课本。', meta: '旅人回应' },
			{ id: 'history-npc-2', role: 'npc', text: '那我们就不背书。我陪你把它当成一座会说话的院子来看，门槛、院落、堂前陈设都有自己的秩序。', meta: '夜话第 2 段' }
		]
	},
	{
		id: 'baozheng-case',
		sceneTag: '断案夜话',
		sceneTitle: '公道旧影',
		sceneSubtitle: '不急着讲传奇，只先把大堂上下的人心、规矩和判断讲明白。',
		atmosphere: '书架旁的灯影微微晃动，像有人刚把惊堂木轻轻放下。',
		badgeText: '断案导览',
		npcDescription: '这一组对话先保留戏剧感，但不往神怪传说上走，重点还是晋商文化里的秩序、判断与人情分寸。',
		inputPlaceholder: '当前输入区仅作原型说明，点击发送会追加本地回复，不代表已接入 AI。',
		systemHint: '我先按本地台词陪你聊。等后续接入 AI 或任务系统，这里再承接真正的自由问答。',
		quickTopics: [
			{
				id: 'baozheng-visit',
				label: '包拯真的来过吗',
				prompt: '包拯真的来过平遥吗？',
				reply: '这类问题最容易被讲成传奇。眼下这个原型里，我更愿意把重点放在“县衙断案”这种文化想象本身。',
				replyMeta: '晋小鸦答'
			},
			{
				id: 'baozheng-priority',
				label: '断案最看重什么',
				prompt: '断案最看重什么？',
				reply: '先看证据，再看人口，再看前后说法能不能对上。真到了堂上，最怕的不是吵，而是每个人都只说半截真话。',
				replyMeta: '晋小鸦答'
			},
			{
				id: 'baozheng-story',
				label: '有没有传奇故事',
				prompt: '有没有那种很传奇的断案故事？',
				reply: '当然有，但我不想一开口就把你带进戏文里。先把堂上的规矩听稳了，再听传奇，味道会更足。',
				replyMeta: '晋小鸦答'
			}
		],
		quickActions: [
			{
				key: 'continue-story',
				label: '继续听',
				variant: 'primary',
				playerText: '继续讲吧',
				reply: '真正动人的，不是神探一下就看破，而是有人愿意把乱成一团的事，一层一层理清。晋商讲账清，断案讲理明，骨子里是通的。',
				replyMeta: '夜话引导',
				intent: 'continue'
			},
			{
				key: 'go-see',
				label: '带我去看看',
				variant: 'secondary',
				playerText: '带我去看看',
				reply: '如果切场景，我建议先站到大堂前。当前版本先把入口留在这里，不假装任务链和地图跳转已经打通。',
				replyMeta: '场景引导',
				intent: 'route',
				targetScene: 'courtroom'
			},
			{
				key: 'nearby-food',
				label: '附近吃什么',
				variant: 'default',
				playerText: '附近吃什么',
				reply: '听完这类故事，最适合找家热汤面馆坐一坐。人心安下来，余味才会慢慢出来。',
				replyMeta: '烟火推荐',
				intent: 'nearby-food'
			}
		],
		shortcutQuestions: [
			{
				id: 'baozheng-tone',
				label: '讲得再生活一点',
				playerText: '讲得再生活一点',
				reply: '那我换个说法。你可以把大堂想成一处谁都不敢随便高声说笑的地方，连空气都像在等一句公道话。',
				replyMeta: '语气调整'
			},
			{
				id: 'baozheng-route',
				label: '切到路线引导',
				playerText: '切到路线引导',
				reply: '可以预留入口，但现在还是原型。后面如果接任务系统，这里很适合挂“到大堂听完整段夜话”的触发点。',
				replyMeta: '入口说明'
			},
			{
				id: 'baozheng-food',
				label: '推荐周边烟火气',
				playerText: '推荐周边烟火气',
				reply: '断案听久了，人会绷紧一点。你不如顺着街灯找家面馆或小酒肆，听人声把那股紧劲散掉。',
				replyMeta: '烟火推荐'
			}
		],
		messages: [
			{ id: 'case-npc-1', role: 'npc', text: '人在需要公道的时候，总愿意相信这里会有一盏不偏不倚的灯。', meta: '夜话第 1 段' },
			{ id: 'case-player-1', role: 'player', text: '那断案真的像戏里那么痛快吗？', meta: '旅人回应' },
			{ id: 'case-npc-2', role: 'npc', text: '戏里一句话就能翻盘，现实里却要听、要问、要辨。堂上看证据，堂下看人心。', meta: '夜话第 2 段' }
		]
	},
	{
		id: 'nearby-shops',
		sceneTag: '街巷烟火',
		sceneTitle: '商铺与人情',
		sceneSubtitle: '从故事走回街巷，给你几个带着烟火气的停留点，让夜话自然落到吃喝与逛买里。',
		atmosphere: '铺门半掩，灯笼把街面染成温热的铜色，吆喝声隔着巷口传过来。',
		badgeText: '烟火推荐',
		npcDescription: '这组内容更贴近行旅场景，会把商铺、点心、手作与街头偶遇连在一起，适合作为轻量休闲入口。',
		inputPlaceholder: '这里仍是本地对话原型，点击发送会收到系统预设回复。',
		systemHint: '这会儿我先按街巷夜话陪你聊，等功能完善后，这里再接更自由的问答与路线建议。',
		quickTopics: [
			{
				id: 'shops-food',
				label: '附近有什么好吃的',
				prompt: '附近有什么好吃的？',
				reply: '想垫垫肚子，可以先记住碗托、牛肉和热面。想边走边吃，就找门口有灯火、锅气正旺的小店。',
				replyMeta: '晋小鸦答'
			},
			{
				id: 'shops-gift',
				label: '适合买什么带走',
				prompt: '适合买什么带走？',
				reply: '如果想带一点平遥味道，可以看牛肉、木印章、票号账本一类的东西，既有地方气，也适合做纪念。',
				replyMeta: '晋小鸦答'
			},
			{
				id: 'shops-photo',
				label: '哪里适合拍照',
				prompt: '哪里适合停下来拍照？',
				reply: '牌楼下、老铺门前、灯笼刚亮起来的时候都好看。你若想拍出故事感，不必太赶，等人群稍散更有味道。',
				replyMeta: '晋小鸦答'
			}
		],
		quickActions: [
			{
				key: 'continue-story',
				label: '继续听',
				variant: 'primary',
				playerText: '继续讲吧',
				reply: '古城的烟火气，不在一间铺子里，而在你走着走着，总能遇见一扇愿意把故事和生意都摊开给你看的门。',
				replyMeta: '夜话引导',
				intent: 'continue'
			},
			{
				key: 'go-see',
				label: '带我去看看',
				variant: 'secondary',
				playerText: '带我去看看',
				reply: '好，我们先把目标放在明清一条街。当前还是原型，我先帮你保留入口，不假装已经接上真实路线跳转。',
				replyMeta: '场景引导',
				intent: 'route',
				targetScene: 'street-route'
			},
			{
				key: 'nearby-food',
				label: '推荐热乎的',
				variant: 'default',
				playerText: '推荐点热乎的',
				reply: '夜里最抚人心的还是热面、汤锅和刚出炉的小食。闻着香气走，比看攻略更容易遇到惊喜。',
				replyMeta: '烟火推荐',
				intent: 'nearby-food'
			}
		],
		shortcutQuestions: [
			{
				id: 'shops-tone',
				label: '讲得再随意一点',
				playerText: '讲得再随意一点',
				reply: '那就简单些说吧。想吃，就往最热闹的灯下走；想逛，就挑门脸最有旧味的铺子停一停。',
				replyMeta: '语气调整'
			},
			{
				id: 'shops-route',
				label: '切到路线引导',
				playerText: '切到路线引导',
				reply: '路线入口我先给你留着。后面若接地图和商铺子包，这里会很适合挂“就近逛吃”的指引。',
				replyMeta: '入口说明'
			},
			{
				id: 'shops-food-shortcut',
				label: '只看吃喝推荐',
				playerText: '只看吃喝推荐',
				reply: '那你先记住热面、碗托、牛肉这三样。它们不只是填肚子，也是平遥街头最容易接住人的味道。',
				replyMeta: '烟火推荐'
			}
		],
		messages: [
			{ id: 'shop-npc-1', role: 'npc', text: '街巷真正好看的时候，是灯刚亮、人还没散，商铺把一天的热气都留在门前。', meta: '夜话第 1 段' },
			{ id: 'shop-player-1', role: 'player', text: '那我该先逛还是先吃？', meta: '旅人回应' },
			{ id: 'shop-npc-2', role: 'npc', text: '若你肚子饿，就先找热乎的；若你还想再走一段，就先沿着灯火去看牌楼和老铺。古城最懂顺势。', meta: '夜话第 2 段' }
		]
	}
]

export default npcDialogs
