import { onRequest } from "firebase-functions/v2/https";
import * as functions from "firebase-functions";
import axios from "axios";
import { Request, Response } from "express";

// SeaRates API configuration
const SEARATES_API_KEY = functions.config().searates?.key || process.env.SEARATES_API_KEY;
const SEARATES_BASE_URL = "https://www.searates.com/api";

// Database connection (will be imported from connection.ts)
// interface TransportRate {
//   origin: string;
//   destination: string;
//   mode: string;
//   service_type: string;
//   cost: number;
//   currency: string;
//   transit_time: string;
//   available_capacity: number;
// }

/**
 * Get Rail Rates from SeaRates API
 * Handles both containerized and bulk rail transport
 */
export const getRailRates = onRequest({
  cors: true,
  timeoutSeconds: 60,
  memory: "256MiB"
}, async (req: Request, res: Response) => {
  try {
    console.log('[SeaRates Rail] Request received:', req.body);
    
    const { origin, destination, container_type, weight, volume } = req.body;
    
    if (!origin || !destination) {
      res.status(400).json({
        error: 'Missing required parameters',
        required: ['origin', 'destination']
      });
      return;
    }

    // Use SeaRates API key from config
    const apiKey = SEARATES_API_KEY;
    if (!apiKey || apiKey === 'your-searates-api-key-here') {
      console.warn('[SeaRates Rail] API key not configured, returning estimated rates');
      throw new Error('SeaRates API key not configured');
    }

    // Call SeaRates Rail API
    const response = await axios.post(
      `${SEARATES_BASE_URL}/rail/rates`,
      {
        origin,
        destination,
        container_type: container_type || '20GP',
        weight: weight || 0,
        volume: volume || 0,
        currency: 'USD'
      },
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000
      }
    );

    console.log('[SeaRates Rail] API response received');
    
    // Transform response to standard format
    const rates = response.data.rates?.map((rate: any) => ({
      mode: 'rail',
      service_type: rate.service_type || 'Standard Rail',
      origin: rate.origin,
      destination: rate.destination,
      cost: parseFloat(rate.total_cost) || 0,
      currency: rate.currency || 'USD',
      transit_time: rate.transit_time || '7-14 days',
      available_capacity: rate.available_capacity || 100,
      container_types: rate.container_types || ['20GP', '40GP', '40HC'],
      provider: rate.provider || 'SeaRates Rail Network'
    })) || [];

    res.json({
      success: true,
      mode: 'rail',
      rates: rates,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('[SeaRates Rail] Error:', error.message);
    
    // Return estimated rates if API fails
    res.json({
      success: true,
      mode: 'rail',
      rates: [{
        mode: 'rail',
        service_type: 'Standard Rail (Estimated)',
        origin: req.body.origin || 'Unknown',
        destination: req.body.destination || 'Unknown',
        cost: 2500,
        currency: 'USD',
        transit_time: '7-14 days',
        available_capacity: 100,
        container_types: ['20GP', '40GP', '40HC'],
        provider: 'SeaRates Rail Network',
        note: 'Estimated rates - API unavailable'
      }],
      timestamp: new Date().toISOString(),
      error: error.message
    });
  }
});

/**
 * Get Truck Rates from SeaRates API
 * Handles both FTL (Full Truck Load) and LTL (Less Than Truck Load)
 */
export const getTruckRates = onRequest({
  cors: true,
  timeoutSeconds: 60,
  memory: "256MiB"
}, async (req: Request, res: Response) => {
  try {
    console.log('[SeaRates Truck] Request received:', req.body);
    
    const { 
      origin, 
      destination, 
      service_type, 
      weight, 
      volume,
      cargo_type 
    } = req.body;
    
    if (!origin || !destination) {
      res.status(400).json({ 
        error: 'Missing required parameters',
        required: ['origin', 'destination']
      });
      return;
    }

    // Determine if FTL or LTL
    const isFTL = service_type?.toLowerCase() === 'ftl' || (weight && weight >= 15000);
    const service = isFTL ? 'FTL' : 'LTL';

    // Call SeaRates Truck API
    const response = await axios.post(
      `${SEARATES_BASE_URL}/truck/rates`,
      {
        origin,
        destination,
        service_type: service,
        weight: weight || 0,
        volume: volume || 0,
        cargo_type: cargo_type || 'general',
        currency: 'USD'
      },
      {
        headers: {
          'Authorization': `Bearer ${SEARATES_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    console.log('[SeaRates Truck] API response received');
    
    // Transform response to standard format
    const rates = response.data.rates?.map((rate: any) => ({
      mode: 'truck',
      service_type: rate.service_type || service,
      origin: rate.origin,
      destination: rate.destination,
      cost: parseFloat(rate.total_cost) || 0,
      currency: rate.currency || 'USD',
      transit_time: rate.transit_time || '1-5 days',
      available_capacity: rate.available_capacity || 100,
      truck_types: rate.truck_types || ['Dry Van', 'Flatbed', 'Refrigerated'],
      provider: rate.provider || 'SeaRates Truck Network',
      ftl: isFTL,
      ltl: !isFTL
    })) || [];

    res.json({
      success: true,
      mode: 'truck',
      service_type: service,
      rates: rates,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('[SeaRates Truck] Error:', error.message);
    
    // Return estimated rates if API fails
    const isFTL = req.body.service_type?.toLowerCase() === 'ftl' || (req.body.weight && req.body.weight >= 15000);
    const estimatedCost = isFTL ? 3500 : 800;
    
    res.json({
      success: true,
      mode: 'truck',
      service_type: isFTL ? 'FTL' : 'LTL',
      rates: [{
        mode: 'truck',
        service_type: `${isFTL ? 'FTL' : 'LTL'} (Estimated)`,
        origin: req.body.origin || 'Unknown',
        destination: req.body.destination || 'Unknown',
        cost: estimatedCost,
        currency: 'USD',
        transit_time: '1-5 days',
        available_capacity: 100,
        truck_types: ['Dry Van', 'Flatbed', 'Refrigerated'],
        provider: 'SeaRates Truck Network',
        ftl: isFTL,
        ltl: !isFTL,
        note: 'Estimated rates - API unavailable'
      }],
      timestamp: new Date().toISOString(),
      error: error.message
    });
  }
});

/**
 * Get combined land transport rates (both rail and truck)
 * Useful for comparing all land transport options
 */
export const getLandTransportRates = onRequest({
  cors: true,
  timeoutSeconds: 60,
  memory: "256MiB"
}, async (req: Request, res: Response) => {
  try {
    console.log('[SeaRates Land] Combined land transport request:', req.body);
    
    const { origin, destination } = req.body;
    
    if (!origin || !destination) {
      res.status(400).json({ 
        error: 'Missing required parameters',
        required: ['origin', 'destination']
      });
      return;
    }

    // Get both rail and truck rates
    const [railRates, truckRates] = await Promise.all([
      // Simulate rail API call
      axios.post(
        `${SEARATES_BASE_URL}/rail/rates`,
        { origin, destination, currency: 'USD' },
        {
          headers: {
            'Authorization': `Bearer ${SEARATES_API_KEY}`,
            'Content-Type': 'application/json'
          }
        }
      ).catch(err => {
        console.warn('[SeaRates Land] Rail API failed, using estimates');
        return { data: { rates: [] } };
      }),
      
      // Simulate truck API call
      axios.post(
        `${SEARATES_BASE_URL}/truck/rates`,
        { origin, destination, currency: 'USD' },
        {
          headers: {
            'Authorization': `Bearer ${SEARATES_API_KEY}`,
            'Content-Type': 'application/json'
          }
        }
      ).catch(err => {
        console.warn('[SeaRates Land] Truck API failed, using estimates');
        return { data: { rates: [] } };
      })
    ]);

    // Combine and format all rates
    const allRates = [
      ...(railRates.data.rates || []).map((rate: any) => ({
        mode: 'rail',
        service_type: rate.service_type || 'Standard Rail',
        cost: parseFloat(rate.total_cost) || 2500,
        currency: rate.currency || 'USD',
        transit_time: rate.transit_time || '7-14 days',
        provider: rate.provider || 'SeaRates Rail Network'
      })),
      ...(truckRates.data.rates || []).map((rate: any) => ({
        mode: 'truck',
        service_type: rate.service_type || 'Standard Truck',
        cost: parseFloat(rate.total_cost) || 1500,
        currency: rate.currency || 'USD',
        transit_time: rate.transit_time || '1-5 days',
        provider: rate.provider || 'SeaRates Truck Network'
      }))
    ];

    // Add estimated rates if APIs returned no data
    if (allRates.length === 0) {
      allRates.push(
        {
          mode: 'rail',
          service_type: 'Standard Rail (Estimated)',
          cost: 2500,
          currency: 'USD',
          transit_time: '7-14 days',
          provider: 'SeaRates Rail Network',
          note: 'Estimated rates'
        },
        {
          mode: 'truck',
          service_type: 'FTL Truck (Estimated)',
          cost: 3500,
          currency: 'USD',
          transit_time: '1-5 days',
          provider: 'SeaRates Truck Network',
          note: 'Estimated rates'
        }
      );
    }

    res.json({
      success: true,
      origin,
      destination,
      rates: allRates,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('[SeaRates Land] Error:', error.message);
    
    res.json({
      success: true,
      origin: req.body.origin || 'Unknown',
      destination: req.body.destination || 'Unknown',
      rates: [
        {
          mode: 'rail',
          service_type: 'Standard Rail (Estimated)',
          cost: 2500,
          currency: 'USD',
          transit_time: '7-14 days',
          provider: 'SeaRates Rail Network',
          note: 'API error - estimated rates'
        },
        {
          mode: 'truck',
          service_type: 'FTL Truck (Estimated)',
          cost: 3500,
          currency: 'USD',
          transit_time: '1-5 days',
          provider: 'SeaRates Truck Network',
          note: 'API error - estimated rates'
        }
      ],
      timestamp: new Date().toISOString(),
      error: error.message
    });
  }
});