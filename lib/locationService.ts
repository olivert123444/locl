import * as Location from 'expo-location';
import { Platform } from 'react-native';

// Types for location data
// LocationData interface is now defined with the getCurrentLocation function

// Cache the location to avoid excessive API calls
let cachedLocation: LocationData | null = null;
let lastLocationTimestamp = 0;
const LOCATION_CACHE_DURATION = 5 * 60 * 1000; // 5 minutes in milliseconds

/**
 * Requests location permissions from the user
 * @returns Promise resolving to whether permissions were granted
 */
export async function requestLocationPermissions(): Promise<boolean> {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    return status === 'granted';
  } catch (error) {
    console.error('Error requesting location permissions:', error);
    return false;
  }
}

/**
 * Gets the current location of the device
 * @param useCache Whether to use cached location if available
 * @returns Promise resolving to location data or null if unavailable
 */
// Update the interface to include a flag for auto-skipping
export interface LocationData {
  latitude: number;
  longitude: number;
  address?: string;
  city?: string;
  region?: string;
  country?: string;
  postalCode?: string;
  zip_code?: string;
  // Flag to indicate if we have enough data to skip manual entry
  isComplete?: boolean;
}

export async function getCurrentLocation(useCache = true): Promise<LocationData | null> {
  // Check if we have a recent cached location
  const now = Date.now();
  if (useCache && cachedLocation && (now - lastLocationTimestamp < LOCATION_CACHE_DURATION)) {
    console.log('Using cached location data');
    return cachedLocation;
  }

  try {
    // Check if we have permission
    const { status } = await Location.getForegroundPermissionsAsync();
    if (status !== 'granted') {
      console.log('Location permission not granted');
      const granted = await requestLocationPermissions();
      if (!granted) {
        return null;
      }
    }

    // Get the current position with high accuracy for better city detection
    console.log('Getting current location with high accuracy...');
    let location;
    try {
      location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
    } catch (positionError) {
      console.error('Error getting high accuracy position, trying balanced accuracy:', positionError);
      // Fall back to balanced accuracy if high accuracy fails
      location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
    }

    const { latitude, longitude } = location.coords;
    console.log(`Got coordinates: ${latitude}, ${longitude}`);
    
    // Create a basic location data object with coordinates
    // This ensures we always have at least coordinates, even if reverse geocoding fails
    let locationData: LocationData = {
      latitude,
      longitude,
      city: `Location (${latitude.toFixed(4)}, ${longitude.toFixed(4)})`,
      isComplete: true // We consider coordinates alone to be complete data
    };
    
    // Try to get address information, but don't block if it fails
    try {
      // Set a timeout for reverse geocoding to prevent hanging
      const geocodePromise = reverseGeocode(latitude, longitude);
      const timeoutPromise = new Promise<Partial<LocationData>>((_, reject) => {
        setTimeout(() => reject(new Error('Reverse geocoding timed out')), 5000);
      });
      
      // Race between geocoding and timeout
      const addressInfo = await Promise.race([geocodePromise, timeoutPromise]);
      console.log('Address info from geocoding:', addressInfo);
      
      // Merge the address info with our basic location data
      locationData = {
        ...locationData,
        ...addressInfo
      };
    } catch (geocodeError) {
      console.warn('Reverse geocoding failed or timed out:', geocodeError);
      // We already have the basic location data with coordinates, so we can continue
    }
    
    // Ensure we have a city name, even if it's just coordinates
    if (!locationData.city) {
      console.log('No city found in geocoding results, using fallback');
      // If we have a region but no city, use the region as the city
      if (locationData.region) {
        locationData.city = locationData.region;
      } else {
        // Last resort: use coordinates as a location name
        locationData.city = `Location (${latitude.toFixed(4)}, ${longitude.toFixed(4)})`;
      }
    }
    
    console.log('Final location data:', locationData);

    // Cache the location
    cachedLocation = locationData;
    lastLocationTimestamp = now;
    
    return locationData;
  } catch (error) {
    console.error('Error getting current location:', error);
    return null;
  }
}

/**
 * Reverse geocodes coordinates to get address information using OpenStreetMap Nominatim
 * @param latitude Latitude coordinate
 * @param longitude Longitude coordinate
 * @returns Promise resolving to address data
 */
// Cache for geocoded locations to reduce API calls
const geocodeCache: Record<string, Partial<LocationData>> = {};
const GEOCODE_CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

/**
 * Reverse geocodes coordinates to get address information using multiple services
 * @param latitude Latitude coordinate
 * @param longitude Longitude coordinate
 * @returns Promise resolving to address data
 */
export async function reverseGeocode(
  latitude: number,
  longitude: number
): Promise<Partial<LocationData>> {
  try {
    // Round coordinates to 5 decimal places for caching (approximately 1.1 meters precision)
    const roundedLat = parseFloat(latitude.toFixed(5));
    const roundedLon = parseFloat(longitude.toFixed(5));
    const cacheKey = `${roundedLat},${roundedLon}`;
    
    // Check if we have this location in cache
    if (geocodeCache[cacheKey]) {
      console.log('Using cached geocode result for', cacheKey);
      return geocodeCache[cacheKey];
    }
    
    console.log(`Reverse geocoding coordinates: ${latitude}, ${longitude}`);
    
    // Try multiple geocoding services with a timeout
    const nominatimResult = await tryNominatimGeocoding(latitude, longitude);
    
    if (nominatimResult && nominatimResult.city && nominatimResult.city !== `Location (${latitude.toFixed(4)}, ${longitude.toFixed(4)})`) {
      // Cache successful result
      geocodeCache[cacheKey] = nominatimResult;
      return nominatimResult;
    }
    
    // If Nominatim doesn't return usable data, try to get a more user-friendly location name
    console.log('Nominatim did not return usable city data, using enhanced fallback');
    
    // Create a more user-friendly location name based on coordinates
    const friendlyLocation = await createFriendlyLocationName(latitude, longitude);
    
    // Cache the result
    geocodeCache[cacheKey] = friendlyLocation;
    return friendlyLocation;
  } catch (error) {
    console.error('Error in reverse geocoding:', error);
    
    // Even if all geocoding fails, return coordinates with a formatted label
    return {
      latitude,
      longitude,
      city: `Nearby`, // More user-friendly than showing coordinates
      isComplete: true
    };
  }
}

/**
 * Attempts to geocode using Nominatim with a timeout
 */
async function tryNominatimGeocoding(
  latitude: number,
  longitude: number
): Promise<Partial<LocationData> | null> {
  try {
    // Use OpenStreetMap Nominatim API for reverse geocoding
    const nominatimUrl = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`;
    
    console.log('Fetching from Nominatim:', nominatimUrl);
    
    // Create a timeout promise
    const timeoutPromise = new Promise<Response>((_, reject) => {
      setTimeout(() => reject(new Error('Nominatim request timed out')), 3000); // 3 second timeout
    });
    
    // Race between the fetch and the timeout
    const response = await Promise.race([
      fetch(nominatimUrl, {
        headers: {
          'User-Agent': 'Locl App (https://github.com/yourusername/locl)'
        }
      }),
      timeoutPromise
    ]);
    
    if (!response.ok) {
      throw new Error(`Nominatim API error: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    
    if (data && data.address) {
      // Extract location data from Nominatim response
      const address = data.address;
      
      // Extract city information (Nominatim uses different fields for different areas)
      const city = address.city || address.town || address.village || address.hamlet || address.suburb;
      
      // Create a more user-friendly display name
      let displayName = city || address.county || address.state;
      
      // Add country for international locations
      if (address.country && address.country !== 'United States' && displayName) {
        displayName = `${displayName}, ${address.country}`;
      } else if (address.country && !displayName) {
        displayName = address.country;
      }
      
      // If we still don't have a display name, use the display_name from Nominatim
      if (!displayName && data.display_name) {
        // Simplify the display name by taking just the first part before the first comma
        displayName = data.display_name.split(',')[0];
      }
      
      // Build a formatted address string
      const formattedAddress = [
        address.road,
        address.house_number,
        address.suburb,
        city,
        address.state,
        address.postcode,
        address.country
      ]
        .filter(Boolean)
        .join(', ');
      
      const locationData: Partial<LocationData> = {
        latitude,
        longitude,
        address: formattedAddress,
        city: displayName || `Nearby Location`, // More user-friendly
        region: address.state || address.county || undefined,
        country: address.country || undefined,
        postalCode: address.postcode || undefined,
        zip_code: address.postcode || undefined,
        isComplete: Boolean(displayName)
      };
      
      console.log('Extracted location data from Nominatim:', locationData);
      return locationData;
    }
    
    return null;
  } catch (error) {
    console.error('Error with Nominatim geocoding:', error);
    return null;
  }
}

/**
 * Creates a user-friendly location name when geocoding fails
 */
async function createFriendlyLocationName(
  latitude: number,
  longitude: number
): Promise<Partial<LocationData>> {
  // Instead of showing raw coordinates, we'll use a more friendly term
  return {
    latitude,
    longitude,
    city: 'Nearby Location', // Generic but user-friendly
    isComplete: true
  };
}

/**
 * Formats an address from components
 * @param components Array of address components
 * @returns Formatted address string
 */
function formatAddress(components: (string | undefined)[]): string {
  return components.filter(Boolean).join(', ');
}

/**
 * Calculates the distance between two coordinates in kilometers
 * @param lat1 Latitude of first point
 * @param lon1 Longitude of first point
 * @param lat2 Latitude of second point
 * @param lon2 Longitude of second point
 * @returns Distance in kilometers
 */
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  // Haversine formula to calculate distance between two points on a sphere
  const R = 6371; // Radius of the earth in km
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c; // Distance in km
  return distance;
}

/**
 * Converts degrees to radians
 * @param deg Degrees
 * @returns Radians
 */
function deg2rad(deg: number): number {
  return deg * (Math.PI / 180);
}

/**
 * Gets a user-friendly representation of the distance
 * @param distanceKm Distance in kilometers
 * @returns Formatted distance string
 */
export function formatDistance(distanceKm: number): string {
  if (distanceKm < 1) {
    // Convert to meters if less than 1 km
    const meters = Math.round(distanceKm * 1000);
    return `${meters} m`;
  } else if (distanceKm < 10) {
    // Show one decimal place for distances under 10 km
    return `${distanceKm.toFixed(1)} km`;
  } else {
    // Round to nearest km for larger distances
    return `${Math.round(distanceKm)} km`;
  }
}
