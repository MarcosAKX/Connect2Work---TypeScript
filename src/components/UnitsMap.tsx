import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import logo from '../assets/img/cwlogo.ico';
import type { Unit } from '../types/domain';

interface UnitsMapProps {
  units: Unit[];
  selectedUnitId: string | null;
  userPosition: { latitude: number; longitude: number } | null;
  onSelect(unitId: string): void;
}

const DEFAULT_CENTER: L.LatLngExpression = [-20.9447, -48.4894];

export function UnitsMap({ units, selectedUnitId, userPosition, onSelect }: UnitsMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef(new Map<string, L.Marker>());

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = L.map(containerRef.current, { zoomControl: true, scrollWheelZoom: false }).setView(DEFAULT_CENTER, 12);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map);
    mapRef.current = map;
    return () => { map.remove(); mapRef.current = null; markerRef.current.clear(); };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    markerRef.current.forEach((marker) => marker.remove());
    markerRef.current.clear();
    const locatedUnits = units.filter((unit): unit is Unit & { latitude: number; longitude: number } =>
      typeof unit.latitude === 'number' && typeof unit.longitude === 'number',
    );
    locatedUnits.forEach((unit) => {
      const icon = L.divIcon({ className: 'units-map-marker-wrap', html: `<span class="units-map-marker"><img src="${logo}" alt="" /></span>`, iconSize: [42, 50], iconAnchor: [21, 48], popupAnchor: [0, -44] });
      const popup = document.createElement('div');
      const name = document.createElement('strong');
      const address = document.createElement('span');
      name.textContent = unit.name;
      address.textContent = unit.address;
      popup.append(name, document.createElement('br'), address);
      const marker = L.marker([unit.latitude, unit.longitude], { icon, title: unit.name }).addTo(map).bindPopup(popup);
      marker.on('click', () => onSelect(unit.id));
      markerRef.current.set(unit.id, marker);
    });
    if (locatedUnits.length > 0) map.fitBounds(L.latLngBounds(locatedUnits.map(({ latitude, longitude }) => [latitude, longitude])), { padding: [42, 42], maxZoom: 13 });
  }, [onSelect, units]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const marker = selectedUnitId ? markerRef.current.get(selectedUnitId) : undefined;
    if (marker) { map.flyTo(marker.getLatLng(), Math.max(map.getZoom(), 13), { duration: 0.45 }); marker.openPopup(); }
  }, [selectedUnitId]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !userPosition) return;
    const marker = L.circleMarker([userPosition.latitude, userPosition.longitude], { radius: 7, color: '#ffffff', weight: 2, fillColor: '#2563eb', fillOpacity: 1 }).addTo(map).bindTooltip('Sua localização');
    return () => { marker.remove(); };
  }, [userPosition]);

  return <div ref={containerRef} className="units-map__canvas" aria-label="Mapa interativo das unidades Connect2Work" />;
}
