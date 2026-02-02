import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as events from 'aws-cdk-lib/aws-events';
import * as targets from 'aws-cdk-lib/aws-events-targets';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import { Construct } from 'constructs';
import { EnvironmentConfig } from '../config';

export interface IngestionStackProps extends cdk.StackProps {
  readonly config: EnvironmentConfig;
  readonly vpc: ec2.IVpc;
  readonly lambdaSecurityGroup: ec2.ISecurityGroup;
  readonly databaseSecretArn: string;
  readonly congressApiKeySecret: secretsmanager.ISecret;
  readonly rawDataBucket: s3.IBucket;
}

export class IngestionStack extends cdk.Stack {
  public readonly ingestCongressHandler: lambda.Function;
  public readonly migrateHandler: lambda.Function;

  constructor(scope: Construct, id: string, props: IngestionStackProps) {
    super(scope, id, props);

    const {
      config,
      vpc,
      lambdaSecurityGroup,
      databaseSecretArn,
      congressApiKeySecret,
      rawDataBucket,
    } = props;

    // Dead Letter Queue for failed ingestion attempts
    const dlq = new sqs.Queue(this, 'IngestionDLQ', {
      queueName: `democracy-watch-ingestion-dlq-${config.envName}`,
      retentionPeriod: cdk.Duration.days(14),
    });

    // Lambda execution role
    const lambdaRole = new iam.Role(this, 'IngestionLambdaRole', {
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaVPCAccessExecutionRole'),
      ],
    });

    // Allow reading secrets
    lambdaRole.addToPolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: ['secretsmanager:GetSecretValue'],
      resources: [databaseSecretArn, congressApiKeySecret.secretArn],
    }));

    // Allow writing to S3 bucket
    rawDataBucket.grantReadWrite(lambdaRole);

    // Allow sending to DLQ
    dlq.grantSendMessages(lambdaRole);

    // Congress.gov ingestion Lambda
    this.ingestCongressHandler = new lambda.Function(this, 'IngestCongressHandler', {
      functionName: `democracy-watch-ingest-congress-${config.envName}`,
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'ingest-congress.handler',
      code: lambda.Code.fromAsset('../ingestion/dist', {
        exclude: ['*.ts', '*.map'],
      }),
      memorySize: 1024,
      timeout: cdk.Duration.minutes(15),
      vpc,
      vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
      securityGroups: [lambdaSecurityGroup],
      role: lambdaRole,
      environment: {
        NODE_ENV: config.envName,
        DATABASE_SECRET_ARN: databaseSecretArn,
        CONGRESS_API_KEY_ARN: congressApiKeySecret.secretArn,
        RAW_DATA_BUCKET: rawDataBucket.bucketName,
        DLQ_URL: dlq.queueUrl,
      },
      deadLetterQueue: dlq,
      retryAttempts: 2,
    });

    // EventBridge rule - run every 4 hours
    const schedule = new events.Rule(this, 'CongressIngestionSchedule', {
      ruleName: `democracy-watch-congress-sync-${config.envName}`,
      description: 'Sync Congress.gov data every 4 hours',
      schedule: events.Schedule.rate(cdk.Duration.hours(4)),
      enabled: config.envName === 'prod', // Only enabled in prod
    });

    schedule.addTarget(new targets.LambdaFunction(this.ingestCongressHandler, {
      event: events.RuleTargetInput.fromObject({
        mode: 'incremental',
        source: 'scheduled',
      }),
    }));

    // Database migration Lambda
    this.migrateHandler = new lambda.Function(this, 'MigrateHandler', {
      functionName: `democracy-watch-migrate-${config.envName}`,
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'migrate-handler.handler',
      code: lambda.Code.fromAsset('../database/dist', {
        exclude: ['*.ts', '*.map'],
      }),
      memorySize: 512,
      timeout: cdk.Duration.minutes(5),
      vpc,
      vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
      securityGroups: [lambdaSecurityGroup],
      role: lambdaRole,
      environment: {
        NODE_ENV: config.envName,
        DATABASE_SECRET_ARN: databaseSecretArn,
      },
    });

    // Outputs
    new cdk.CfnOutput(this, 'IngestCongressFunctionArn', {
      value: this.ingestCongressHandler.functionArn,
      exportName: `${config.envName}-IngestCongressFunctionArn`,
    });

    new cdk.CfnOutput(this, 'IngestionDLQUrl', {
      value: dlq.queueUrl,
      exportName: `${config.envName}-IngestionDLQUrl`,
    });

    new cdk.CfnOutput(this, 'MigrateFunctionArn', {
      value: this.migrateHandler.functionArn,
      exportName: `${config.envName}-MigrateFunctionArn`,
    });
  }
}
