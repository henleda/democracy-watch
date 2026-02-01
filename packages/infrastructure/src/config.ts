export interface EnvironmentConfig {
  readonly envName: string;
  readonly account: string;
  readonly region: string;
  readonly domain: string;
  readonly aurora: {
    readonly minCapacity: number;
    readonly maxCapacity: number;
  };
}

export const environments: Record<string, EnvironmentConfig> = {
  dev: {
    envName: 'dev',
    account: process.env.CDK_DEFAULT_ACCOUNT || '',
    region: process.env.CDK_DEFAULT_REGION || 'us-east-1',
    domain: 'dev.democracy.watch',
    aurora: {
      minCapacity: 0.5,
      maxCapacity: 2,
    },
  },
  prod: {
    envName: 'prod',
    account: process.env.CDK_DEFAULT_ACCOUNT || '',
    region: process.env.CDK_DEFAULT_REGION || 'us-east-1',
    domain: 'democracy.watch',
    aurora: {
      minCapacity: 0.5,
      maxCapacity: 8,
    },
  },
};

export function getConfig(envName: string = 'dev'): EnvironmentConfig {
  const config = environments[envName];
  if (!config) {
    throw new Error(`Unknown environment: ${envName}`);
  }
  return config;
}
