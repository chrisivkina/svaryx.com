// Import config manager
import configManager from './config-loader.js';

// Keep existing function
const notAvailableMessage = (serviceName) => {
  alert(`SVARYX is not yet available on ${serviceName}. Please try again later.`);
};

// Animation helper functions
const animateOnScroll = () => {
  const elements = document.querySelectorAll('.fade-in-element');

  elements.forEach(element => {
    const elementTop = element.getBoundingClientRect().top;
    const elementVisible = 150;

    if (elementTop < window.innerHeight - elementVisible) {
      element.classList.add('active');
    }
  });
};

// Initialize the site when DOM is loaded
document.addEventListener('DOMContentLoaded', async () => {
  // Initialize all components based on configuration
  await configManager.initializeAll();

  // Set up animations
  window.addEventListener('scroll', animateOnScroll);
  animateOnScroll(); // Initial check for elements in viewport

  // Initialize audio visualizer if enabled in config
  if (configManager.config.features?.audioVisualizer) {
    initializeAudioVisualizer();
  }

  console.log('Svaryx website initialized successfully');
});

// Audio visualizer (optional feature)
function initializeAudioVisualizer() {
  const canvas = document.getElementById('audio-visualizer');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  const audioElement = document.getElementById('background-audio');

  if (!audioElement) return;

  const audioContext = new (window.AudioContext || window.webkitAudioContext)();
  const analyser = audioContext.createAnalyser();
  const source = audioContext.createMediaElementSource(audioElement);

  source.connect(analyser);
  analyser.connect(audioContext.destination);
  analyser.fftSize = 256;

  const bufferLength = analyser.frequencyBinCount;
  const dataArray = new Uint8Array(bufferLength);

  function renderVisualizer() {
    requestAnimationFrame(renderVisualizer);

    analyser.getByteFrequencyData(dataArray);

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const barWidth = (canvas.width / bufferLength) * 2.5;
    let x = 0;

    for(let i = 0; i < bufferLength; i++) {
      const barHeight = dataArray[i] / 2;

      ctx.fillStyle = `rgb(${dataArray[i]}, 50, 50)`;
      ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);

      x += barWidth + 1;
    }
  }

  audioElement.addEventListener('play', () => {
    // Resume audioContext if it was suspended (browser policy)
    if (audioContext.state === 'suspended') {
      audioContext.resume();
    }
    renderVisualizer();
  });
}
