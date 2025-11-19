// Microsoft SSO Integration (Disabled by default)
// To enable:
// 1. Uncomment the environment variables in .env
// 2. Install @azure/msal-node and @azure/msal-browser
// 3. Uncomment and configure the functions below

/*
import { ConfidentialClientApplication } from '@azure/msal-node'

const msalConfig = {
  auth: {
    clientId: process.env.MICROSOFT_CLIENT_ID!,
    authority: `https://login.microsoftonline.com/${process.env.MICROSOFT_TENANT_ID}`,
    clientSecret: process.env.MICROSOFT_CLIENT_SECRET!,
  },
}

export async function getMicrosoftAuthUrl(redirectUri: string): Promise<string> {
  const pca = new ConfidentialClientApplication(msalConfig)
  const authCodeUrlParameters = {
    scopes: ['User.Read'],
    redirectUri,
  }
  
  const response = await pca.getAuthCodeUrl(authCodeUrlParameters)
  return response
}

export async function acquireTokenByCode(code: string, redirectUri: string) {
  const pca = new ConfidentialClientApplication(msalConfig)
  const tokenRequest = {
    code,
    scopes: ['User.Read'],
    redirectUri,
  }
  
  const response = await pca.acquireTokenByCode(tokenRequest)
  return response
}
*/

export {} // Placeholder export to make this a module

