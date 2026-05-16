import dotenv from 'dotenv';

dotenv.config();

const { ORIGIN = null, NODE_ENV = 'development', PORT = '3000', DATABASE_URL } = process.env;
const { MP_ACCESS_TOKEN = '' } = process.env;

if (!DATABASE_URL) {
  throw new Error("DATABASE_URL not defined in environment.");

}

export const env = {
  ORIGIN,
  nodeEnv: NODE_ENV,
  port: Number(PORT),
  databaseUrl: DATABASE_URL,
  mpAccessToken: MP_ACCESS_TOKEN

};
