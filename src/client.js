import axios from 'axios';
import { SCREEPS_SERVER, getAuth } from './config.js';

const auth = getAuth();

const config = {
  baseURL: SCREEPS_SERVER,
  headers: {
    'Content-Type': 'application/json',
  },
};

if (auth.method === 'token') {
  config.headers['X-Token'] = auth.token;
} else {
  config.auth = {
    username: auth.username,
    password: auth.password,
  };
}

export const client = axios.create(config);
