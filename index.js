require('dotenv').config();
const fs = require('fs');
const Discord = require('discord.js');
const { ClashRoyaleAPI } = require('@varandas/clash-royale-api')

const client = new Discord.Client();
const api = new ClashRoyaleAPI(process.env.API_KEY);

const p1 = process.env.PLAYER_ONE;
const p2 = process.env.PLAYER_TWO;

const history = JSON.parse(fs.readFileSync('history.json'));
var ws = 0;
var wins = 0;
var loss = 0;

// Initial ws calculation
for (const battle of history.matches) {
    if (battle.team[0].crowns > battle.opponent[0].crowns) {
        ws++;
        continue;
    }
    break;
}

// Initial W/L calculation
for (const battle of history.matches) {
    if (battle.team[0].crowns > battle.opponent[0].crowns) {
        wins++;
    } else loss++;
}

// Poll API
setInterval(async () => {
    var log = await api.getPlayerBattleLog(p1);
    log = log.filter((battle) => {
        var team = (battle.type === 'casual2v2');
        if (!team) return false;
        var tags = [battle.team[0].tag, battle.team[1].tag];
        var name = (tags.includes(p1) && tags.includes(p2));
        if (!name) return false;
        return true;
    });
    log = log.reverse();
    for (const battle of log) {
        let date = convertDate(battle.battleTime);

        if (history.matches.length === 0) {
            history.matches.unshift(battle);
            update(battle);

            continue;
        }

        let prevDate = convertDate(history.matches[0].battleTime);
        if (prevDate < date) {
            history.matches.unshift(battle);
            update(battle);
        }
    }

    fs.writeFileSync('history.json', JSON.stringify(history));
}, 60000);

const convertDate = (str) => {
    let re = /(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2}).000Z/;
    let m = str.match(re);
    let dtString = `${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}:${m[6]}`;
    return new Date(dtString);
};

const update = (battle) => {
    const win = (battle.team[0].crowns > battle.opponent[0].crowns);
    if (win) {
        ws++;
        wins++;
    }
    if (!win) {
        ws = 0;
        loss++;
    }
    const n1 = battle.team[0].name;
    const n2 = battle.team[1].name;
    const n3 = battle.opponent[0].name;
    const n4 = battle.opponent[1].name;

    const red = 13632027;
    const green = 8311585;
    const message = {
        embed: {
            title: `[${n1} + ${n2}] Vs. [${n3} + ${n4}]`,
            description: `${win ? 'WIN' : 'LOSS'}. Current win streak: ${ws}. W/L is ${wins}/${loss}.`,
            color: win ? green : red,
            fields: []
        }
    };

    client.channels.cache.get(cid).send(message);
};

const cid = '870423804139163690';

client.on('ready', () => {
    client.channels.cache.get(cid).send(`Bot online, current streak: ${ws}. W/L is ${wins}/${loss}.`);
});

client.login(process.env.BOT_TOKEN);