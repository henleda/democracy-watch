import * as cdk from 'aws-cdk-lib';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';
import { EnvironmentConfig } from '../config';

export interface ApiStackProps extends cdk.StackProps {
  readonly config: EnvironmentConfig;
  readonly vpc: ec2.IVpc;
  readonly lambdaSecurityGroup: ec2.ISecurityGroup;
  readonly databaseSecretArn: string;
}

export class ApiStack extends cdk.Stack {
  public readonly api: apigateway.RestApi;
  public readonly membersHandler: lambda.Function;

  constructor(scope: Construct, id: string, props: ApiStackProps) {
    super(scope, id, props);

    const { config, vpc, lambdaSecurityGroup, databaseSecretArn } = props;

    // Lambda execution role with database access
    const lambdaRole = new iam.Role(this, 'ApiLambdaRole', {
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaVPCAccessExecutionRole'),
      ],
    });

    // Allow reading database secret
    lambdaRole.addToPolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: ['secretsmanager:GetSecretValue'],
      resources: [databaseSecretArn],
    }));

    // Members API Lambda handler
    this.membersHandler = new lambda.Function(this, 'MembersHandler', {
      functionName: `democracy-watch-members-${config.envName}`,
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'members.handler',
      code: lambda.Code.fromAsset('../api/dist', {
        exclude: ['*.ts', '*.map'],
      }),
      memorySize: 512,
      timeout: cdk.Duration.seconds(30),
      vpc,
      vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
      securityGroups: [lambdaSecurityGroup],
      role: lambdaRole,
      environment: {
        NODE_ENV: config.envName,
        DATABASE_SECRET_ARN: databaseSecretArn,
      },
    });

    // REST API
    this.api = new apigateway.RestApi(this, 'DemocracyWatchApi', {
      restApiName: `democracy-watch-api-${config.envName}`,
      description: 'Democracy Watch REST API',
      deployOptions: {
        stageName: 'v1',
        throttlingBurstLimit: 100,
        throttlingRateLimit: 50,
      },
      defaultCorsPreflightOptions: {
        allowOrigins: [
          'https://democracy.watch',
          'https://dev.democracy.watch',
          'http://localhost:3000',
        ],
        allowMethods: ['GET', 'OPTIONS'],
        allowHeaders: [
          'Content-Type',
          'Authorization',
          'X-Amz-Date',
          'X-Api-Key',
        ],
        allowCredentials: true,
      },
    });

    // Lambda integration
    const membersIntegration = new apigateway.LambdaIntegration(this.membersHandler, {
      requestTemplates: { 'application/json': '{ "statusCode": "200" }' },
    });

    // API Routes

    // GET /health - health check endpoint
    const health = this.api.root.addResource('health');
    health.addMethod('GET', membersIntegration);

    const members = this.api.root.addResource('members');

    // GET /members - list all members
    members.addMethod('GET', membersIntegration);

    // GET /members/{memberId} - get member by ID
    const memberById = members.addResource('{memberId}');
    memberById.addMethod('GET', membersIntegration);

    // GET /members/{memberId}/votes - get member's votes
    const memberVotes = memberById.addResource('votes');
    memberVotes.addMethod('GET', membersIntegration);

    // GET /members/by-zip/{zipCode} - get reps by zip
    const byZip = members.addResource('by-zip');
    const byZipCode = byZip.addResource('{zipCode}');
    byZipCode.addMethod('GET', membersIntegration);

    // Outputs
    new cdk.CfnOutput(this, 'ApiEndpoint', {
      value: this.api.url,
      exportName: `${config.envName}-ApiEndpoint`,
    });

    new cdk.CfnOutput(this, 'ApiId', {
      value: this.api.restApiId,
      exportName: `${config.envName}-ApiId`,
    });
  }
}
