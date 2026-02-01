import * as cdk from 'aws-cdk-lib';
import * as s3 from 'aws-cdk-lib/aws-s3';
import { Construct } from 'constructs';
import { EnvironmentConfig } from '../config';

export interface StorageStackProps extends cdk.StackProps {
  readonly config: EnvironmentConfig;
}

export class StorageStack extends cdk.Stack {
  public readonly rawDataBucket: s3.IBucket;
  public readonly transcriptsBucket: s3.IBucket;

  constructor(scope: Construct, id: string, props: StorageStackProps) {
    super(scope, id, props);

    const { config } = props;

    // Bucket for raw data from external APIs
    this.rawDataBucket = new s3.Bucket(this, 'RawDataBucket', {
      bucketName: `democracy-watch-raw-${config.envName}-${this.account}`,
      encryption: s3.BucketEncryption.S3_MANAGED,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      versioned: true,
      intelligentTieringConfigurations: [
        {
          name: 'archive-old-data',
          archiveAccessTierTime: cdk.Duration.days(90),
          deepArchiveAccessTierTime: cdk.Duration.days(180),
        },
      ],
      lifecycleRules: [
        {
          id: 'delete-incomplete-uploads',
          abortIncompleteMultipartUploadAfter: cdk.Duration.days(7),
        },
      ],
      removalPolicy: config.envName === 'prod'
        ? cdk.RemovalPolicy.RETAIN
        : cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: config.envName !== 'prod',
    });

    // Bucket for transcripts and media processing
    this.transcriptsBucket = new s3.Bucket(this, 'TranscriptsBucket', {
      bucketName: `democracy-watch-transcripts-${config.envName}-${this.account}`,
      encryption: s3.BucketEncryption.S3_MANAGED,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      versioned: false,
      lifecycleRules: [
        {
          id: 'transition-to-ia',
          transitions: [
            {
              storageClass: s3.StorageClass.INFREQUENT_ACCESS,
              transitionAfter: cdk.Duration.days(30),
            },
          ],
        },
      ],
      removalPolicy: config.envName === 'prod'
        ? cdk.RemovalPolicy.RETAIN
        : cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: config.envName !== 'prod',
    });

    // Outputs
    new cdk.CfnOutput(this, 'RawDataBucketName', {
      value: this.rawDataBucket.bucketName,
      exportName: `${config.envName}-RawDataBucket`,
    });

    new cdk.CfnOutput(this, 'TranscriptsBucketName', {
      value: this.transcriptsBucket.bucketName,
      exportName: `${config.envName}-TranscriptsBucket`,
    });
  }
}
