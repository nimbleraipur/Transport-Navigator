export interface Location {
  id: string;
  name: string;
  lat: number;
  lng: number;
  area: string;
}

export const MOCK_LOCATIONS: Location[] = [
  { id: '1', name: 'Bilaspur Junction', lat: 21.9961, lng: 82.1319, area: 'Main Railway Station' },
  { id: '2', name: 'Rama Magneto Mall', lat: 22.0801, lng: 82.1551, area: 'Vyapar Vihar' },
  { id: '3', name: 'City Mall 36', lat: 22.0918, lng: 82.1626, area: 'Mangla Chowk' },
  { id: '4', name: 'Kanan Pendari Zoo', lat: 22.1172, lng: 82.0601, area: 'Sakri, Mungeli Road' },
  { id: '5', name: 'Mahamaya Temple', lat: 22.2884, lng: 82.1600, area: 'Ratanpur' },
  { id: '6', name: 'Khutaghat Dam', lat: 22.2500, lng: 82.1000, area: 'Ratanpur Road' },
  { id: '7', name: 'Nehru Chowk', lat: 22.0850, lng: 82.1450, area: 'Civil Lines' },
  { id: '8', name: 'Tifra Bus Stand', lat: 22.0450, lng: 82.1250, area: 'Raipur Road' },
  { id: '9', name: 'High Court Chhattisgarh', lat: 22.1500, lng: 82.0800, area: 'Bodhri' },
  { id: '10', name: 'Apollo Hospital', lat: 22.0650, lng: 82.1750, area: 'Seepat Road' },
  { id: '11', name: 'Link Road', lat: 22.0750, lng: 82.1500, area: 'Commercial Street' },
  { id: '12', name: 'Mangla Chowk', lat: 22.0950, lng: 82.1600, area: 'City Center' },
  { id: '13', name: 'Vyapar Vihar', lat: 22.0780, lng: 82.1550, area: 'Business Hub' },
  { id: '14', name: 'Telipara', lat: 22.0800, lng: 82.1400, area: 'Local Market' },
  { id: '15', name: 'Gondpara', lat: 22.0850, lng: 82.1350, area: 'Residential Area' },
  { id: '16', name: 'Uslapur Station', lat: 22.1000, lng: 82.1100, area: 'Mungeli Road' },
];

export const BILASPUR_REGION = {
  latitude: 22.0797,
  longitude: 82.1391,
  latitudeDelta: 0.1,
  longitudeDelta: 0.1,
};
