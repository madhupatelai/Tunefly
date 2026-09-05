export default async function handler(req, res) {
  const { type = 'song', id = '' } = req.query;

  if (!id) {
    return res.redirect(302, '/');
  }

  let title = 'Listen on Mussifly';
  let artist = 'Mussifly';
  let image = 'https://mussifly.vercel.app/logo.png';
  let description = 'Experience high-fidelity music streaming, AI bass boost, and ad-free playback on Mussifly.';
  let isYouTube = false;
  let videoId = id;

  try {
    if (type === 'song') {
      if (id.startsWith('saavn:')) {
        const saavnId = id.replace('saavn:', '');
        try {
          const apiRes = await fetch(
            `https://www.jiosaavn.com/api.php?__call=song.getDetails&cc=in&_marker=0%3F_marker%3D0&_format=json&pids=${encodeURIComponent(saavnId)}`,
            {
              headers: {
                'User-Agent':
                  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                Referer: 'https://www.jiosaavn.com/',
              },
            }
          );
          if (apiRes.ok) {
            const data = await apiRes.json();
            const songObj = data[saavnId] || data.songs?.[0];
            if (songObj) {
              title = songObj.song || songObj.title || title;
              artist = songObj.primary_artists || songObj.singers || songObj.artist || artist;
              if (songObj.image) {
                image = songObj.image.replace('150x150', '500x500');
              }
              description = `Listen to "${title}" by ${artist} on Mussifly.`;
            }
          }
        } catch (e) {
          console.error('Error fetching Saavn song details:', e);
        }
      } else {
        // YouTube Song
        isYouTube = true;
        videoId = id;
        image = `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
        try {
          const ytRes = await fetch(
            `https://noembed.com/embed?url=https://www.youtube.com/watch?v=${encodeURIComponent(id)}`
          );
          if (ytRes.ok) {
            const ytData = await ytRes.json();
            if (ytData.title) {
              title = ytData.title;
              artist = ytData.author_name || 'YouTube Music';
              description = `Listen to "${title}" on Mussifly. Free HD music player for Android.`;
            }
          }
        } catch (e) {
          console.error('Error fetching YouTube details:', e);
        }
      }
    } else if (type === 'artist') {
      title = `${id} | Mussifly`;
      artist = 'Artist on Mussifly';
      description = `Discover and stream music by ${id} on Mussifly.`;
    } else if (type === 'album') {
      title = `Album | Mussifly`;
      description = `Listen to full album on Mussifly.`;
    } else if (type === 'playlist' || type === 'online_playlist') {
      title = `Playlist | Mussifly`;
      description = `Enjoy curated playlists on Mussifly.`;
    } else if (type === 'profile') {
      title = `User Profile | Mussifly`;
      description = `Check out music profile on Mussifly.`;
    }
  } catch (err) {
    console.error('Share handler error:', err);
  }

  // Sanitize for HTML insertion
  const escapeHtml = (str) =>
    String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');

  const safeTitle = escapeHtml(title);
  const safeArtist = escapeHtml(artist);
  const safeImage = escapeHtml(image);
  const safeDesc = escapeHtml(description);
  const safeUrl = `https://mussifly.vercel.app/${type}/${id}`;
  const apkDownloadUrl = 'https://www.mediafire.com/file/zbt9k2orat1t3xy/Mussifly_v5.0.0.apk/file';

  // Android Deep Link Intent URI
  const androidIntentUrl = `intent://mussifly.vercel.app/${type}/${id}#Intent;scheme=https;package=com.musifly.android;end`;
  const customSchemeUrl = `musifly://${type}/${id}`;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>${safeTitle} - ${safeArtist} | Mussifly</title>
  <meta name="description" content="${safeDesc}">
  <link rel="icon" type="image/png" href="/favicon.png">

  <!-- Open Graph / WhatsApp / Facebook / Telegram / Instagram -->
  <meta property="og:type" content="music.song">
  <meta property="og:site_name" content="Mussifly">
  <meta property="og:url" content="${safeUrl}">
  <meta property="og:title" content="${safeTitle}">
  <meta property="og:description" content="${safeDesc}">
  <meta property="og:image" content="${safeImage}">
  <meta property="og:image:secure_url" content="${safeImage}">
  <meta property="og:image:type" content="image/jpeg">
  <meta property="og:image:width" content="600">
  <meta property="og:image:height" content="600">

  <!-- Twitter Meta Tags -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:site" content="@mussifly">
  <meta name="twitter:title" content="${safeTitle} - ${safeArtist}">
  <meta name="twitter:description" content="${safeDesc}">
  <meta name="twitter:image" content="${safeImage}">

  <!-- App Linking -->
  <meta property="al:android:url" content="${customSchemeUrl}">
  <meta property="al:android:app_name" content="Mussifly">
  <meta property="al:android:package" content="com.musifly.android">

  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, "Helvetica Neue", sans-serif;
    }
    body {
      background-color: #0b0c10;
      color: #ffffff;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      overflow-x: hidden;
      position: relative;
      padding: 24px 16px;
    }
    /* Ambient Background Glow */
    .backdrop-bg {
      position: fixed;
      inset: -50px;
      background-image: url("${safeImage}");
      background-size: cover;
      background-position: center;
      filter: blur(80px) brightness(0.25) saturate(1.8);
      z-index: 0;
      transform: scale(1.1);
      transition: filter 1s ease;
    }
    .card-container {
      position: relative;
      z-index: 10;
      background: rgba(25, 27, 36, 0.75);
      border: 1px solid rgba(255, 255, 255, 0.12);
      backdrop-filter: blur(30px);
      -webkit-backdrop-filter: blur(30px);
      border-radius: 28px;
      padding: 32px 28px;
      max-width: 440px;
      width: 100%;
      box-shadow: 0 30px 60px rgba(0, 0, 0, 0.6), 0 0 40px rgba(255, 75, 120, 0.15);
      text-align: center;
      animation: fadeIn 0.8s cubic-bezier(0.16, 1, 0.3, 1);
    }
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(20px) scale(0.96); }
      to { opacity: 1; transform: translateY(0) scale(1); }
    }
    .logo-badge {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      background: rgba(255, 255, 255, 0.08);
      border: 1px solid rgba(255, 255, 255, 0.1);
      padding: 6px 14px;
      border-radius: 999px;
      margin-bottom: 24px;
      font-size: 13px;
      font-weight: 600;
      letter-spacing: 0.5px;
      color: #ff6b8b;
    }
    .art-wrapper {
      position: relative;
      width: 240px;
      height: 240px;
      margin: 0 auto 24px auto;
      border-radius: 20px;
      overflow: hidden;
      box-shadow: 0 16px 36px rgba(0, 0, 0, 0.5);
    }
    .art-wrapper img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
      transition: transform 0.5s ease;
    }
    .art-wrapper:hover img {
      transform: scale(1.05);
    }
    .song-title {
      font-size: 22px;
      font-weight: 700;
      color: #ffffff;
      line-height: 1.3;
      margin-bottom: 8px;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }
    .song-artist {
      font-size: 15px;
      font-weight: 500;
      color: rgba(255, 255, 255, 0.65);
      margin-bottom: 28px;
      display: -webkit-box;
      -webkit-line-clamp: 1;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }
    .btn-group {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .btn {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 10px;
      padding: 16px 24px;
      border-radius: 16px;
      font-size: 16px;
      font-weight: 700;
      text-decoration: none;
      cursor: pointer;
      transition: all 0.3s ease;
      border: none;
    }
    .btn-primary {
      background: linear-gradient(135deg, #ff4b72 0%, #a83279 100%);
      color: #ffffff;
      box-shadow: 0 10px 25px rgba(255, 75, 114, 0.4);
    }
    .btn-primary:hover {
      transform: translateY(-2px);
      box-shadow: 0 14px 30px rgba(255, 75, 114, 0.55);
    }
    .btn-secondary {
      background: rgba(255, 255, 255, 0.08);
      color: #ffffff;
      border: 1px solid rgba(255, 255, 255, 0.12);
    }
    .btn-secondary:hover {
      background: rgba(255, 255, 255, 0.14);
      transform: translateY(-2px);
    }
    .footer-text {
      margin-top: 20px;
      font-size: 12px;
      color: rgba(255, 255, 255, 0.4);
    }
  </style>
</head>
<body>
  <div class="backdrop-bg"></div>

  <div class="card-container">
    <div class="logo-badge">
      <span>🎵</span>
      <span>MUSSIFLY</span>
    </div>

    <div class="art-wrapper">
      <img src="${safeImage}" alt="${safeTitle}" onerror="this.src='/logo.png'">
    </div>

    <h1 class="song-title">${safeTitle}</h1>
    <p class="song-artist">${safeArtist}</p>

    <div class="btn-group">
      <a href="${androidIntentUrl}" class="btn btn-primary" id="openAppBtn">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
        Play in Mussifly App
      </a>

      <a href="${apkDownloadUrl}" class="btn btn-secondary" target="_blank" rel="noopener">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
        Download Mussifly APK
      </a>
    </div>

    <p class="footer-text">Free • No Audio Ads • Ultra HD Audio</p>
  </div>

  <script>
    // Automatic app launch attempt for Android users
    (function() {
      var isAndroid = /Android/i.test(navigator.userAgent);
      if (isAndroid) {
        // Attempt opening app automatically after 300ms
        setTimeout(function() {
          window.location.href = "${androidIntentUrl}";
        }, 300);
      }
    })();
  </script>
</body>
</html>`;

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=86400');
  return res.status(200).send(html);
}
