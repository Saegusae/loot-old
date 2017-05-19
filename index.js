module.exports = function Loot(dispatch) {

    let auto = true,
        enabled = true,
        lootInterval = setInterval(tryLootAll,1000),
        location;

    let loot = {};

    let commands = {
        auto: {
            alias: ['auto', 'autoloot', 'toggle'],
            run: function() {
                auto = !auto;
                message(`Autoloot mode toggled: ${auto}`);
                if(auto){
					lootInterval = setInterval(tryLootAll,1000)
				}
				else
					clearInterval(lootInterval)
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
        }
    }

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
        loot[event.id.toString()] = event;
    });

    dispatch.hook('C_TRY_LOOT_DROPITEM', 1, (event) => {
        if(enabled) tryLootAll();      
    });
    
    dispatch.hook('S_DESPAWN_DROPITEM', 1, (event) => {
        if(event.id.toString() in loot) delete loot[event.id.toString()];    
    });

    function tryLootAll() {
        for(let item in loot) {
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
            message: ' (autoloot) ' + msg
        });
    }

}
