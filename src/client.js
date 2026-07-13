import axios from 'axios';
import { SCREEPS_SERVER, getAuth } from './config.js';

let auth;
try {
  auth = getAuth();
} catch {
  // Keep module imports (and local validation) usable without credentials.
  // The request interceptor below returns the same actionable auth error on use.
  auth = null;
}

const config = {
  baseURL: SCREEPS_SERVER,
  headers: {
    'Content-Type': 'application/json',
  },
};

if (auth?.method === 'token') {
  config.headers['X-Token'] = auth.token;
} else if (auth?.method === 'basic') {
  config.auth = {
    username: auth.username,
    password: auth.password,
  };
}

export const client = axios.create(config);

client.interceptors.request.use((request) => {
  if (!auth) getAuth();
  return request;
});
