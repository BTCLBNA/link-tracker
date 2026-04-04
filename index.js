const express = require('express');
const axios = require('axios');
const { Client, GatewayIntentBits, SlashCommandBuilder, MessageFlags } = require('discord.js');

const app = express();
const client = new Client({ intents: [GatewayIntentBits.Guilds] });

const TOKEN = "MTQ3MjE0MjIzNzk5NDU4NjIyMg.GDkAPC.JlNV9bwU1dlNv7QV9PxE4tJKlzdK8QRb8ttaFY";
const WEBHOOK_URL = "https://discord.com/api/webhooks/1489872813060915210/xPuFyfd0_iUx5Gy8Sg6uEfXOspU_XiFWkys4p0TKP6aNiJOls6aq-BvFQwziQPj2rM1S";
const DOMAIN = "https://YOUR-RENDER-URL.onrender.com";   // ← We will change this later

const trackingLinks = new Map();

app.use(express.json());

// Health check
app.get('/', (req, res) => res.send('✅ Tracker running!'));

// Tracking route
app.get('/track/:id', async (req, res) => {
  const trackId = req.params.id;
  const originalUrl = trackingLinks.get(trackId);

  if (!originalUrl) return res.status(404).send('<h1>Link expired</h1>');

  try {
    await axios.post(WEBHOOK_URL, {
      content: `🔍 Click detected!\nTrack ID: ${trackId}\nTime: ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}\nTo: ${originalUrl}`
    });
  } catch (e) {}

  res.redirect(originalUrl);
});

// Discord Bot
client.once('clientReady', () => {
  console.log(`✅ Bot online → ${client.user.tag}`);
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

  const link = `${DOMAIN}/track/${trackId}`;

  await interaction.editReply({
    content: `**✅ Tracking Link Created!**\n\n**Link:** ${link}\n**Redirects to:** ${url}`
  });
});

client.login(TOKEN);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Web server running on port ${PORT}`));
