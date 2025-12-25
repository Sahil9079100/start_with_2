// client/src/utils/deviceInfo.js

/**
 * Detect device type, browser, and OS from user agent
 * @returns {Object} Device information
 */
export function getDeviceInfo() {
    const ua = navigator.userAgent;
    const uaLower = ua.toLowerCase();
    
    // Detect OS
    let os = "Unknown";
    let osVersion = "";
    
    if (/windows nt/i.test(ua)) {
        os = "Windows";
        const match = ua.match(/Windows NT (\d+\.\d+)/);
        if (match) {
            const ntVersion = match[1];
            // Map NT versions to Windows versions
            const ntMap = {
                "10.0": "10/11",
                "6.3": "8.1",
                "6.2": "8",
                "6.1": "7",
                "6.0": "Vista",
                "5.1": "XP"
            };
            osVersion = ntMap[ntVersion] || ntVersion;
        }
    } else if (/macintosh|mac os x/i.test(ua)) {
        os = "macOS";
        const match = ua.match(/Mac OS X (\d+[._]\d+[._]?\d*)/);
        if (match) {
            osVersion = match[1].replace(/_/g, ".");
        }
    } else if (/iphone|ipad|ipod/i.test(ua)) {
        os = /ipad/i.test(ua) ? "iPadOS" : "iOS";
        const match = ua.match(/OS (\d+[._]\d+[._]?\d*)/);
        if (match) {
            osVersion = match[1].replace(/_/g, ".");
        }
    } else if (/android/i.test(ua)) {
        os = "Android";
        const match = ua.match(/Android (\d+\.?\d*)/);
        if (match) {
            osVersion = match[1];
        }
    } else if (/linux/i.test(ua)) {
        os = "Linux";
    } else if (/cros/i.test(ua)) {
        os = "Chrome OS";
    }
    
    // Detect Browser
    let browser = "Unknown";
    let browserVersion = "";
    
    if (/edg\//i.test(ua)) {
        browser = "Edge";
        const match = ua.match(/Edg\/(\d+\.?\d*)/);
        if (match) browserVersion = match[1];
    } else if (/opr\//i.test(ua) || /opera/i.test(ua)) {
        browser = "Opera";
        const match = ua.match(/(?:OPR|Opera)\/(\d+\.?\d*)/);
        if (match) browserVersion = match[1];
    } else if (/chrome/i.test(ua) && !/chromium/i.test(ua)) {
        browser = "Chrome";
        const match = ua.match(/Chrome\/(\d+\.?\d*)/);
        if (match) browserVersion = match[1];
    } else if (/safari/i.test(ua) && !/chrome/i.test(ua)) {
        browser = "Safari";
        const match = ua.match(/Version\/(\d+\.?\d*)/);
        if (match) browserVersion = match[1];
    } else if (/firefox/i.test(ua)) {
        browser = "Firefox";
        const match = ua.match(/Firefox\/(\d+\.?\d*)/);
        if (match) browserVersion = match[1];
    } else if (/msie|trident/i.test(ua)) {
        browser = "Internet Explorer";
        const match = ua.match(/(?:MSIE |rv:)(\d+\.?\d*)/);
        if (match) browserVersion = match[1];
    }
    
    // Detect Device Type
    let deviceType = "desktop";
    
    if (/mobile/i.test(ua)) {
        deviceType = "mobile";
    } else if (/tablet|ipad/i.test(ua)) {
        deviceType = "tablet";
    } else if (/android/i.test(ua) && !/mobile/i.test(ua)) {
        deviceType = "tablet"; // Android without "mobile" is usually tablet
    }
    
    // Create display string (e.g., "Chrome on macOS")
    const deviceString = `${browser} on ${os}`;
    
    return {
        deviceType,
        browser,
        browserVersion,
        os,
        osVersion,
        deviceString,
        userAgent: ua
    };
}

/**
 * Get user's location using the Geolocation API
 * Requires user permission
 * @returns {Promise<Object>} Location information
 */
export async function getLocation() {
    return new Promise((resolve) => {
        // Check if geolocation is supported
        if (!navigator.geolocation) {
            resolve({
                success: false,
                permissionGranted: false,
                error: "Geolocation not supported",
                locationString: "Location Not Provided",
                city: "",
                region: "",
                country: "",
                countryCode: "",
                latitude: null,
                longitude: null,
                timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || ""
            });
            return;
        }
        
        navigator.geolocation.getCurrentPosition(
            async (position) => {
                try {
                    // We got coordinates, now reverse geocode to get city/country
                    const { latitude, longitude } = position.coords;
                    
                    // Use a free reverse geocoding API
                    const locationData = await reverseGeocode(latitude, longitude);
                    
                    resolve({
                        success: true,
                        permissionGranted: true,
                        ...locationData,
                        latitude,
                        longitude,
                        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || ""
                    });
                } catch (error) {
                    console.error("Reverse geocoding error:", error);
                    // Still return coordinates even if reverse geocoding fails
                    resolve({
                        success: true,
                        permissionGranted: true,
                        locationString: "Location Available",
                        city: "",
                        region: "",
                        country: "",
                        countryCode: "",
                        latitude: position.coords.latitude,
                        longitude: position.coords.longitude,
                        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || ""
                    });
                }
            },
            (error) => {
                // User denied permission or error occurred
                let errorMessage = "Location permission denied";
                if (error.code === error.TIMEOUT) {
                    errorMessage = "Location request timed out";
                } else if (error.code === error.POSITION_UNAVAILABLE) {
                    errorMessage = "Location unavailable";
                }
                
                resolve({
                    success: false,
                    permissionGranted: false,
                    error: errorMessage,
                    locationString: "Location Not Provided",
                    city: "",
                    region: "",
                    country: "",
                    countryCode: "",
                    latitude: null,
                    longitude: null,
                    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || ""
                });
            },
            {
                enableHighAccuracy: false, // Don't need high accuracy for city-level
                timeout: 10000, // 10 second timeout
                maximumAge: 300000 // Cache for 5 minutes
            }
        );
    });
}

/**
 * Reverse geocode coordinates to get city/country
 * Uses free Nominatim API (OpenStreetMap)
 * @param {number} latitude 
 * @param {number} longitude 
 * @returns {Promise<Object>}
 */
async function reverseGeocode(latitude, longitude) {
    try {
        // Using Nominatim (OpenStreetMap) - free, no API key required
        const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=10`,
            {
                headers: {
                    'Accept-Language': 'en',
                    'User-Agent': 'StartWith-App/1.0'
                }
            }
        );
        
        if (!response.ok) {
            throw new Error("Reverse geocoding failed");
        }
        
        const data = await response.json();
        const address = data.address || {};
        
        const city = address.city || address.town || address.village || address.municipality || "";
        const region = address.state || address.province || "";
        const country = address.country || "";
        const countryCode = address.country_code?.toUpperCase() || "";
        
        // Create display string
        let locationString = "Location Not Provided";
        if (city && countryCode) {
            locationString = `${city}, ${countryCode}`;
        } else if (country) {
            locationString = country;
        } else if (city) {
            locationString = city;
        }
        
        return {
            city,
            region,
            country,
            countryCode,
            locationString
        };
    } catch (error) {
        console.error("Reverse geocoding error:", error);
        throw error;
    }
}

/**
 * Get IP-based location as fallback (less accurate but doesn't require permission)
 * @returns {Promise<Object>}
 */
export async function getIPBasedLocation() {
    try {
        // Using ip-api.com - free for non-commercial use
        const response = await fetch('http://ip-api.com/json/?fields=status,city,regionName,country,countryCode,timezone,query');
        
        if (!response.ok) {
            throw new Error("IP location lookup failed");
        }
        
        const data = await response.json();
        
        if (data.status !== 'success') {
            throw new Error("IP location lookup failed");
        }
        
        const locationString = data.city && data.countryCode 
            ? `${data.city}, ${data.countryCode}` 
            : data.country || "Unknown Location";
        
        return {
            success: true,
            permissionGranted: false, // IP-based doesn't require permission
            city: data.city || "",
            region: data.regionName || "",
            country: data.country || "",
            countryCode: data.countryCode || "",
            timezone: data.timezone || "",
            ipAddress: data.query || "",
            locationString,
            latitude: null,
            longitude: null
        };
    } catch (error) {
        console.error("IP location error:", error);
        return {
            success: false,
            permissionGranted: false,
            error: "Could not determine location",
            locationString: "Location Not Provided",
            city: "",
            region: "",
            country: "",
            countryCode: "",
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "",
            latitude: null,
            longitude: null
        };
    }
}

/**
 * Get complete session info (device + location)
 * First tries GPS location, falls back to IP-based
 * @param {boolean} requestGPSPermission - Whether to request GPS permission
 * @returns {Promise<Object>}
 */
export async function getSessionInfo(requestGPSPermission = true) {
    const deviceInfo = getDeviceInfo();
    
    let locationInfo;
    
    if (requestGPSPermission) {
        // Try GPS first
        locationInfo = await getLocation();
        
        // If GPS failed, try IP-based as fallback
        if (!locationInfo.success) {
            const ipLocation = await getIPBasedLocation();
            if (ipLocation.success) {
                locationInfo = {
                    ...ipLocation,
                    permissionGranted: false // GPS permission was denied
                };
            }
        }
    } else {
        // Only use IP-based location
        locationInfo = await getIPBasedLocation();
    }
    
    return {
        ...deviceInfo,
        location: {
            city: locationInfo.city || "",
            region: locationInfo.region || "",
            country: locationInfo.country || "",
            countryCode: locationInfo.countryCode || "",
            latitude: locationInfo.latitude,
            longitude: locationInfo.longitude,
            timezone: locationInfo.timezone || ""
        },
        locationString: locationInfo.locationString || "Location Not Provided",
        locationPermissionGranted: locationInfo.permissionGranted || false,
        ipAddress: locationInfo.ipAddress || ""
    };
}
