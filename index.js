module.exports = function Loot(dispatch) {

    let auto = false,
        location;

    let loot = {};

    let commands = {
        loot: {
            alias: ['all', 'loot', 'drop', 'drops'],
            run: function() {
                message('Trying to loot all items in 150 range');
                tryLootAll();
            }
        },
        auto: {
            alias: ['auto', 'autoloot', 'toggle'],
            run: function() {
                auto = !auto;
                message(`Autoloot mode toggled: ${auto}`);
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

        if(auto) {
            tryLootAll();
        }
    });
    
    dispatch.hook('S_DESPAWN_DROPITEM', 1, (event) => {
        if(event.id.toString() in loot)
            delete loot[event.id.toString()];
    });

    function tryLootAll() {
        for(let item in loot) {
            if(Math.abs(loot[item].x - location.x2) < 150 && Math.abs(loot[item].y - location.y2) < 150)
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