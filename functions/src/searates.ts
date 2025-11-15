import * as functions from 'firebase-functions';
import axios from 'axios';
import * as admin from 'firebase-admin';

// Helper to get SeaRates Bearer Token
async function getSeaRatesToken(): Promise<string> {
    const PLATFORM_ID = process.env.SEARATES_PLATFORM_ID || '29979';
    const API_KEY = functions.config().searates?.api_key || process.env.SEARATES_API_KEY;

    if (!API_KEY || API_KEY === 'your-searates-api-key-here') {
        throw new Error('SeaRates API key not configured');
    }

    try {
        const response = await axios.get(
            'https://www.searates.com/auth/platform-token',
            {
                params: {
                    id: PLATFORM_ID,
                    api_key: API_KEY
                },
                timeout: 10000
            }
        );

        const token = response.data['s-token'];
        if (!token) {
            throw new Error('No token received from SeaRates');
        }

        return token;
    } catch (error: any) {
        console.error('[SeaRates] Authentication failed:', error.message);
        throw new Error(`SeaRates authentication failed: ${error.message}`);
    }
}

// Helper to check subscription status
async function checkUserSubscription(userEmail: string): Promise<boolean> {
    if (!userEmail || userEmail === 'anonymous') {
        return false;
    }

    if (userEmail === 'vg@vcanresources.com') {
        console.log(`Owner access granted for ${userEmail}`);
        return true;
    }

    try {
        const userDoc = await admin.firestore()
            .collection('users')
            .doc(userEmail)
            .get();

        const userData = userDoc.data();
        return userData?.subscriptionTier === 'pro' || userData?.subscriptionTier === 'premium';
    } catch (error) {
        console.error('Error checking subscription:', error);
        return false;
    }
}

// Get FCL rates
export const getFCLRates = async (data: any, context: any) => {
    const userEmail = context?.auth?.token?.email || 'guest';
    const isSubscribed = userEmail !== 'guest' ? await checkUserSubscription(userEmail) : false;

    const { origin, destination, containerType } = data;

    if (!origin || !destination || !containerType) {
        throw new functions.https.HttpsError(
            'invalid-argument',
            'Missing required parameters: origin, destination, containerType'
        );
    }

    if (isSubscribed) {
        try {
            const token = await getSeaRatesToken();
            const fromLat = origin?.lat || 31.23;
            const fromLng = origin?.lng || 121.47;
            const toLat = destination?.lat || 34.05;
            const toLng = destination?.lng || -118.24;
            const isST20 = containerType === '20' ? 1 : 0;
            const isST40 = containerType === '40' ? 1 : 0;

            const query = {
                query: `
                    query {
                        fcl(
                            ST20: ${isST20}
                            ST40: ${isST40}
                            from: [${fromLat}, ${fromLng}]
                            to: [${toLat}, ${toLng}]
                            currency: USD
                        ) {
                            freight: oceanFreight {
                                price
                                transitTime
                                shippingLine
                            }
                        }
                    }
                `
            };

            const response = await axios.post(
                'https://www.searates.com/graphql_rates',
                query,
                {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    timeout: 60000
                }
            );

            if (response.data?.data?.fcl) {
                const rates = response.data.data.fcl.flatMap((item: any) =>
                    item.freight.map((rate: any) => ({
                        carrier: rate.shippingLine || 'Carrier TBN',
                        service_name: 'Ocean Freight',
                        total_rate: rate.price,
                        transit_time: `${rate.transitTime} days`,
                        source: 'live_carrier_api'
                    }))
                );
                return { success: true, quotes: rates, source: 'live_carrier_api' };
            }
        } catch (error: any) {
            console.error('[SeaRates] FCL API call failed:', error.message);
        }
    }

    return {
        success: true,
        quotes: [
            { carrier: 'Maersk', service_name: 'Spot Rate', total_rate: 2450, transit_time: '20-25 days', source: 'estimated_rates' },
            { carrier: 'MSC', service_name: 'Spot Rate', total_rate: 2380, transit_time: '22-27 days', source: 'estimated_rates' }
        ],
        source: 'estimated_rates',
        message: isSubscribed ? 'SeaRates API unavailable, showing estimated rates' : 'Upgrade to Pro for live FCL rates'
    };
};

// Get LCL rates
export const getLCLRates = async (data: any, context: any) => {
    const userEmail = context?.auth?.token?.email || 'guest';
    const isSubscribed = userEmail !== 'guest' ? await checkUserSubscription(userEmail) : false;
    const { origin, destination, weight, volume } = data;

    if (!origin || !destination || !weight || !volume) {
        throw new functions.https.HttpsError('invalid-argument', 'Missing required parameters');
    }

    if (isSubscribed) {
        try {
            const token = await getSeaRatesToken();
            const fromLat = origin?.lat || 31.23;
            const fromLng = origin?.lng || 121.47;
            const toLat = destination?.lat || 34.05;
            const toLng = destination?.lng || -118.24;

            const query = {
                query: `
                    query {
                        lcl(
                            weight: ${weight || 1000}
                            volume: ${volume || 1}
                            from: [${fromLat}, ${fromLng}]
                            to: [${toLat}, ${toLng}]
                            currency: USD
                        ) {
                            freight: oceanFreight {
                                price
                                transitTime
                                shippingLine
                            }
                        }
                    }
                `
            };
            const response = await axios.post('https://www.searates.com/graphql_rates', query, {
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                timeout: 60000
            });

            if (response.data?.data?.lcl) {
                const rates = response.data.data.lcl.flatMap((item: any) =>
                    item.freight.map((rate: any) => ({
                        carrier: rate.shippingLine || 'Carrier TBN',
                        service_name: 'LCL Consolidation',
                        total_rate: rate.price,
                        transit_time: `${rate.transitTime} days`,
                        source: 'live_carrier_api'
                    }))
                );
                return { success: true, quotes: rates, source: 'live_carrier_api' };
            }
        } catch (error: any) {
            console.error('[SeaRates] LCL API call failed:', error.message);
        }
    }

    return {
        success: true,
        quotes: [
            { carrier: 'CMA CGM', service_name: 'LCL Consolidation', total_rate: 180, transit_time: '25-30 days', source: 'estimated_rates' },
            { carrier: 'Evergreen', service_name: 'LCL Consolidation', total_rate: 175, transit_time: '28-32 days', source: 'estimated_rates' }
        ],
        source: 'estimated_rates',
        message: isSubscribed ? 'SeaRates API unavailable, showing estimated rates' : 'Upgrade to Pro for live LCL rates'
    };
};

// Get Air Freight rates
export const getAirFreightRates = async (data: any, context: any) => {
    const userEmail = context?.auth?.token?.email || 'guest';
    const isSubscribed = userEmail !== 'guest' ? await checkUserSubscription(userEmail) : false;
    const { origin, destination, weight } = data;

    if (!origin || !destination || !weight) {
        throw new functions.https.HttpsError('invalid-argument', 'Missing required parameters');
    }

    if (isSubscribed) {
        try {
            const token = await getSeaRatesToken();
            const fromLat = origin?.lat || 31.23;
            const fromLng = origin?.lng || 121.47;
            const toLat = destination?.lat || 34.05;
            const toLng = destination?.lng || -118.24;

            const query = {
                query: `
                    query {
                        air(
                            weight: ${weight || 100}
                            from: [${fromLat}, ${fromLng}]
                            to: [${toLat}, ${toLng}]
                            currency: USD
                        ) {
                            freight: airFreight {
                                price
                                transitTime
                                airline
                            }
                        }
                    }
                `
            };
            const response = await axios.post('https://www.searates.com/graphql_rates', query, {
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                timeout: 60000
            });

            if (response.data?.data?.air) {
                const rates = response.data.data.air.flatMap((item: any) =>
                    item.freight.map((rate: any) => ({
                        carrier: rate.airline || 'Airline TBN',
                        service_name: 'Air Freight',
                        total_rate: rate.price,
                        transit_time: `${rate.transitTime} days`,
                        source: 'live_carrier_api'
                    }))
                );
                return { success: true, quotes: rates, source: 'live_carrier_api' };
            }
        } catch (error: any) {
            console.error('[SeaRates] Air Freight API call failed:', error.message);
        }
    }

    return {
        success: true,
        quotes: [
            { carrier: 'DHL Express', service_name: 'Air Freight', total_rate: 850, transit_time: '3-5 days', source: 'estimated_rates' },
            { carrier: 'FedEx Express', service_name: 'Air Freight', total_rate: 920, transit_time: '2-4 days', source: 'estimated_rates' }
        ],
        source: 'estimated_rates',
        message: isSubscribed ? 'SeaRates API unavailable, showing estimated rates' : 'Upgrade to Pro for live Air Freight rates'
    };
};
