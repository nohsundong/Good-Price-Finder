import { useState, useEffect } from "react";

export interface GeoLocation {
  latitude: number;
  longitude: number;
}

export function haversineDistance(
  coords1: GeoLocation,
  coords2: GeoLocation
): number {
  const toRad = (x: number) => (x * Math.PI) / 180;
  
  const R = 6371; // Earth radius in km
  const dLat = toRad(coords2.latitude - coords1.latitude);
  const dLon = toRad(coords2.longitude - coords1.longitude);
  
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(coords1.latitude)) *
    Math.cos(toRad(coords2.latitude)) *
    Math.sin(dLon / 2) *
    Math.sin(dLon / 2);
    
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function formatDistance(km: number): string {
  if (km < 1) {
    return `${(km * 1000).toFixed(0)}m`;
  }
  return `${km.toFixed(1)}km`;
}

export function useGeolocation() {
  const [location, setLocation] = useState<GeoLocation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!navigator.geolocation) {
      setError("브라우저가 위치 정보를 지원하지 않습니다.");
      setLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
        setLoading(false);
      },
      (err) => {
        let errorMessage = "위치 정보를 가져올 수 없습니다.";
        if (err.code === 1) errorMessage = "위치 정보 접근 권한이 거부되었습니다.";
        else if (err.code === 2) errorMessage = "현재 위치를 확인할 수 없습니다.";
        else if (err.code === 3) errorMessage = "위치 정보 요청 시간이 초과되었습니다.";
        
        setError(errorMessage);
        setLoading(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 5000,
        maximumAge: 0,
      }
    );
  }, []);

  return { location, loading, error };
}
