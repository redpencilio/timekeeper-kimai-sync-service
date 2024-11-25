import { URLSearchParams } from 'url';
import { API_TOKEN, KIMAI_ENDPOINT } from './constants';

const authorizationHeader = `Bearer ${API_TOKEN}`;
const headers = { Authorization: authorizationHeader, accept: 'application/json' };

async function fetchPage(type, page = 0, size = 50, filters = {}) {
  const endpoint = new URL(`${KIMAI_ENDPOINT}/${type}`);
  endpoint.search = new URLSearchParams(Object.assign({ page, size }, filters));
  console.log(`Fetch page ${endpoint.href}`);
  const response = await fetch(endpoint, { headers });

  if (response.ok) {
    return await response.json();
  } else {
    throw new Error(`Failed to fetch page ${page} with size ${size} for type '${type}'.
 Response status: ${response.status}.
 Response body: ${await response.text()}` );
  }
}

export async function fetchList(type) {
  const size = 999; // TODO decrease once pagination is supported by Kimai API
  let pageNumber = 0;
  let isLastPage = false;
  let list = [];

  while (!isLastPage) {
    const page = await fetchPage(type, pageNumber, size);
    isLastPage = page.length < size;
    list = [...list, ...page];
    pageNumber++;
  };

  return list;
}
