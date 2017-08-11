const config = require('./config.json');

module.exports = function Loot(dispatch) {

    let auto = config.modes.auto || false,
        autotrash = config.modes.trash || false,
        enabled = config.modes.easy || true,
        lootInterval = auto ? setInterval(tryLootAll, 250) : null,
        location;

    let blacklist = config.blacklist.concat(config.motes);
    let trash = config.trash.concat(config.crystals.concat(config.strongboxes));

    let cid = null;
    let loot = {};
    let inventory = null;

    let commands = {
        auto: {
            alias: ['auto', 'autoloot', 'toggle'],
            run: function() {
                auto = !auto;
                message(`Autoloot mode toggled: ${auto}`);
                if(auto){
					lootInterval = setInterval(tryLootAll, 250);
				}
				else
					clearInterval(lootInterval);
            }
        },
        enable: {
            alias: ['enable', 'on'],
            run: function() {
                enabled = true;
                message('Easy looting is enabled.');
            }
        },
        disable: {
            alias: ['disable', 'off'],
            run: function() {
                enabled = false;
                message('Easy looting is disabled.');
            }
        },
        autotrash: {
            alias: ['autotrash', 'trash'],
            run: function() {
                autotrash = !autotrash;

                message('Autotrash toggled: ' + (autotrash ? 'on' : 'off'));
                garbageCollect();
            }
        }
    }

    dispatch.hook('S_LOGIN', 1, event => { ({cid} = event) })

    dispatch.hook('C_CHAT', 1, (event) => {
        if(!event.message.includes('!loot'))
            return;

        let command = event.message.replace(/<\/?[^<>]*>/gi, '').split(' ');

        if(command.length > 1) {
            for(let cmd in commands) {
                if(commands[cmd].alias.indexOf(command[1].toString()) > -1)
                    commands[cmd].run();
            }
        }

        return false;
    });

    dispatch.hook('S_LOAD_TOPO', 1, (event) => {
        loot = {};
    });

    dispatch.hook('C_PLAYER_LOCATION', 1, (event) => {
        location = event;
    });

    dispatch.hook('S_SPAWN_DROPITEM', 1, (event) => {
        if(!(blacklist.indexOf(event.item) > -1)) loot[event.id.toString()] = event;
    }); 

    dispatch.hook('C_TRY_LOOT_DROPITEM', 1, (event) => {
        if(enabled) tryLootAll();      
    });
    
    dispatch.hook('S_DESPAWN_DROPITEM', 1, (event) => {
        if(event.id.toString() in loot) delete loot[event.id.toString()];    
    });


    dispatch.hook('S_SYSTEM_MESSAGE_LOOT_ITEM', 1, event => {
        if(trash.includes(event.item)) {
            garbageCollect();
        }
    });


    function garbageCollect(){
        if(autotrash) {
            dispatch.hook('S_INVEN', 5, event => {
                if(event.first) inventory = []
                else if(!inventory) return

                for(let item of event.items) inventory.push(item)

                if(!event.more) {
                    for(let item of inventory) {
                        if(item.slot < 40) continue // First 40 slots are reserved for equipment, etc.
                        else if(trash.includes(item.item)) deleteItem(item.slot, item.amount)
                    }
                    inventory = null
                }
            })             
        }    
    }


    function deleteItem(slot, amount) {
        dispatch.toServer('C_DEL_ITEM', 1, {
            cid: cid,
            slot: slot - 40,
            amount
        })
    }

    function tryLootAll() {
        for(let item in loot) {
            if(location)
                if(Math.abs(loot[item].x - location.x1) < 120 && Math.abs(loot[item].y - location.y1) < 120)
                    dispatch.toServer('C_TRY_LOOT_DROPITEM', 1, {
                        id: loot[item].id
                    });
        }
    }

    function message(msg) {
        dispatch.toClient('S_CHAT', 1, {
            channel: 24,
            authorID: 0,
            unk1: 0,
            gm: 0,
            unk2: 0,
            authorName: '',
            message: ' (Autoloot) ' + msg
        });
    }

}
