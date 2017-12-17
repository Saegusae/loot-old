const Command = require('command'),
	config = require('./config.json'),
	blacklist = config.blacklist.concat(config.motes),
	trash = config.trash.concat(config.crystals, config.strongboxes)

module.exports = function Loot(dispatch) {
	const command = Command(dispatch)

	let auto = config.modes.auto || false,
		autotrash = config.modes.trash || false,
		enabled = config.modes.easy || true

	let cid = null,
		playerId = -1,
		location = null,
		inventory = null,
		loot = {},
		lootTimeout = null

	let commands = {
		auto: {
			alias: ['auto', 'autoloot', 'toggle'],
			run: function() {
				auto = !auto
				command.message(`Autoloot mode toggled: ${auto}`)
				if(auto && !lootTimeout) tryLoot()
				else {
					clearTimeout(lootTimeout)
					lootTimeout = null
				}
			}
		},
		enable: {
			alias: ['enable', 'on'],
			run: function() {
				enabled = true
				command.message('Easy looting is enabled.')
			}
		},
		disable: {
			alias: ['disable', 'off'],
			run: function() {
				enabled = false
				command.message('Easy looting is disabled.')
			}
		},
		autotrash: {
			alias: ['autotrash', 'trash'],
			run: function() {
				autotrash = !autotrash

				command.message('Autotrash toggled: ' + (autotrash ? 'on' : 'off'))
				garbageCollect()
			}
		}
	}

	dispatch.hook('S_LOGIN', 1, event => { ({cid, playerId} = event) })

	command.add('loot', c => {
		if(c)
			for(let cmd in commands)
				if(commands[cmd].alias.includes(c))
					commands[cmd].run()
	})

	dispatch.hook('S_LOAD_TOPO', 1, event => {
		location = event
		loot = {}
	})

	dispatch.hook('C_PLAYER_LOCATION', 2, event => { location = event })
	dispatch.hook('S_RETURN_TO_LOBBY', 'raw', () => { loot = {} })

	dispatch.hook('S_SPAWN_DROPITEM', 1, event => {
		if(event.owners.some(owner => owner.id === playerId) && !blacklist.includes(event.item)) {
			loot[event.id.toString()] = Object.assign(event, {priority: 0})

			if(auto && !lootTimeout) tryLoot()
		}
	})

	dispatch.hook('C_TRY_LOOT_DROPITEM', 1, event => {
		if(enabled && !lootTimeout) lootTimeout = setTimeout(tryLoot, config.lootInterval)
	})

	dispatch.hook('S_DESPAWN_DROPITEM', 1, event => {
		delete loot[event.id.toString()]
	})

	/*dispatch.hook('S_SYSTEM_MESSAGE_LOOT_ITEM', 1, event => {
		if(event.message === '@41') return false // Block "That isn't yours." system message.
	})*/

	dispatch.hook('S_INVEN', 10, event => {
		if(autotrash) {
			inventory = inventory ? inventory.concat(event.items) : event.items

			if(!event.more) {
				for(let item of inventory)
					if(item.slot < 40) continue // First 40 slots are reserved for equipment, etc.
					else if(trash.includes(item.dbid)) deleteItem(item.slot, item.amount)

				inventory = null
			}
		}
	})

	function deleteItem(slot, amount) {
		dispatch.toServer('C_DEL_ITEM', 1, {
			cid: cid,
			slot: slot - 40,
			amount
		})
	}

	function tryLoot() {
		clearTimeout(lootTimeout)
		lootTimeout = null

		let lootItems = Object.values(loot).sort((a, b) => a.priority - b.priority)

		if(!lootItems.length) return

		for(let item of lootItems)
			if(dist3D(location, item) < config.lootRadius) {
				dispatch.toServer('C_TRY_LOOT_DROPITEM', 1, { id: item.id })
				item.priority++
				lootTimeout = setTimeout(tryLoot, config.lootInterval)
				return
			}

		if(auto) setTimeout(tryLoot, config.lootScanInterval)
	}
}

function dist3D(loc1, loc2) {
	return Math.sqrt(Math.pow(loc2.x - loc1.x, 2) + Math.pow(loc2.y - loc1.y, 2) + Math.pow(loc2.z - loc1.z, 2))
}