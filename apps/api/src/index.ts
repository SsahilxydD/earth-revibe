import { app } from "./app";
import { env } from "./config/env";

const start = async () => {
  try {
    app.listen(env.PORT, "0.0.0.0", () => {
      console.log(`Earth Revibe API running on port ${env.PORT}`);
      console.log(`  Environment: ${env.NODE_ENV}`);
      console.log(`  Health check: http://localhost:${env.PORT}/api/v1/health`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
};

start();
