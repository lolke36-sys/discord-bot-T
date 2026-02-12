require('dotenv').config();
const { Client, GatewayIntentBits, Partials } = require('discord.js');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages
  ],
  partials: [Partials.Message, Partials.Channel, Partials.Reaction]
});

const MAX_PLAYERS = 10;
const CHANNEL_ID = "1471317580076814380";
const ROLE_ID = "1471319309107331236";

let players = [];
let signupMessage = null;
let locked = false;

client.once('clientReady', () => {
  console.log(`Bot is online as ${client.user.tag}`);
  startScheduler();
});

function startScheduler() {
  setInterval(async () => {
    const now = new Date();
    const minutes = now.getMinutes();

    if (minutes === 25) {
      createSignup();
    }

    if (minutes === 43) {
      closeSignup();
    }

  }, 60000);
}

async function createSignup() {
  const channel = await client.channels.fetch(CHANNEL_ID);
  if (!channel) return;

  players = [];
  locked = false;

  signupMessage = await channel.send(
    `<@&${ROLE_ID}>\n\n🎮 **Informal Event Sign-Up**\n\n` +
    `There are **${MAX_PLAYERS} spots available** for this informal session.\n` +
    `React with ✅ to secure your place.\n\n` +
    `Good luck and have fun!\n\n` +
    `**Spots Filled (0/${MAX_PLAYERS})** - 🟢 OPEN\n\nNo players yet.`
  );

  await signupMessage.react("✅");
}

async function closeSignup() {
  if (!signupMessage) return;

  locked = true;

  await signupMessage.reactions.removeAll();

  let list = players
    .map((id, index) => `${index + 1}. <@${id}>`)
    .join("\n");

  if (!list) list = "No participants.";

  await signupMessage.edit(
    `🎮 **Informal Event Sign-Up**\n\n` +
    `Sign-ups are now closed.\n\n` +
    `**Final Participants (${players.length}/${MAX_PLAYERS})** - 🔒 CLOSED\n\n` +
    list
  );
}

client.on('messageReactionAdd', async (reaction, user) => {
  if (user.bot) return;
  if (!signupMessage) return;
  if (reaction.message.id !== signupMessage.id) return;
  if (reaction.emoji.name !== "✅") return;
  if (locked) {
    reaction.users.remove(user.id);
    return;
  }

  if (players.includes(user.id)) return;
  if (players.length >= MAX_PLAYERS) {
    locked = true;
    await signupMessage.reactions.removeAll();
    return;
  }

  players.push(user.id);
  updateMessage();
});

client.on('messageReactionRemove', async (reaction, user) => {
  if (!signupMessage) return;
  if (reaction.message.id !== signupMessage.id) return;
  if (reaction.emoji.name !== "✅") return;

  players = players.filter(id => id !== user.id);
  updateMessage();
});

async function updateMessage() {
  let list = players
    .map((id, index) => `${index + 1}. <@${id}>`)
    .join("\n");

  if (!list) list = "No players yet.";

  const status = locked ? "🔒 CLOSED" : "🟢 OPEN";

  await signupMessage.edit(
    `<@&${ROLE_ID}>\n\n🎮 **Informal Event Sign-Up**\n\n` +
    `There are **${MAX_PLAYERS} spots available** for this informal session.\n` +
    `React with ✅ to secure your place.\n\n` +
    `Good luck and have fun!\n\n` +
    `**Spots Filled (${players.length}/${MAX_PLAYERS})** - ${status}\n\n` +
    list
  );
}

client.login(process.env.TOKEN);
