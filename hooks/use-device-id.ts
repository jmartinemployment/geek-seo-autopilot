import { useEffect, useState } from 'react';

export function useDeviceId(): string | null {
  const [deviceId, setDeviceId] = useState<string | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem('geek_seo_device_id');
    if (stored) {
      setDeviceId(stored);
    } else {
      const id = crypto.randomUUID();
      localStorage.setItem('geek_seo_device_id', id);
      setDeviceId(id);
    }
  }, []);

  return deviceId;
}
