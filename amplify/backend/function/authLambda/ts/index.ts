import awsServerlessExpress from "aws-serverless-express";
import type { APIGatewayProxyHandler } from "aws-lambda";
import type { Server } from "http";
import app from "./app"; // 👈 make sure app.ts uses `export default app;`

// Create the server
const server: Server = awsServerlessExpress.createServer(app);

// Lambda handler
export const handler: APIGatewayProxyHandler = (event, context) => {
  console.log(`EVENT: ${JSON.stringify(event)}`);
  return awsServerlessExpress.proxy(server, event, context, "PROMISE").promise;
};
