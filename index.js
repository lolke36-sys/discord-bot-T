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
const CHANNEL_ID = "1462581253524947049";

let players = [];
let signupMessage = null;
let locked = false;

client.once('clientReady', () => {
  console.log(`Bot is online as ${client.user.tag}`);
  startHourlySignup();
});

function startHourlySignup() {
  setInterval(async () => {
    const now = new Date();
    if (now.getMinutes() === 25) {
      createSignup();
    }
  }, 60000);
}

async function createSignup() {
  const channel = await client.channels.fetch(CHANNEL_ID);
  if (!channel) return;

  // Delete old signup if it exists
  if (signupMessage) {
    try {
      await signupMessage.delete();
    } catch (err) {
      console.log("Old message already deleted.");
    }
  }

  players = [];
  locked = false;

  signupMessage = await channel.send(
    `🎮 **Event Signup (0/${MAX_PLAYERS})** - 🟢 OPEN\n\nNo players yet.`
  );

  await signupMessage.react("✅");
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

  players.push(user.id);
  updateMessage();

  if (players.length >= MAX_PLAYERS) {
    locked = true;
    await signupMessage.reactions.removeAll();
    updateMessage();
  }
});

client.on('messageReactionRemove', async (reaction, user) => {
  if (!signupMessage) return;
  if (reaction.message.id !== signupMessage.id) return;
  if (reaction.emoji.name !== "✅") return;

  players = players.filter(id => id !== user.id);

  if (locked && players.length < MAX_PLAYERS) {
    locked = false;
    await signupMessage.react("✅");
  }

  updateMessage();
});

async function updateMessage() {
  let list = players
    .map((id, index) => `${index + 1}. <@${id}>`)
    .join("\n");

  if (!list) list = "No players yet.";

  const status = locked ? "🔒 FULL" : "🟢 OPEN";

  await signupMessage.edit(
    `🎮 **Event Signup (${players.length}/${MAX_PLAYERS})** - ${status}\n\n${list}`
  );
}

client.login(process.env.TOKEN);
