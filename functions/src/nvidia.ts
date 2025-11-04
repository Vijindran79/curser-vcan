// NVIDIA API Integration
// Uses NVIDIA API for AI-powered features where appropriate

import * as functions from 'firebase-functions';

const NVIDIA_API_KEY = functions.config().nvidia?.api_key || process.env.NVIDIA_API_KEY || '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';
const NVIDIA_BASE_URL = 'https://api.nvidia.com/v1';

/**
 * Call NVIDIA API for AI features
 * Can be used for advanced AI tasks beyond Gemini
 */
export async function callNvidiaAPI(endpoint: string, payload: any): Promise<any> {
    try {
        const response = await fetch(`${NVIDIA_BASE_URL}${endpoint}`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${NVIDIA_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });
        
        if (!response.ok) {
            throw new Error(`NVIDIA API error: ${response.statusText}`);
        }
        
        return await response.json();
    } catch (error) {
        console.error('NVIDIA API error:', error);
        throw error;
    }
}





