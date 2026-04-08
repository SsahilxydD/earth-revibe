import type { Request, Response } from 'express';
import { addressService } from '../services/address.service';
import { env } from '../config/env';
import { logger } from '../config/logger';

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
    if (!env.MAPPLS_API_KEY) {
      res.json({ success: true, data: { suggestions: [] } });
      return;
    }
    try {
      const url = `https://atlas.mappls.com/api/places/search/json?query=${encodeURIComponent(query)}&region=IND&tokenizeAddress=true`;
      const resp = await fetch(url, {
        headers: { Authorization: `Bearer ${env.MAPPLS_API_KEY}` },
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
    if (!lat || !lng || !env.MAPPLS_API_KEY) {
      res.json({ success: true, data: { address: null } });
      return;
    }
    try {
      const url = `https://apis.mappls.com/advancedmaps/v1/${env.MAPPLS_API_KEY}/rev_geocode?lat=${lat}&lng=${lng}`;
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
