const express = require('express');
const axios = require('axios');
const { Client, GatewayIntentBits, SlashCommandBuilder, MessageFlags } = require('discord.js');

const app = express();
const client = new Client({ intents: [GatewayIntentBits.Guilds] });

// ================== ENVIRONMENT VARIABLES (Set in Render) ==================
const TOKEN = process.env.TOKEN;
const WEBHOOK_URL = process.env.WEBHOOK_URL;
const DOMAIN = process.env.DOMAIN;
// ========================================================

const trackingLinks = new Map();

app.use(express.json());

// Health Check
app.get('/', (req, res) => {
  res.send('✅ Link Tracker is running!');
});

// Tracking Route
app.get('/track/:id', async (req, res) => {
  const trackId = req.params.id;
  const originalUrl = trackingLinks.get(trackId);

  if (!originalUrl) {
    return res.status(404).send('<h1>Link expired or invalid</h1>');
  }

  try {
    await axios.post(WEBHOOK_URL, {
      content: `🔍 New Click!\nTrack ID: ${trackId}\nTime: ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}\nTo: ${originalUrl}`
    });
  } catch (e) {}

  res.redirect(originalUrl);
});

// Discord Slash Command
client.once('clientReady', () => {
  console.log(`✅ Bot is online → ${client.user.tag}`);
});

client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand() || interaction.commandName !== 'create') return;

  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  const url = interaction.options.getString('url');

  if (!url || !url.startsWith('http')) {
    return interaction.editReply({ content: '❌ URL must start with http:// or https://' });
  }

  const trackId = 't' + Date.now().toString(36);
  trackingLinks.set(trackId, url);

  const trackingLink = `${DOMAIN}/track/${trackId}`;

  await interaction.editReply({
    content: `**✅ Tracking Link Created!**\n\n**Link:** ${trackingLink}\n**Redirects to:** ${url}`
  });
});

client.login(TOKEN);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});
