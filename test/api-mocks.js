import fetchMock from 'fetch-mock';

// Allow re-mocking the same URL across tests; fetch-mock@7 alpha's restore()
// interacts awkwardly with regex matchers otherwise.
fetchMock.config.overwriteRoutes = true;

// Build the fetch-mock response. <300 returns the body; >=300 returns just
// the status code (which fetch-mock expands to { status, body: '' }), so
// xhr's `if(res.status >= 300) throw res` rejects and the action's .catch
// fires — same code path real network failures hit.
const respond = (httpStatus, body) =>
  httpStatus < 300 ? body : httpStatus;

// All helpers below model a single endpoint. `httpStatus` defaults to the
// usual success code; pass any non-2xx value to drive the failure path.
// The body-shaping params (entries, id, etc.) are ignored when httpStatus
// indicates failure.

export const mockGetAllEntries = ({ entries = [], timestamp = Date.now(), httpStatus = 200 } = {}) =>
  fetchMock.get('/api/entries', respond(httpStatus, { timestamp, entries }));

export const mockSyncEntries = ({ entries = [], timestamp = Date.now(), httpStatus = 200 } = {}) =>
  fetchMock.get(/\/api\/entries\/sync\//, respond(httpStatus, { entries, timestamp }));

export const mockCreateEntry = ({ id = 1, httpStatus = 200 } = {}) =>
  fetchMock.post('/api/entry', respond(httpStatus, { id }));

export const mockUpdateEntry = (id, { httpStatus = 204 } = {}) =>
  fetchMock.patch('/api/entry/' + id, httpStatus);

export const mockDeleteEntry = (id, { httpStatus = 204 } = {}) =>
  fetchMock.delete('/api/entry/' + id, httpStatus);

export const mockLogin = ({ id = 99, username = 'alice', httpStatus = 200 } = {}) =>
  fetchMock.post('/api/user/login', respond(httpStatus, { id, username }));

export const mockCreateAccount = ({ id = 99, username = 'alice', httpStatus = 200 } = {}) =>
  fetchMock.post('/api/user', respond(httpStatus, { id, username }));

export const mockLogout = ({ httpStatus = 204 } = {}) =>
  fetchMock.post('/api/user/logout', httpStatus);

// Simulates "no network": every /api/entr* call rejects with the same shape
// fetch produces in airplane mode. Boot GETs and mutation POST/PATCH/DELETEs
// all hit the action .catch and leave needsSync set.
export const mockEntryApiOffline = () =>
  fetchMock.mock(/\/api\/entr/, { throws: new TypeError('Failed to fetch') });

export const lastBody = (url) => JSON.parse(fetchMock.lastOptions(url).body);
