import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as logs from 'aws-cdk-lib/aws-logs';
import { Construct } from 'constructs';
import { EnvironmentConfig } from '../config';

export interface DatabaseStackProps extends cdk.StackProps {
  readonly config: EnvironmentConfig;
  readonly vpc: ec2.IVpc;
}

export class DatabaseStack extends cdk.Stack {
  public readonly cluster: rds.DatabaseCluster;
  public readonly clusterSecretArn: string;
  public readonly databaseSecurityGroup: ec2.ISecurityGroup;

  constructor(scope: Construct, id: string, props: DatabaseStackProps) {
    super(scope, id, props);

    const { config, vpc } = props;

    // Security group for Aurora
    this.databaseSecurityGroup = new ec2.SecurityGroup(this, 'DatabaseSG', {
      vpc,
      securityGroupName: `democracy-watch-aurora-${config.envName}`,
      description: 'Security group for Aurora PostgreSQL cluster',
      allowAllOutbound: false,
    });

    // Parameter group for PostgreSQL
    // Note: pgvector is enabled via CREATE EXTENSION after cluster creation
    const parameterGroup = new rds.ParameterGroup(this, 'ParameterGroup', {
      engine: rds.DatabaseClusterEngine.auroraPostgres({
        version: rds.AuroraPostgresEngineVersion.VER_16_4,
      }),
      parameters: {
        'shared_preload_libraries': 'pg_stat_statements',
        'log_statement': 'ddl',
        'log_min_duration_statement': '1000',
      },
    });

    // Aurora Serverless v2 cluster
    this.cluster = new rds.DatabaseCluster(this, 'AuroraCluster', {
      engine: rds.DatabaseClusterEngine.auroraPostgres({
        version: rds.AuroraPostgresEngineVersion.VER_16_4,
      }),
      clusterIdentifier: `democracy-watch-${config.envName}`,
      defaultDatabaseName: 'democracy_watch',
      parameterGroup,
      serverlessV2MinCapacity: config.aurora.minCapacity,
      serverlessV2MaxCapacity: config.aurora.maxCapacity,
      writer: rds.ClusterInstance.serverlessV2('writer', {
        publiclyAccessible: false,
        enablePerformanceInsights: true,
        performanceInsightRetention: rds.PerformanceInsightRetention.DEFAULT,
      }),
      readers: config.envName === 'prod'
        ? [
            rds.ClusterInstance.serverlessV2('reader', {
              scaleWithWriter: true,
            }),
          ]
        : [],
      vpc,
      vpcSubnets: {
        subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
      },
      securityGroups: [this.databaseSecurityGroup],
      storageEncrypted: true,
      backup: {
        retention: config.envName === 'prod'
          ? cdk.Duration.days(14)
          : cdk.Duration.days(7),
        preferredWindow: '03:00-04:00',
      },
      preferredMaintenanceWindow: 'sun:04:00-sun:05:00',
      cloudwatchLogsExports: ['postgresql'],
      cloudwatchLogsRetention: logs.RetentionDays.ONE_MONTH,
      deletionProtection: config.envName === 'prod',
      removalPolicy: config.envName === 'prod'
        ? cdk.RemovalPolicy.RETAIN
        : cdk.RemovalPolicy.DESTROY,
    });

    this.clusterSecretArn = this.cluster.secret?.secretArn || '';

    // Export security group for Lambda connections
    new cdk.CfnOutput(this, 'DatabaseSecurityGroupId', {
      value: this.databaseSecurityGroup.securityGroupId,
      exportName: `${config.envName}-DatabaseSGId`,
    });

    new cdk.CfnOutput(this, 'ClusterEndpoint', {
      value: this.cluster.clusterEndpoint.hostname,
      exportName: `${config.envName}-ClusterEndpoint`,
    });

    new cdk.CfnOutput(this, 'ClusterSecretArn', {
      value: this.clusterSecretArn,
      exportName: `${config.envName}-ClusterSecretArn`,
    });

    new cdk.CfnOutput(this, 'ClusterIdentifier', {
      value: this.cluster.clusterIdentifier,
      exportName: `${config.envName}-ClusterIdentifier`,
    });
  }
}
