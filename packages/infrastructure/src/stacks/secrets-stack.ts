import * as cdk from 'aws-cdk-lib';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import { Construct } from 'constructs';
import { EnvironmentConfig } from '../config';

export interface SecretsStackProps extends cdk.StackProps {
  readonly config: EnvironmentConfig;
}

export class SecretsStack extends cdk.Stack {
  public readonly congressApiKeySecret: secretsmanager.ISecret;
  public readonly fecApiKeySecret: secretsmanager.ISecret;
  public readonly openSecretsApiKeySecret: secretsmanager.ISecret;

  constructor(scope: Construct, id: string, props: SecretsStackProps) {
    super(scope, id, props);

    const { config } = props;

    // Congress.gov API key
    this.congressApiKeySecret = new secretsmanager.Secret(this, 'CongressApiKey', {
      secretName: `democracy-watch/${config.envName}/congress-api-key`,
      description: 'API key for Congress.gov API',
    });

    // FEC OpenFEC API key
    this.fecApiKeySecret = new secretsmanager.Secret(this, 'FecApiKey', {
      secretName: `democracy-watch/${config.envName}/fec-api-key`,
      description: 'API key for FEC OpenFEC API',
    });

    // OpenSecrets API key
    this.openSecretsApiKeySecret = new secretsmanager.Secret(this, 'OpenSecretsApiKey', {
      secretName: `democracy-watch/${config.envName}/opensecrets-api-key`,
      description: 'API key for OpenSecrets API',
    });

    // Outputs
    new cdk.CfnOutput(this, 'CongressApiKeyArn', {
      value: this.congressApiKeySecret.secretArn,
      exportName: `${config.envName}-CongressApiKeyArn`,
    });

    new cdk.CfnOutput(this, 'FecApiKeyArn', {
      value: this.fecApiKeySecret.secretArn,
      exportName: `${config.envName}-FecApiKeyArn`,
    });

    new cdk.CfnOutput(this, 'OpenSecretsApiKeyArn', {
      value: this.openSecretsApiKeySecret.secretArn,
      exportName: `${config.envName}-OpenSecretsApiKeyArn`,
    });
  }
}
