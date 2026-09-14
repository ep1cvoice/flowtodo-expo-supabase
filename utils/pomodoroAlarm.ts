import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';

const ALARM_SOURCE = require('../assets/sounds/ElectronicAlarmBuzzer.wav');

let player: AudioPlayer | null = null;
let starting: Promise<void> | null = null;

async function ensureMode() {
  await setAudioModeAsync({
    playsInSilentMode: true,
    allowsRecording: false,
    shouldPlayInBackground: false,
    shouldRouteThroughEarpiece: false,
    interruptionMode: 'duckOthers',
  });
}

export async function playPomodoroAlarm() {
  if (starting) {
    await starting;
    return;
  }

  starting = (async () => {
    try {
      await stopPomodoroAlarm();
      await ensureMode();
      const next = createAudioPlayer(ALARM_SOURCE);
      next.loop = true;
      next.volume = 1;
      next.play();
      player = next;
    } catch {
      // Playback may fail on restricted web autoplay — modal still shows.
    } finally {
      starting = null;
    }
  })();

  await starting;
}

export async function stopPomodoroAlarm() {
  const current = player;
  player = null;
  if (!current) return;
  try {
    current.pause();
  } catch {
    // ignore
  }
  try {
    current.remove();
  } catch {
    // ignore
  }
}
