import { fetchOredStock } from '../oredFetch';

const MAESTRA_ORED_ID = 14;

export function fetchMaestraStock() {
  return fetchOredStock(MAESTRA_ORED_ID);
}
