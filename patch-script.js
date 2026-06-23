const fs = require('fs');

const oldCode = fs.readFileSync('old-booking.txt', 'utf8');

const newCode = oldCode
  .replace(
    "import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';",
    "import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';\nimport InAppAlert, { AlertType, AlertButton } from '@/components/InAppAlert';\nimport { getApiUrl } from '@/lib/query-client';"
  )
  .replace(
    "const VEHICLE_OPTIONS = [",
    "interface VehicleOptionType {\n  type: string;\n  label: string;\n  icon: any;\n  baseFare: number;\n  perKm: number;\n  capacity: string;\n  color: string;\n  allowedCities?: string[];\n  pickupRestriction?: 'city-only' | 'anywhere';\n  dropRestriction?: 'city-only' | 'anywhere';\n}\n\nconst VEHICLE_OPTIONS ="
  )
  .replace(
    "vehicle: typeof VEHICLE_OPTIONS[0];",
    "vehicle: VehicleOptionType;"
  )
  .replace(
    "const { createBooking } = useBookings();",
    "const { createBooking, checkOperationalAvailability } = useBookings();"
  )
  .replace(
    "const [selectedVehicle, setSelectedVehicle] = useState(VEHICLE_OPTIONS[0]);",
    "const [selectedVehicle, setSelectedVehicle] = useState<VehicleOptionType | null>(null);\n  const [vehicleOptions, setVehicleOptions] = useState<VehicleOptionType[]>([]);\n  const [fetchingVehicles, setFetchingVehicles] = useState(false);\n  const [operationalCities, setOperationalCities] = useState<any[]>([]);\n\n  // In-app alert state\n  const [alertVisible, setAlertVisible] = useState(false);\n  const [alertType, setAlertType] = useState<AlertType>('info');\n  const [alertTitle, setAlertTitle] = useState('');\n  const [alertMessage, setAlertMessage] = useState('');\n  const [alertButtons, setAlertButtons] = useState<AlertButton[]>([]);\n\n  const showAlert = (type: AlertType, title: string, message?: string, buttons?: AlertButton[]) => {\n    setAlertType(type);\n    setAlertTitle(title);\n    setAlertMessage(message || '');\n    setAlertButtons(buttons || [{ text: 'OK', style: 'default', onPress: () => setAlertVisible(false) }]);\n    setAlertVisible(true);\n  };\n"
  )
  .replace(
    "const bothSelected = pickup !== null && delivery !== null;",
    "const bothSelected = pickup !== null && delivery !== null;\n\n  useEffect(() => {\n    fetchVehicles();\n    fetchOperationalCities();\n  }, []);\n\n  const fetchOperationalCities = async () => {\n    try {\n      const baseUrl = getApiUrl();\n      const res = await fetch(`${baseUrl}/api/cities`);\n      const data = await res.json();\n      if (Array.isArray(data)) setOperationalCities(data.filter((c: any) => c.isActive));\n    } catch (e) { console.error(e); }\n  };\n\n  const fetchVehicles = async () => {\n    setFetchingVehicles(true);\n    try {\n      const baseUrl = getApiUrl();\n      const res = await fetch(`${baseUrl}/api/vehicles`);\n      const data = await res.json();\n      if (data.vehicles && data.vehicles.length > 0) {\n        const options = data.vehicles.map((v: any, index: number) => ({\n          type: v.type, label: v.name, icon: v.icon || (v.type?.toLowerCase().includes('auto') ? 'auto-rickshaw' : 'truck'), baseFare: v.baseFare, perKm: v.perKmRate || v.perKmCharge || 0, capacity: v.capacity, color: index === 0 ? '#F59E0B' : index === 1 ? '#10B981' : '#1B6EF3', allowedCities: v.allowedCities, pickupRestriction: v.pickupRestriction, dropRestriction: v.dropRestriction\n        }));\n        setVehicleOptions(options);\n        setSelectedVehicle(options[0]);\n      }\n    } catch (e) {\n      console.error(e);\n      setVehicleOptions(VEHICLE_OPTIONS as any);\n      setSelectedVehicle(VEHICLE_OPTIONS[0] as any);\n    } finally {\n      setFetchingVehicles(false);\n    }\n  };"
  )
  .replace(
    /Alert\.alert\('Incomplete Location', 'Please wait for the address to load or move the map slightly\.'\);/g,
    "showAlert('info', 'Incomplete Location', 'Please wait for the address to load or move the map slightly.');"
  )
  .replace(
    /Alert\.alert\('Location Error', 'Could not get coordinates for this location\. Please try another or use map\.'\);/g,
    "showAlert('error', 'Location Error', 'Could not get coordinates for this location. Please try another or use map.');"
  )
  .replace(
    /Alert\.alert\('Search Error', 'Failed to fetch location details\. Please use the map\.'\);/g,
    "showAlert('error', 'Search Error', 'Failed to fetch location details. Please use the map.');"
  )
  .replace(
    /Alert\.alert\('Invalid Location', 'This location does not have coordinates\. Please select from map\.'\);/g,
    "showAlert('error', 'Invalid Location', 'This location does not have coordinates. Please select from map.');"
  )
  .replace(
    /Alert\.alert\('Booking Error', result\.error \|\| 'Something went wrong\. Please check your network and try again\.'\);/g,
    "showAlert('error', 'Booking Failed', result.error || 'Something went wrong. Please check your network and try again.');"
  )
  .replace(
    "if (activeField === 'pickup') { setPickup(finalLoc); setPickupSearch(finalLoc.name); }",
    "if (operationalCities.length > 0) {\n                    const inCity = operationalCities.some(city => calculateDistance(city.lat, city.lng, finalLoc.lat, finalLoc.lng) <= city.radius);\n                    if (!inCity) {\n                      const cityNames = operationalCities.map(c => c.name).join(', ');\n                      showAlert('warning', 'Outside Service Area', `\"${finalLoc.name}\" is outside our operational zones. We currently serve: ${cityNames}. Please choose a location within these areas.`);\n                      return;\n                    }\n                  }\n                  if (activeField === 'pickup') { setPickup(finalLoc); setPickupSearch(finalLoc.name); }"
  )
  .replace(
    "const result = await createBooking({",
    "const pickupCity = await checkOperationalAvailability(pickup.lat, pickup.lng) as any;\n    if (pickupCity.error || pickupCity.message) {\n      setLoading(false);\n      showAlert('warning', 'Service Unavailable', `We don't provide service from your current pickup area yet.`);\n      return;\n    }\n    if (selectedVehicle) {\n      if (selectedVehicle.allowedCities && selectedVehicle.allowedCities.length > 0 && !selectedVehicle.allowedCities.includes(pickupCity.id || pickupCity._id)) {\n        setLoading(false);\n        showAlert('warning', 'Vehicle Restricted', `This vehicle type is not available for this area.`);\n        return;\n      }\n      if (selectedVehicle.dropRestriction === 'city-only') {\n        const dropCity = await checkOperationalAvailability(delivery.lat, delivery.lng) as any;\n        if (dropCity.error || dropCity.message || (pickupCity.id || pickupCity._id) !== (dropCity.id || dropCity._id)) {\n          setLoading(false);\n          showAlert('warning', 'Restricted Route', `For ${selectedVehicle.label}, pickup and drop must be within the same city.`);\n          return;\n        }\n      }\n    }\n\n    const result = await createBooking({"
  )
  .replace(
    "vehicleType: selectedVehicle.type,",
    "vehicleType: selectedVehicle?.type || 'auto',"
  )
  .replace(
    "totalPrice: selectedVehicle.baseFare + Math.round(distance * selectedVehicle.perKm),",
    "totalPrice: (selectedVehicle?.baseFare || 0) + Math.round(distance * (selectedVehicle?.perKm || 0)),"
  )
  .replace(
    "{VEHICLE_OPTIONS.map(v => (",
    "{fetchingVehicles ? (\n                <View className=\"py-10 items-center\"><ActivityIndicator color={Colors.primary} /></View>\n              ) : vehicleOptions.map(v => ("
  )
  .replace(
    "isActive={selectedVehicle.type === v.type}",
    "isActive={selectedVehicle?.type === v.type}"
  )
  .replace(
    "</View>\n  );\n}\n\nconst styles = StyleSheet.create({});",
    "  <InAppAlert visible={alertVisible} type={alertType} title={alertTitle} message={alertMessage} buttons={alertButtons} onDismiss={() => setAlertVisible(false)} />\n    </View>\n  );\n}\n\nconst styles = StyleSheet.create({});"
  );

fs.writeFileSync('app/customer/new-booking.tsx', newCode);
console.log('Restored successfully');
