/**
 * Configuration loader for Svaryx website
 * Loads the configuration from config.json and applies it to the website
 */

class SiteConfigManager {
  constructor() {
    this.config = null;
    this.loaded = false;
  }

  /**
   * Load the configuration from the JSON file
   * @returns {Promise} Promise that resolves when configuration is loaded
   */
  async loadConfig() {
    try {
      const response = await fetch('/config.json');
      if (!response.ok) {
        throw new Error(`Failed to load configuration: ${response.status}`);
      }

      this.config = await response.json();
      this.loaded = true;

      // Apply theme colors from config
      this.applyTheme();

      return this.config;
    } catch (error) {
      console.error('Error loading configuration:', error);
      throw error;
    }
  }

  /**
   * Apply the theme colors from the configuration
   */
  applyTheme() {
    if (!this.loaded || !this.config.theme) return;

    const root = document.documentElement;
    const colors = this.config.theme.colors;

    // Apply CSS variables for colors
    for (const [key, value] of Object.entries(colors)) {
      root.style.setProperty(`--${key}-color`, value);
    }

    // Apply fonts
    if (this.config.theme.fonts) {
      root.style.setProperty('--main-font', this.config.theme.fonts.main);
      root.style.setProperty('--headings-font', this.config.theme.fonts.headings);
    }

    // Apply metadata
    if (this.config.site) {
      document.title = this.config.site.title;

      // Update meta tags
      const metaDescription = document.querySelector('meta[name="description"]');
      if (metaDescription) {
        metaDescription.content = this.config.site.description;
      }

      // Update Open Graph tags
      const ogTitle = document.querySelector('meta[property="og:title"]');
      const ogDescription = document.querySelector('meta[property="og:description"]');

      if (ogTitle) ogTitle.content = this.config.site.title;
      if (ogDescription) ogDescription.content = this.config.site.description;
    }
  }

  /**
   * Apply SEO settings from configuration
   */
  applySeoSettings() {
    if (!this.loaded || !this.config.seo) return;

    const seo = this.config.seo;

    // Set page title
    if (seo.title) {
      document.title = seo.title;
    }

    // Update meta tags
    this.updateMetaTag('description', seo.description);
    this.updateMetaTag('keywords', seo.keywords);

    // Update canonical URL
    const canonicalLink = document.querySelector('link[rel="canonical"]');
    if (canonicalLink && seo.canonicalUrl) {
      canonicalLink.href = seo.canonicalUrl;
    }

    // Update Open Graph tags
    if (seo.openGraph) {
      this.updateMetaTag('og:title', seo.openGraph.title, 'property');
      this.updateMetaTag('og:description', seo.openGraph.description, 'property');
      this.updateMetaTag('og:url', seo.openGraph.url, 'property');
      this.updateMetaTag('og:image', seo.openGraph.image, 'property');
      this.updateMetaTag('og:image:alt', seo.openGraph.imageAlt, 'property');
      this.updateMetaTag('og:site_name', seo.openGraph.siteName, 'property');
    }

    // Update Twitter Card tags
    if (seo.twitter) {
      this.updateMetaTag('twitter:card', seo.twitter.card, 'name');
      this.updateMetaTag('twitter:title', seo.twitter.title, 'name');
      this.updateMetaTag('twitter:description', seo.twitter.description, 'name');
      this.updateMetaTag('twitter:image', seo.twitter.image, 'name');
      this.updateMetaTag('twitter:creator', seo.twitter.creator, 'name');
    }

    // Update structured data
    this.updateStructuredData();
  }

  /**
   * Helper method to update meta tags
   * @param {string} name The name or property of the meta tag
   * @param {string} content The content value
   * @param {string} attribute The attribute type ('name' or 'property')
   */
  updateMetaTag(name, content, attribute = 'name') {
    if (!content) return;

    const metaTag = document.querySelector(`meta[${attribute}="${name}"]`);
    if (metaTag) {
      metaTag.setAttribute('content', content);
    }
  }

  /**
   * Update structured data JSON-LD
   */
  updateStructuredData() {
    if (!this.loaded || !this.config.seo || !this.config.seo.structuredData) return;

    const sd = this.config.seo.structuredData;

    // Update music album schema
    if (sd.musicAlbum) {
      const albumSchema = document.getElementById('schema-music-album');
      if (albumSchema) {
        // Get existing schema data
        let schemaData;
        try {
          schemaData = JSON.parse(albumSchema.textContent);
        } catch (e) {
          schemaData = {
            "@context": "https://schema.org",
            "@type": "MusicAlbum"
          };
        }

        // Update with config data
        schemaData.name = sd.musicAlbum.name;
        schemaData.alternateName = sd.musicAlbum.alternateName;
        schemaData.image = sd.musicAlbum.image;
        schemaData.datePublished = sd.musicAlbum.datePublished;

        if (sd.musicAlbum.artist) {
          schemaData.byArtist = {
            "@type": "MusicGroup",
            "name": sd.musicAlbum.artist.name,
            "url": sd.musicAlbum.artist.url
          };
        }

        if (sd.musicAlbum.genre) {
          schemaData.genre = sd.musicAlbum.genre;
        }

        if (sd.musicAlbum.aggregateRating) {
          schemaData.aggregateRating = {
            "@type": "AggregateRating",
            "ratingValue": sd.musicAlbum.aggregateRating.ratingValue,
            "bestRating": sd.musicAlbum.aggregateRating.bestRating,
            "worstRating": sd.musicAlbum.aggregateRating.worstRating,
            "ratingCount": sd.musicAlbum.aggregateRating.ratingCount
          };
        }

        // Update tracks from main config
        if (this.config.tracks) {
          schemaData.numTracks = this.config.tracks.length.toString();
          schemaData.track = this.config.tracks.map(track => {
            const trackObj = {
              "@type": "MusicRecording",
              "name": track.title,
              "duration": this.formatDuration(track.duration)
            };

            if (track.links && track.links.spotify) {
              trackObj.url = track.links.spotify;
            }

            return trackObj;
          });
        }

        // Update schema content
        albumSchema.textContent = JSON.stringify(schemaData, null, 2);
      }
    }
  }

  /**
   * Format duration from MM:SS to ISO 8601 format (PTMMSS)
   * @param {string} duration Duration in format MM:SS
   * @returns {string} ISO 8601 formatted duration
   */
  formatDuration(duration) {
    if (!duration) return '';

    const parts = duration.split(':');
    if (parts.length === 2) {
      return `PT${parts[0]}M${parts[1]}S`;
    }
    return duration;
  }

  /**
   * Render album information based on the configuration
   */
  renderAlbum() {
    if (!this.loaded || !this.config.album) return;

    // Update album header
    const albumTitle = document.querySelector('.cover-meta h1');
    const albumSubtitle = document.querySelector('.cover-meta h2');
    const albumCover = document.querySelector('.album-cover-small');
    const releaseDate = document.querySelector('.release-date');

    if (albumTitle) albumTitle.textContent = this.config.album.title;
    if (albumSubtitle) albumSubtitle.textContent = this.config.album.subtitle;
    if (albumCover) albumCover.src = this.config.album.coverImage;
    if (releaseDate && this.config.album.releaseDate) {
      releaseDate.textContent = `Released: ${this.config.album.releaseDate}`;
    }

    // Update album header background
    const headerContainer = document.querySelector('.album-header-container');
    if (headerContainer && this.config.album.coverImage) {
      headerContainer.style.backgroundImage = `url('${this.config.album.coverImage}')`;

      // Also update the pseudo-element background via CSS variable
      document.documentElement.style.setProperty('--album-cover-image', `url('${this.config.album.coverImage}')`);
    }
  }

  /**
   * Render music platform links based on the configuration
   */
  renderMusicPlatforms() {
    if (!this.loaded || !this.config.musicPlatforms) return;

    const platformsContainer = document.getElementById('music-platforms-container');
    if (!platformsContainer) return;

    // Clear existing content
    platformsContainer.innerHTML = '';

    // Create platform buttons
    this.config.musicPlatforms.forEach(platform => {
      const platformLink = document.createElement('a');
      platformLink.className = 'get-album-button';

      if (platform.available && platform.url) {
        platformLink.href = platform.url;
        platformLink.target = '_blank';
        platformLink.rel = 'noopener noreferrer';
      } else {
        platformLink.onclick = () => notAvailableMessage(platform.name);
      }

      // Create platform icon
      const icon = document.createElement('img');
      icon.src = platform.icon;
      icon.alt = platform.name;
      icon.width = 25;
      icon.height = 25;

      // Create platform name
      const name = document.createElement('p');
      name.className = 'text-three-dots';
      name.textContent = platform.name;

      // Append elements to link
      platformLink.appendChild(icon);
      platformLink.appendChild(name);
      platformsContainer.appendChild(platformLink);
    });
  }

  /**
   * Render tracklist based on the configuration
   */
  renderTracklist() {
    if (!this.loaded || !this.config.tracks) return;

    const tracklistContainer = document.getElementById('tracklist-container');
    if (!tracklistContainer) return;

    // Create table
    const table = document.createElement('table');

    // Create table header
    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    headerRow.className = 'tracklist-listing';

    const headers = ['Track no.', 'Title', 'Duration', 'Listen'];
    headers.forEach(header => {
      const th = document.createElement('th');
      th.textContent = header;
      headerRow.appendChild(th);
    });

    thead.appendChild(headerRow);
    table.appendChild(thead);

    // Create table body
    const tbody = document.createElement('tbody');

    this.config.tracks.forEach(track => {
      const row = document.createElement('tr');
      row.className = 'tracklist-listing';

      // Track number
      const numberCell = document.createElement('td');
      numberCell.textContent = track.number;
      row.appendChild(numberCell);

      // Track title
      const titleCell = document.createElement('td');
      titleCell.textContent = track.title;
      row.appendChild(titleCell);

      // Track duration
      const durationCell = document.createElement('td');
      durationCell.textContent = track.duration;
      row.appendChild(durationCell);

      // Track links
      const linksCell = document.createElement('td');
      linksCell.className = 'track-links';

      // Add platform links if available
      if (track.links) {
        if (track.links.youtube) {
          const ytLink = this.createPlatformLink(track.links.youtube, '/img/youtube-icon.svg', 'YouTube');
          linksCell.appendChild(ytLink);
        }

        if (track.links.spotify) {
          const spotifyLink = this.createPlatformLink(track.links.spotify, '/img/spotify-icon.svg', 'Spotify');
          linksCell.appendChild(spotifyLink);
        }

        if (track.links.soundcloud) {
          const scLink = this.createPlatformLink(track.links.soundcloud, '/img/soundcloud-icon.svg', 'SoundCloud');
          linksCell.appendChild(scLink);
        }
      }

      row.appendChild(linksCell);
      tbody.appendChild(row);
    });

    table.appendChild(tbody);
    tracklistContainer.appendChild(table);
  }

  /**
   * Create a platform link element
   * @param {string} url The URL to link to
   * @param {string} iconSrc The source path for the icon
   * @param {string} platform The platform name
   * @returns {HTMLAnchorElement} The created link element
   */
  createPlatformLink(url, iconSrc, platform) {
    const link = document.createElement('a');
    link.href = url;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.title = `Listen on ${platform}`;

    const icon = document.createElement('img');
    icon.src = iconSrc;
    icon.alt = platform;
    icon.width = 25;
    icon.height = 25;

    link.appendChild(icon);
    return link;
  }

  /**
   * Set up the media embed based on the configuration
   */
  setupMediaEmbed() {
    if (!this.loaded || !this.config.mediaEmbed) return;

    const embedContainer = document.getElementById('media-embed-container');
    if (!embedContainer) return;

    let embedUrl = this.config.mediaEmbed.youtube;

    // Add parameters for autoplay and mute if specified
    if (this.config.mediaEmbed.autoplay) {
      embedUrl += embedUrl.includes('?') ? '&autoplay=1' : '?autoplay=1';
    }

    if (this.config.mediaEmbed.mute) {
      embedUrl += embedUrl.includes('?') ? '&mute=1' : '?mute=1';
    }

    // Create iframe element
    const iframe = document.createElement('iframe');
    iframe.src = embedUrl;
    iframe.title = 'YouTube video player';
    iframe.frameBorder = '0';
    iframe.style.width = '100%';
    iframe.style.height = '100%';
    iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
    iframe.referrerPolicy = 'strict-origin-when-cross-origin';
    iframe.allowFullscreen = true;

    embedContainer.appendChild(iframe);
  }

  /**
   * Set up audio features based on configuration
   */
  setupAudioFeatures() {
    if (!this.loaded || !this.config.features) return;

    // Handle audio visualizer visibility
    const visualizerSection = document.querySelector('.visualizer-section');
    if (!visualizerSection) return;

    // Check if audio visualizer is enabled
    if (this.config.features.audioVisualizer && this.config.features.audio?.enabled) {
      visualizerSection.classList.add('active');

      const audioElement = document.getElementById('background-audio');
      if (!audioElement) return;

      // Configure audio source
      if (this.config.features.audio.source) {
        // Set audio source
        const sourceElement = audioElement.querySelector('source');
        if (sourceElement) {
          sourceElement.src = this.config.features.audio.source;

          // If the file is OGG, set the correct MIME type
          if (this.config.features.audio.source.toLowerCase().endsWith('.ogg')) {
            sourceElement.type = 'audio/ogg';
          } else if (this.config.features.audio.source.toLowerCase().endsWith('.mp3')) {
            sourceElement.type = 'audio/mpeg';
          }

          audioElement.load(); // Reload audio element with new source
        }

        // Set audio title if provided
        if (this.config.features.audio.title) {
          audioElement.setAttribute('title', this.config.features.audio.title);

          // Add title display
          const existingTitle = visualizerSection.querySelector('.audio-title');
          if (!existingTitle) {
            const titleElement = document.createElement('div');
            titleElement.className = 'audio-title';
            titleElement.textContent = `Now Playing: ${this.config.features.audio.title}`;

            // Insert before the custom player
            const customPlayer = visualizerSection.querySelector('.custom-audio-player');
            if (customPlayer) {
              visualizerSection.insertBefore(titleElement, customPlayer);
            }
          }
        }

        // Initialize the custom audio player
        this.initializeCustomAudioPlayer(audioElement);

        // Initialize enhanced visualizer
        this.initializeEnhancedVisualizer();

        // Handle autoplay if configured
        if (this.config.features.audio.autoplay) {
          try {
            // Attempt to play (may be restricted by browser policies)
            audioElement.play().catch(e => {
              console.warn('Autoplay prevented:', e);
            });
          } catch (error) {
            console.warn('Autoplay failed:', error);
          }
        }
      }
    } else {
      // If audio is disabled, hide the section
      visualizerSection.classList.remove('active');

      const audioElement = document.getElementById('background-audio');
      if (audioElement) {
        audioElement.style.display = 'none';
      }
    }
  }

  /**
   * Initialize the custom audio player
   * @param {HTMLAudioElement} audioElement The audio element to control
   */
  initializeCustomAudioPlayer(audioElement) {
    const playPauseButton = document.getElementById('play-pause-button');
    const muteButton = document.getElementById('mute-button');
    const progressBarContainer = document.querySelector('.progress-bar-container');
    const progressBarFill = document.querySelector('.progress-bar-fill');
    const seekBall = document.querySelector('.seek-ball');
    const currentTimeDisplay = document.querySelector('.current-time');
    const durationDisplay = document.querySelector('.duration');
    const volumeSliderContainer = document.querySelector('.volume-slider-container');
    const volumeLevel = document.querySelector('.volume-level');

    if (!playPauseButton || !progressBarContainer || !progressBarFill) {
      console.warn('Custom audio player elements not found');
      return;
    }

    // Hide the default controls since we're using custom controls
    audioElement.controls = false;

    // Format time in MM:SS format
    const formatTime = (seconds) => {
      const mins = Math.floor(seconds / 60);
      const secs = Math.floor(seconds % 60);
      return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
    };

    // Initial setup
    durationDisplay.textContent = '0:00';

    // Handle play/pause button
    playPauseButton.addEventListener('click', () => {
      if (audioElement.paused) {
        audioElement.play().catch(e => console.warn('Play failed:', e));
      } else {
        audioElement.pause();
      }
    });

    // Update button appearance on play/pause
    audioElement.addEventListener('play', () => {
      playPauseButton.querySelector('.play-icon').style.display = 'none';
      playPauseButton.querySelector('.pause-icon').style.display = 'block';
      playPauseButton.setAttribute('aria-label', 'Pause');
    });

    audioElement.addEventListener('pause', () => {
      playPauseButton.querySelector('.play-icon').style.display = 'block';
      playPauseButton.querySelector('.pause-icon').style.display = 'none';
      playPauseButton.setAttribute('aria-label', 'Play');
    });

    // Handle seeking
    progressBarContainer.addEventListener('click', (e) => {
      const rect = progressBarContainer.getBoundingClientRect();
      const pos = (e.clientX - rect.left) / rect.width;
      audioElement.currentTime = pos * audioElement.duration;
    });

    // Handle volume control
    if (muteButton && volumeSliderContainer && volumeLevel) {
      // Initialize volume display
      volumeLevel.style.width = `${audioElement.volume * 100}%`;

      // Handle mute button
      muteButton.addEventListener('click', () => {
        audioElement.muted = !audioElement.muted;
        updateMuteButton();
      });

      // Update mute button appearance
      const updateMuteButton = () => {
        const volumeIcon = muteButton.querySelector('.volume-icon');
        const muteIcon = muteButton.querySelector('.mute-icon');

        if (audioElement.muted) {
          volumeIcon.style.display = 'none';
          muteIcon.style.display = 'block';
          muteButton.setAttribute('aria-label', 'Unmute');
          volumeLevel.style.width = '0%';
        } else {
          volumeIcon.style.display = 'block';
          muteIcon.style.display = 'none';
          muteButton.setAttribute('aria-label', 'Mute');
          volumeLevel.style.width = `${audioElement.volume * 100}%`;
        }
      };

      // Handle volume slider
      volumeSliderContainer.addEventListener('click', (e) => {
        const rect = volumeSliderContainer.getBoundingClientRect();
        const pos = (e.clientX - rect.left) / rect.width;
        audioElement.volume = Math.max(0, Math.min(1, pos));
        audioElement.muted = false;
        volumeLevel.style.width = `${audioElement.volume * 100}%`;
        updateMuteButton();
      });
    }

    // Update progress as audio plays
    audioElement.addEventListener('timeupdate', () => {
      if (!isNaN(audioElement.duration)) {
        const progress = audioElement.currentTime / audioElement.duration;
        progressBarFill.style.width = `${progress * 100}%`;
        currentTimeDisplay.textContent = formatTime(audioElement.currentTime);

        // Update seek ball position
        if (seekBall) {
          seekBall.style.left = `${progress * 100}%`;
        }
      }
    });

    // Set duration when metadata is loaded
    audioElement.addEventListener('loadedmetadata', () => {
      durationDisplay.textContent = formatTime(audioElement.duration);
    });

    // Make the canvas click work with the player
    const canvas = document.getElementById('audio-visualizer');
    if (canvas) {
      canvas.addEventListener('click', () => {
        if (audioElement.paused) {
          audioElement.play().catch(e => console.warn('Play failed:', e));
        } else {
          audioElement.pause();
        }
      });
    }
  }

  /**
   * Initialize an enhanced audio visualizer with additional effects
   */
  initializeEnhancedVisualizer() {
    const canvas = document.getElementById('audio-visualizer');
    const audioElement = document.getElementById('background-audio');

    if (!canvas || !audioElement) return;

    const ctx = canvas.getContext('2d');

    // Ensure canvas dimensions match display dimensions
    const resizeCanvas = () => {
      canvas.width = canvas.clientWidth;
      canvas.height = canvas.clientHeight;
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const analyser = audioContext.createAnalyser();
    const source = audioContext.createMediaElementSource(audioElement);

    source.connect(analyser);
    analyser.connect(audioContext.destination);

    // Get visualizer settings from config
    const visualizerSettings = this.config.features.audio?.visualizer || {};
    const sensitivity = visualizerSettings.sensitivity || 1.0;
    const smoothing = visualizerSettings.smoothing || 0.8;

    // Dynamically adjust FFT size based on canvas width
    // This affects the number of frequency bins available
    const calculateFFTSize = (width) => {
      // Base FFT size - must be a power of 2
      let baseSize = 32; // Minimum size

      // Increase FFT size based on width - approximately 1 bar per 8-10px
      if (width >= 480) baseSize = 64;      // For small screens
      if (width >= 768) baseSize = 128;     // For medium screens
      if (width >= 1200) baseSize = 256;    // For large screens
      if (width >= 1600) baseSize = 512;    // For very large screens
      if (width >= 2400) baseSize = 1024;   // For ultra-wide screens

      return baseSize;
    };

    // Set FFT size dynamically
    analyser.fftSize = calculateFFTSize(canvas.width);

    // Set smoothing time constant (0-1)
    analyser.smoothingTimeConstant = smoothing;

    const updateAnalyser = () => {
      // Update FFT size when canvas is resized
      analyser.fftSize = calculateFFTSize(canvas.width);
    };

    // Add resize handler to update analyzer settings
    window.addEventListener('resize', updateAnalyser);

    // Create data array for frequency data
    let bufferLength = analyser.frequencyBinCount;
    let dataArray = new Uint8Array(bufferLength);

    // Get primary and secondary colors from config
    const primaryColor = visualizerSettings.colors?.primary || this.config.theme.colors.accent || '#AF0404';
    const secondaryColor = visualizerSettings.colors?.secondary || this.config.theme.colors.secondary || '#262626';

    // Function to render the visualizer
    function renderVisualizer() {
      requestAnimationFrame(renderVisualizer);

      // Get current frequency data
      bufferLength = analyser.frequencyBinCount;
      dataArray = new Uint8Array(bufferLength);
      analyser.getByteFrequencyData(dataArray);

      // Create fade effect by applying a semi-transparent overlay
      ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Calculate bar width based on canvas size and buffer length
      // Make sure we don't overflow by accounting for spacing between bars
      const spacing = 1; // Space between bars
      const totalSpacing = (bufferLength - 1) * spacing;
      const availableWidth = canvas.width - totalSpacing;
      const barWidth = Math.max(1, availableWidth / bufferLength);

      // Position bars evenly across the canvas
      const startOffset = (canvas.width - (bufferLength * barWidth + totalSpacing)) / 2;
      let x = startOffset;

      for (let i = 0; i < bufferLength; i++) {
        // Apply sensitivity multiplier and scale to canvas height
        let barHeight = (dataArray[i] / 255) * canvas.height * sensitivity;

        // Ensure minimum height for visual appeal
        barHeight = Math.max(barHeight, 1);

        // Create gradient for bars
        const gradient = ctx.createLinearGradient(0, canvas.height - barHeight, 0, canvas.height);
        gradient.addColorStop(0, primaryColor);
        gradient.addColorStop(1, secondaryColor);

        // Draw the bar
        ctx.fillStyle = gradient;
        ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);

        // Add reflection effect
        ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.fillRect(x, canvas.height - barHeight, barWidth, 2);

        // Position for next bar
        x += barWidth + spacing;
      }
    }

    // Start visualizer when audio plays
    audioElement.addEventListener('play', () => {
      if (audioContext.state === 'suspended') {
        audioContext.resume();
      }
      renderVisualizer();
    });

    // Add click handler to canvas to play/pause audio
    canvas.addEventListener('click', () => {
      if (audioElement.paused) {
        audioElement.play().catch(e => console.warn('Playback failed:', e));
      } else {
        audioElement.pause();
      }
    });

    // Add tooltip to indicate the canvas is clickable
    canvas.title = 'Click to play/pause audio';
  }

  /**
   * Set up the footer based on the configuration
   */
  setupFooter() {
    if (!this.loaded || !this.config.site) return;

    const footer = document.querySelector('footer');
    if (!footer) return;

    const footerText = document.createElement('p');
    footerText.textContent = this.config.site.footerText || `© ${new Date().getFullYear()} Svaryx`;

    footer.innerHTML = '';
    footer.appendChild(footerText);
  }

  /**
   * Initialize all dynamic components based on the configuration
   */
  async initializeAll() {
    try {
      await this.loadConfig();
      this.applyTheme();
      this.applySeoSettings();  // Apply SEO settings
      this.renderAlbum();
      this.renderMusicPlatforms();
      this.renderTracklist();
      this.setupMediaEmbed();
      this.setupAudioFeatures();
      this.setupFooter();
    } catch (error) {
      console.error('Failed to initialize site:', error);
    }
  }
}

// Export the singleton instance
const configManager = new SiteConfigManager();
export { configManager as default };
