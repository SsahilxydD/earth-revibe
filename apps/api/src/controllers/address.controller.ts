import type { Request, Response } from 'express';
import { addressService } from '../services/address.service';
import { env } from '../config/env';
import { logger } from '../config/logger';

// Mappls OAuth2 token cache
let mapplsToken: string | null = null;
let mapplsTokenExpiry = 0;

async function getMapplsToken(): Promise<string | null> {
  if (!env.MAPPLS_CLIENT_ID || !env.MAPPLS_CLIENT_SECRET) return null;
  if (mapplsToken && Date.now() < mapplsTokenExpiry) return mapplsToken;

  const resp = await fetch('https://outpost.mappls.com/api/security/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: env.MAPPLS_CLIENT_ID,
      client_secret: env.MAPPLS_CLIENT_SECRET,
    }),
  });
  const data: any = await resp.json();
  if (!data.access_token) return null;
  mapplsToken = data.access_token;
  mapplsTokenExpiry = Date.now() + (data.expires_in - 60) * 1000; // refresh 1 min early
  return mapplsToken;
}

export const addressController = {
  async listAddresses(req: Request, res: Response) {
    const addresses = await addressService.listAddresses(req.user!.id);
    res.json({ success: true, data: addresses });
  },

  async createAddress(req: Request, res: Response) {
    const address = await addressService.createAddress(req.user!.id, req.body);
    res.status(201).json({ success: true, data: address });
  },

  async updateAddress(req: Request, res: Response) {
    const address = await addressService.updateAddress(
      req.user!.id,
      req.params.id as string,
      req.body
    );
    res.json({ success: true, data: address });
  },

  async deleteAddress(req: Request, res: Response) {
    await addressService.deleteAddress(req.user!.id, req.params.id as string);
    res.json({ success: true, message: 'Address deleted' });
  },

  async autosuggest(req: Request, res: Response) {
    const query = req.query.query as string;
    if (!query || query.length < 3) {
      res.json({ success: true, data: { suggestions: [] } });
      return;
    }
    const token = await getMapplsToken();
    if (!token) {
      res.json({ success: true, data: { suggestions: [] } });
      return;
    }
    try {
      const url = `https://atlas.mappls.com/api/places/search/json?query=${encodeURIComponent(query)}&region=IND&tokenizeAddress=true`;
      const resp = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data: any = await resp.json();
      const suggestions = (data.suggestedLocations || []).map((s: any) => ({
        placeName: s.placeName || '',
        placeAddress: s.placeAddress || '',
        city: s.city || '',
        state: s.state || '',
        pinCode: s.pincode || s.postalCode || '',
        lat: s.latitude || '',
        lng: s.longitude || '',
      }));
      res.json({ success: true, data: { suggestions } });
    } catch (err) {
      logger.warn({ err }, 'Mappls autosuggest failed');
      res.json({ success: true, data: { suggestions: [] } });
    }
  },

  async reverseGeocode(req: Request, res: Response) {
    const lat = req.query.lat as string;
    const lng = req.query.lng as string;
    const token = await getMapplsToken();
    if (!lat || !lng || !token) {
      res.json({ success: true, data: { address: null } });
      return;
    }
    try {
      const url = `https://apis.mappls.com/advancedmaps/v1/${token}/rev_geocode?lat=${lat}&lng=${lng}`;
      const resp = await fetch(url);
      const data: any = await resp.json();
      const result = data.results?.[0];
      if (!result) {
        res.json({ success: true, data: { address: null } });
        return;
      }
      res.json({
        success: true,
        data: {
          address: {
            line1: [result.street, result.subSubLocality, result.subLocality]
              .filter(Boolean)
              .join(', '),
            city: result.city || result.district || '',
            state: result.state || '',
            pinCode: result.pincode || '',
          },
        },
      });
    } catch (err) {
      logger.warn({ err }, 'Mappls reverse geocode failed');
      res.json({ success: true, data: { address: null } });
    }
  },
};
