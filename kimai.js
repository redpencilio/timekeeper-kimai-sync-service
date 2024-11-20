import { URLSearchParams } from "url";
import { API_TOKEN, KIMAI_ENDPOINT } from "./constants";

export async function getDataOfType(type, filters = {}) {
  const filterParamsString = new URLSearchParams(filters);
  const authorization = `Bearer ${API_TOKEN}`;
  const projectsFetch = await fetch(`${KIMAI_ENDPOINT}/${type}${filterParamsString ? `?${filterParamsString}`: ""}`, {
    method: "GET",
    headers: { Authorization: authorization, accept: "application/json" },
  });
  return await projectsFetch.json();
}