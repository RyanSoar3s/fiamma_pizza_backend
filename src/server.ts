import { app } from './app.js';
import { env } from './config/env.js';
import { ensureSchema } from './database/db.js';

async function sleep(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function ensureSchemaWithRetry(retries = 10, delayMs = 2000) {
  for (let attempt = 1; attempt <= retries; attempt += 1) {
    try {
      await ensureSchema();
      return;
    } catch (error) {
      if (attempt === retries) {
        throw error;
      }

      console.log(
        `Database not ready (attempt ${attempt}/${retries}). Retrying in ${delayMs}ms...`,
      );
      await sleep(delayMs);
    }
  }
}

async function bootstrap() {
  await ensureSchemaWithRetry();

  app.listen(env.port, () => {
    console.log(`Server running on port ${env.port}`);
  
  });

}

bootstrap().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);

});
