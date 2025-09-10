import express, { Request, Response, NextFunction } from "express";
import bodyParser from "body-parser";
import awsServerlessExpressMiddleware from "aws-serverless-express/middleware";
import {
  CognitoIdentityProviderClient,
  SignUpCommand,
  ConfirmSignUpCommand,
  InitiateAuthCommand,
  ResendConfirmationCodeCommand,
  GetUserCommand,
} from "@aws-sdk/client-cognito-identity-provider";

const client = new CognitoIdentityProviderClient({
  region: process.env.REGION,
});

const COGNITO_CLIENT_ID = process.env.COGNITO_CLIENT_ID || "";

// declare a new express app
const app = express();
app.use(bodyParser.json());
app.use(awsServerlessExpressMiddleware.eventContext());

// Enable CORS for all methods
app.use((req: Request, res: Response, next: NextFunction) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "*");
  next();
});

app.get("/", (req: Request, res: Response) => {
  res.json({ success: `Server is healthy!!!`, url: req.url });
});

app.post("/signup", async (req: Request, res: Response) => {
  const { email, password, firstName, lastName } = req.body;

  try {
    const command = new SignUpCommand({
      ClientId: COGNITO_CLIENT_ID,
      Username: email,
      Password: password,
      UserAttributes: [
        { Name: "email", Value: email },
        { Name: "given_name", Value: firstName },
        { Name: "family_name", Value: lastName },
      ],
    });

    const response = await client.send(command);
    res.status(200).json({ message: "User signed up", response });
  } catch (error: any) {
    console.error("Signup error:", error);
    res.status(400).json({ error: error.message });
  }
});

app.post("/confirm-user", async (req: Request, res: Response) => {
  const { email, code } = req.body;

  try {
    const command = new ConfirmSignUpCommand({
      ClientId: COGNITO_CLIENT_ID,
      Username: email,
      ConfirmationCode: code,
    });

    await client.send(command);
    res.json({ message: "User confirmed successfully" });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.post("/login", async (req: Request, res: Response) => {
  const { email, password } = req.body;

  try {
    const command = new InitiateAuthCommand({
      AuthFlow: "USER_PASSWORD_AUTH",
      ClientId: COGNITO_CLIENT_ID,
      AuthParameters: {
        USERNAME: email,
        PASSWORD: password,
      },
    });

    const response = await client.send(command);
    const tokens = response.AuthenticationResult;

    if (!tokens?.AccessToken) {
      throw new Error("Login failed: missing access token");
    }

    const getUserCommand = new GetUserCommand({
      AccessToken: tokens.AccessToken,
    });

    const userResponse = await client.send(getUserCommand);

    const attributes: Record<string, string> = {};
    userResponse.UserAttributes?.forEach((attr) => {
      if (attr.Name && attr.Value) {
        attributes[attr.Name] = attr.Value;
      }
    });

    res.json({
      message: "Login successful",
      tokens,
      user: attributes,
    });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.post("/resend", async (req: Request, res: Response) => {
  const { email } = req.body;

  try {
    const command = new ResendConfirmationCodeCommand({
      ClientId: COGNITO_CLIENT_ID,
      Username: email,
    });

    await client.send(command);
    res.json({ message: "Confirmation code resent successfully" });
  } catch (err: any) {
    console.error(err);
    res.status(400).json({ error: err.message });
  }
});

// Local dev mode (only runs outside AWS Lambda)
if (process.env.NODE_ENV !== "lambda") {
  app.listen(3000, () => {
    console.log("App started on http://localhost:3000");
  });
}

export default app;
