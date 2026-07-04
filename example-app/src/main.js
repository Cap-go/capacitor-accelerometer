import { CapacitorUpdater } from '@capgo/capacitor-updater';
import { Capacitor } from '@capacitor/core';
import './style.css';
import { CapacitorAccelerometer } from '@capgo/capacitor-accelerometer';

const measurementLabel = document.getElementById('measurement');
const availabilityLabel = document.getElementById('availability');
const permissionLabel = document.getElementById('permission');
const startButton = document.getElementById('start-updates');
const stopButton = document.getElementById('stop-updates');
const singleReadButton = document.getElementById('read-once');
const requestPermissionButton = document.getElementById('request-permission');

let measurementListener;

function formatMeasurement(measurement) {
  const x = measurement.x?.toFixed(3) ?? '0.000';
  const y = measurement.y?.toFixed(3) ?? '0.000';
  const z = measurement.z?.toFixed(3) ?? '0.000';
  return `x: ${x}g | y: ${y}g | z: ${z}g`;
}

function isPermissionGranted(state) {
  return state === 'granted' || state === 'limited';
}

async function refreshAvailability() {
  const { isAvailable } = await CapacitorAccelerometer.isAvailable();
  availabilityLabel.textContent = isAvailable ? 'Available' : 'Not available';
}

async function refreshPermission() {
  const { accelerometer } = await CapacitorAccelerometer.checkPermissions();
  permissionLabel.textContent = accelerometer;
}

async function ensurePermission() {
  const { accelerometer } = await CapacitorAccelerometer.checkPermissions();
  permissionLabel.textContent = accelerometer;
  if (!isPermissionGranted(accelerometer)) {
    throw new Error(`Permission not granted (${accelerometer}). Tap "Request Permission" first.`);
  }
}

async function requestPermission() {
  try {
    const { accelerometer } = await CapacitorAccelerometer.requestPermissions();
    permissionLabel.textContent = accelerometer;
    measurementLabel.textContent = isPermissionGranted(accelerometer)
      ? 'Permission granted. You can start updates or read once.'
      : `Permission state: ${accelerometer}`;
  } catch (error) {
    measurementLabel.textContent = error.message;
  }
}

async function readOnce() {
  try {
    await ensurePermission();
    const measurement = await CapacitorAccelerometer.getMeasurement();
    measurementLabel.textContent = formatMeasurement(measurement);
  } catch (error) {
    measurementLabel.textContent = error.message;
  }
}

async function startUpdates() {
  try {
    await ensurePermission();
    if (!measurementListener) {
      measurementListener = await CapacitorAccelerometer.addListener('measurement', (event) => {
        measurementLabel.textContent = formatMeasurement(event);
      });
    }
    await CapacitorAccelerometer.startMeasurementUpdates();
    startButton.disabled = true;
    stopButton.disabled = false;
    singleReadButton.disabled = true;
  } catch (error) {
    measurementLabel.textContent = error.message;
  }
}

async function stopUpdates() {
  await CapacitorAccelerometer.stopMeasurementUpdates();
  if (measurementListener) {
    await measurementListener.remove();
    measurementListener = undefined;
  }
  startButton.disabled = false;
  stopButton.disabled = true;
  singleReadButton.disabled = false;
}

requestPermissionButton.addEventListener('click', requestPermission);
startButton.addEventListener('click', startUpdates);
stopButton.addEventListener('click', stopUpdates);
singleReadButton.addEventListener('click', readOnce);

refreshAvailability();
refreshPermission();

if (Capacitor.isNativePlatform()) {
  CapacitorUpdater.notifyAppReady().catch((error) => {
    console.error('Capgo notifyAppReady failed', error);
  });
}
