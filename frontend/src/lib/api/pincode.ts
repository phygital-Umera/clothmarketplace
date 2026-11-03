import axios from 'axios';
import {PincodeDetails} from '@/types/company';

// India Post public API (free, no key, allows browser calls)
const PINCODE_API = 'https://api.postalpincode.in/pincode';

type PostOffice = {
  Name: string;
  Block: string;
  District: string;
  State: string;
  Country: string;
};
type IndiaPostResponse = {Status: string; PostOffice: PostOffice[] | null}[];

const clean = (value?: string) => (value && value !== 'NA' ? value.trim() : '');

/** The value that appears most often, e.g. the main block of a pincode */
const mostCommon = (values: string[]) => {
  const counts = new Map<string, number>();
  values.forEach((v) => counts.set(v, (counts.get(v) ?? 0) + 1));
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? '';
};

export class PincodeNotFoundError extends Error {}

/** State / district / city for a 6-digit Indian pincode */
export const lookupPincode = async (
  pincode: string,
): Promise<PincodeDetails> => {
  const res = await axios.get<IndiaPostResponse>(`${PINCODE_API}/${pincode}`, {
    timeout: 8000,
  });
  const offices =
    res.data?.[0]?.Status === 'Success' ? res.data[0].PostOffice : null;
  if (!offices?.length) {
    throw new PincodeNotFoundError(`No location found for pincode ${pincode}`);
  }

  const district = mostCommon(offices.map((o) => clean(o.District)));
  return {
    pincode,
    state: mostCommon(offices.map((o) => clean(o.State))),
    district,
    // Block is the town / taluka; a pincode can span two, take the main one
    city:
      mostCommon(offices.map((o) => clean(o.Block)).filter(Boolean)) ||
      district,
    country: 'India',
  };
};
