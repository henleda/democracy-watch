import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as sfn from 'aws-cdk-lib/aws-stepfunctions';
import * as tasks from 'aws-cdk-lib/aws-stepfunctions-tasks';
import * as logs from 'aws-cdk-lib/aws-logs';
import { Construct } from 'constructs';
import { EnvironmentConfig } from '../config';

export interface OrchestrationStackProps extends cdk.StackProps {
  readonly config: EnvironmentConfig;
  readonly ingestCongressHandler: lambda.IFunction;
}

export class OrchestrationStack extends cdk.Stack {
  public readonly voteIngestionStateMachine: sfn.StateMachine;

  constructor(scope: Construct, id: string, props: OrchestrationStackProps) {
    super(scope, id, props);

    const { config, ingestCongressHandler } = props;

    // Roll calls per chunk - stay well under 15 min timeout
    // ~2 seconds per roll call = ~400 roll calls in 13 minutes (safe margin)
    const ROLL_CALLS_PER_CHUNK = 400;

    // Final success state
    const success = new sfn.Succeed(this, 'IngestionComplete', {
      comment: 'All data ingested successfully',
    });

    // Votes complete state (transitions to success)
    const votesComplete = new sfn.Pass(this, 'VotesComplete').next(success);

    // Step 1: Initialize - sync members if needed
    const syncMembers = new tasks.LambdaInvoke(this, 'SyncMembers', {
      lambdaFunction: ingestCongressHandler,
      payload: sfn.TaskInput.fromObject({
        mode: sfn.JsonPath.stringAt('$.mode'),
        congress: sfn.JsonPath.numberAt('$.congress'),
        skipBills: true,
        skipVotes: true,
      }),
      resultPath: '$.membersResult',
      resultSelector: {
        'statusCode.$': '$.Payload.statusCode',
        'body.$': 'States.StringToJson($.Payload.body)',
      },
    });

    // Step 2: Sync bills (optional, can run in parallel)
    const syncBills = new tasks.LambdaInvoke(this, 'SyncBills', {
      lambdaFunction: ingestCongressHandler,
      payload: sfn.TaskInput.fromObject({
        mode: sfn.JsonPath.stringAt('$.mode'),
        congress: sfn.JsonPath.numberAt('$.congress'),
        skipMembers: true,
        skipVotes: true,
      }),
      resultPath: '$.billsResult',
      resultSelector: {
        'statusCode.$': '$.Payload.statusCode',
        'body.$': 'States.StringToJson($.Payload.body)',
      },
    });

    // Step 3: Process votes chunk
    const processVotesChunk = new tasks.LambdaInvoke(this, 'ProcessVotesChunk', {
      lambdaFunction: ingestCongressHandler,
      payload: sfn.TaskInput.fromObject({
        mode: sfn.JsonPath.stringAt('$.mode'),
        congress: sfn.JsonPath.numberAt('$.congress'),
        skipMembers: true,
        skipBills: true,
        voteStartOffset: sfn.JsonPath.numberAt('$.voteOffset'),
        voteMaxRollCalls: ROLL_CALLS_PER_CHUNK,
      }),
      resultPath: '$.chunkResult',
      resultSelector: {
        'statusCode.$': '$.Payload.statusCode',
        'body.$': 'States.StringToJson($.Payload.body)',
      },
    });

    // Update state with chunk results
    const updateChunkState = new sfn.Pass(this, 'UpdateChunkState', {
      parameters: {
        'mode.$': '$.mode',
        'congress.$': '$.congress',
        'voteOffset.$': '$.chunkResult.body.voteChunking.nextOffset',
        'hasMore.$': '$.chunkResult.body.voteChunking.hasMore',
        'totalProcessed.$': 'States.MathAdd($.totalProcessed, $.chunkResult.body.voteChunking.rollCallsProcessed)',
        'membersResult.$': '$.membersResult',
        'billsResult.$': '$.billsResult',
        'lastChunkResult.$': '$.chunkResult',
      },
    });

    // Check if more chunks to process
    const hasMoreChunks = new sfn.Choice(this, 'HasMoreChunks')
      .when(
        sfn.Condition.booleanEquals('$.hasMore', true),
        processVotesChunk
      )
      .otherwise(votesComplete);

    // Wire up the vote processing loop
    processVotesChunk.next(updateChunkState).next(hasMoreChunks);

    // Initialize vote processing state
    const initVoteProcessing = new sfn.Pass(this, 'InitVoteProcessing', {
      parameters: {
        'mode.$': '$.mode',
        'congress.$': '$.congress',
        'voteOffset': 0,
        'hasMore': true,
        'totalProcessed': 0,
        'membersResult.$': '$.membersResult',
        'billsResult.$': '$.billsResult',
      },
    });

    // Parallel: sync members and bills
    const parallelSync = new sfn.Parallel(this, 'ParallelSync', {
      resultPath: '$.parallelResults',
    });
    parallelSync.branch(syncMembers);
    parallelSync.branch(syncBills);

    // Merge parallel results into state
    const mergeParallelResults = new sfn.Pass(this, 'MergeParallelResults', {
      parameters: {
        'mode.$': '$.mode',
        'congress.$': '$.congress',
        'membersResult.$': '$.parallelResults[0]',
        'billsResult.$': '$.parallelResults[1]',
      },
    });

    // Build the full chain
    const definition = parallelSync
      .next(mergeParallelResults)
      .next(initVoteProcessing)
      .next(processVotesChunk);

    // CloudWatch log group for state machine
    const logGroup = new logs.LogGroup(this, 'StateMachineLogGroup', {
      logGroupName: `/aws/stepfunctions/democracy-watch-ingestion-${config.envName}`,
      retention: logs.RetentionDays.ONE_MONTH,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // Create the state machine
    this.voteIngestionStateMachine = new sfn.StateMachine(this, 'VoteIngestionStateMachine', {
      stateMachineName: `democracy-watch-full-ingestion-${config.envName}`,
      definitionBody: sfn.DefinitionBody.fromChainable(definition),
      timeout: cdk.Duration.hours(2),
      tracingEnabled: true,
      logs: {
        destination: logGroup,
        level: sfn.LogLevel.ALL,
        includeExecutionData: true,
      },
    });

    // Grant Lambda invoke permissions
    ingestCongressHandler.grantInvoke(this.voteIngestionStateMachine);

    // Outputs
    new cdk.CfnOutput(this, 'StateMachineArn', {
      value: this.voteIngestionStateMachine.stateMachineArn,
      exportName: `${config.envName}-VoteIngestionStateMachineArn`,
    });

    new cdk.CfnOutput(this, 'StateMachineName', {
      value: this.voteIngestionStateMachine.stateMachineName,
      exportName: `${config.envName}-VoteIngestionStateMachineName`,
    });
  }
}
