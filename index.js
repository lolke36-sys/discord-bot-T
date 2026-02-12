require('dotenv').config();
const { Client, GatewayIntentBits, Partials, EmbedBuilder } = require('discord.js');

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
const GUILD_ID = "1398674713181687929";
const VOICE_CHANNEL_ID = "1463250512601157777";

let players = [];
let signupMessage = null;
let locked = false;
let closeTimestamp = null;
let refreshInterval = null;

client.once('clientReady', () => {
  console.log(`Bot is online as ${client.user.tag}`);
  startScheduler();
});

function startScheduler() {
  setInterval(async () => {
    const now = new Date();
    const minutes = now.getMinutes();

    if (minutes === 25) createSignup();
    if (minutes === 33) sendReminder();
    if (minutes === 43) closeSignup();

  }, 60000);
}

async function sendReminder() {
  const channel = await client.channels.fetch(CHANNEL_ID);
  if (!channel) return;

  channel.send(
    `⏰ <@&${ROLE_ID}> Reminder!\n\n` +
    `Sign-ups close in **10 minutes**.\nReact with ⚔️ to join.`
  );
}

async function createSignup() {
  const channel = await client.channels.fetch(CHANNEL_ID);
  if (!channel) return;

  players = [];
  locked = false;

  const now = new Date();
  closeTimestamp = new Date(now.setMinutes(43, 0, 0)).getTime();

  signupMessage = await channel.send({
    content: `<@&${ROLE_ID}>`,
    embeds: [buildEmbed(false)]
  });

  await signupMessage.react("⚔️");

  startAnimatedRefresh();
}

function startAnimatedRefresh() {
  if (refreshInterval) clearInterval(refreshInterval);

  refreshInterval = setInterval(async () => {
    if (!signupMessage || locked) return;
    await signupMessage.edit({ embeds: [buildEmbed(false)] });
  }, 5000); // refresh every 5 sec
}

async function closeSignup() {
  if (!signupMessage) return;

  locked = true;
  clearInterval(refreshInterval);

  await signupMessage.reactions.removeAll();
  await signupMessage.edit({ embeds: [buildEmbed(true)] });
}

client.on('messageReactionAdd', async (reaction, user) => {
  if (user.bot) return;
  if (!signupMessage) return;
  if (reaction.message.id !== signupMessage.id) return;
  if (reaction.emoji.name !== "⚔️") return;
  if (locked) return reaction.users.remove(user.id);

  if (!players.includes(user.id)) {
    players.push(user.id);
    updateMessage();
  }
});

client.on('messageReactionRemove', async (reaction, user) => {
  if (!signupMessage) return;
  if (reaction.message.id !== signupMessage.id) return;
  if (reaction.emoji.name !== "⚔️") return;

  players = players.filter(id => id !== user.id);
  updateMessage();
});

async function updateMessage() {
  if (!signupMessage) return;
  await signupMessage.edit({ embeds: [buildEmbed(locked)] });
}

function buildEmbed(closed = false) {

  const main = players.slice(0, MAX_PLAYERS);
  const reserve = players.slice(MAX_PLAYERS);

  const mainList = main.length
    ? main.map(id => `⚔️ <@${id}>`).join("\n")
    : "No warriors yet.";

  const reserveList = reserve.length
    ? reserve.map(id => `🛡️ <@${id}>`).join("\n")
    : "No reserves.";

  let color = 0xFFFFFF;
  let title = "⚔️ Informal Event Sign-Up ⚔️";

  if (!closed) {
    const timeLeft = closeTimestamp - Date.now();

    // Animated color + flashing title in final 2 minutes
    if (timeLeft <= 120000) {
      const flash = Math.floor(Date.now() / 1000) % 2 === 0;
      color = flash ? 0xFF0000 : 0xFFFFFF;
      title = flash
        ? "🚨⚔️ FINAL 2 MINUTES ⚔️🚨"
        : "⚔️🚨 FINAL 2 MINUTES 🚨⚔️";
    }

  } else {
    color = 0xFF0000;
    title = "🔒 Sign-Ups Closed";
  }

  const countdown = closed
    ? "Sign-ups closed."
    : `<t:${Math.floor(closeTimestamp / 1000)}:R>`;

  const voiceLink = `https://discord.com/channels/${GUILD_ID}/${VOICE_CHANNEL_ID}`;

  return new EmbedBuilder()
    .setColor(color)
    .setTitle(title)
    .setDescription(
      `**Spots:** ${MAX_PLAYERS}\n` +
      `**Status:** ${closed ? "🔒 CLOSED" : "🟢 OPEN"}\n` +
      `**Closes:** ${countdown}\n\n` +

      `━━━━━━━━━━━━━━━━━━\n\n` +

      `🎙️ **Voice Channel:** [🔫︱𝐈𝐧𝐟𝐨𝐫𝐦𝐚𝐥 𝐕𝐂](${voiceLink})\n\n` +

      `━━━━━━━━━━━━━━━━━━`
    )
    .addFields(
      { name: `⚔️ Main Warriors (${main.length}/${MAX_PLAYERS})`, value: mainList, inline: false },
      { name: `🛡️ Reserve Warriors (${reserve.length})`, value: reserveList, inline: false }
    )
    .setFooter({ text: "React with ⚔️ to join the battle." });
}

client.login(process.env.TOKEN);
