import { app } from "mu";
import { updateEntitiesProperties, updateEntityRelationships } from "./sparql";
import { getDataOfType } from "./kimai";

app.get("/hello", function (req, res) {
  res.send("Hello mu-javascript-template");
});

app.post("/sync-projects", async function (req, res) {
  await syncEndpoint('projects');
  res.send("projects synced");
});

app.post("/sync-customers", async function (req, res) {
  await syncEndpoint('customers');
  res.send("customers synced");
});

// sub-projects
app.post("/sync-activities", async function (req, res) {
  await syncEndpoint('activities');
  res.send("activities synced");
});

// sync all in order
app.post("/sync-all", async function (req, res) {
  await syncEndpoint('customers');
  await syncEndpoint('projects');
  await syncEndpoint('activities');
  res.send("all synced");
});

async function syncEndpoint(type) {
  const data = await getDataOfType(type);
  await updateEntitiesProperties(type, data);
  await updateEntityRelationships(type, data);
}