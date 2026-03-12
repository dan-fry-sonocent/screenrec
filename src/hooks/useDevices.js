import { useState, useEffect } from 'react';

export function useDevices() {
  const [cameras, setCameras] = useState([]);
  const [mics, setMics]       = useState([]);

  useEffect(() => {
    async function enumerate() {
      try {
        // Request mic permission so device labels are populated.
        await navigator.mediaDevices
          .getUserMedia({ audio: true, video: false })
          .then(s => s.getTracks().forEach(t => t.stop()))
          .catch(() => {});

        const devices = await navigator.mediaDevices.enumerateDevices();
        setCameras(devices.filter(d => d.kind === 'videoinput'));
        setMics(devices.filter(d => d.kind === 'audioinput'));
      } catch (e) {
        console.warn('enumerateDevices:', e);
      }
    }
    enumerate();
  }, []);

  return { cameras, mics };
}
