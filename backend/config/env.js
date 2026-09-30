// Centralised environment variable access.
// Import this instead of using process.env directly in services.

export const env = {
  nodeEnv:    process.env.NODE_ENV || 'development',
  port:       parseInt(process.env.PORT, 10) || 3000,
  databaseUrl: process.env.DATABASE_URL,

  jwt: {
    secret:    process.env.JWT_SECRET,
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },

  azure: {
    endpoint:    process.env.AZURE_OPENAI_ENDPOINT,
    apiKey:      process.env.AZURE_OPENAI_API_KEY,
    deployment:  process.env.AZURE_OPENAI_DEPLOYMENT || 'gpt-5-4',
    apiVersion:  process.env.AZURE_OPENAI_API_VERSION || '2024-02-01',
  },
};
