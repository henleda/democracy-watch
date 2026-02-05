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
  public readonly houseVoteStateMachine: sfn.StateMachine;
  public readonly senateVoteStateMachine: sfn.StateMachine;
  public readonly billIngestionStateMachine: sfn.StateMachine;

  constructor(scope: Construct, id: string, props: OrchestrationStackProps) {
    super(scope, id, props);

    const { config, ingestCongressHandler } = props;

    // Roll calls per chunk - stay well under 15 min timeout
    // House: 435 members per roll call = many more DB ops, needs smaller chunks
    // Senate: 100 members per roll call, can handle larger chunks
    const HOUSE_ROLL_CALLS_PER_CHUNK = 100;
    const SENATE_ROLL_CALLS_PER_CHUNK = 250;

    // CloudWatch log group for all state machines
    const logGroup = new logs.LogGroup(this, 'StateMachineLogGroup', {
      logGroupName: `/aws/stepfunctions/democracy-watch-ingestion-${config.envName}`,
      retention: logs.RetentionDays.ONE_MONTH,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // =========================================================================
    // House Vote State Machine (Independent)
    // =========================================================================
    const houseSuccess = new sfn.Succeed(this, 'HouseIngestionComplete', {
      comment: 'House votes ingested successfully',
    });

    const houseVotesComplete = new sfn.Pass(this, 'HouseVotesComplete').next(houseSuccess);

    const processHouseChunk = new tasks.LambdaInvoke(this, 'ProcessHouseChunk', {
      lambdaFunction: ingestCongressHandler,
      payload: sfn.TaskInput.fromObject({
        mode: sfn.JsonPath.stringAt('$.mode'),
        congress: sfn.JsonPath.numberAt('$.congress'),
        skipMembers: true,
        skipBills: true,
        chamber: 'house',
        voteStartOffset: sfn.JsonPath.numberAt('$.houseOffset'),
        voteMaxRollCalls: HOUSE_ROLL_CALLS_PER_CHUNK,
      }),
      resultPath: '$.chunkResult',
      resultSelector: {
        'statusCode.$': '$.Payload.statusCode',
        'body.$': 'States.StringToJson($.Payload.body)',
      },
    });

    const updateHouseState = new sfn.Pass(this, 'UpdateHouseState', {
      parameters: {
        'mode.$': '$.mode',
        'congress.$': '$.congress',
        'houseOffset.$': '$.chunkResult.body.voteChunking.nextOffset',
        'hasMore.$': '$.chunkResult.body.voteChunking.hasMore',
        'totalProcessed.$': 'States.MathAdd($.totalProcessed, $.chunkResult.body.voteChunking.rollCallsProcessed)',
        'lastChunkResult.$': '$.chunkResult',
      },
    });

    const hasMoreHouseChunks = new sfn.Choice(this, 'HasMoreHouseChunks')
      .when(sfn.Condition.booleanEquals('$.hasMore', true), processHouseChunk)
      .otherwise(houseVotesComplete);

    processHouseChunk.next(updateHouseState).next(hasMoreHouseChunks);

    const initHouseProcessing = new sfn.Pass(this, 'InitHouseProcessing', {
      parameters: {
        'mode.$': '$.mode',
        'congress.$': '$.congress',
        'houseOffset': 0,
        'hasMore': true,
        'totalProcessed': 0,
      },
    });

    const houseDefinition = initHouseProcessing.next(processHouseChunk);

    this.houseVoteStateMachine = new sfn.StateMachine(this, 'HouseVoteStateMachine', {
      stateMachineName: `democracy-watch-house-votes-${config.envName}`,
      definitionBody: sfn.DefinitionBody.fromChainable(houseDefinition),
      timeout: cdk.Duration.hours(2),
      tracingEnabled: true,
      logs: {
        destination: logGroup,
        level: sfn.LogLevel.ALL,
        includeExecutionData: true,
      },
    });

    ingestCongressHandler.grantInvoke(this.houseVoteStateMachine);

    // =========================================================================
    // Senate Vote State Machine (Independent)
    // =========================================================================
    const senateSuccess = new sfn.Succeed(this, 'SenateIngestionComplete', {
      comment: 'Senate votes ingested successfully',
    });

    const senateVotesComplete = new sfn.Pass(this, 'SenateVotesComplete').next(senateSuccess);

    const processSenateChunk = new tasks.LambdaInvoke(this, 'ProcessSenateChunk', {
      lambdaFunction: ingestCongressHandler,
      payload: sfn.TaskInput.fromObject({
        mode: sfn.JsonPath.stringAt('$.mode'),
        congress: sfn.JsonPath.numberAt('$.congress'),
        skipMembers: true,
        skipBills: true,
        chamber: 'senate',
        voteStartOffset: sfn.JsonPath.numberAt('$.senateOffset'),
        voteMaxRollCalls: SENATE_ROLL_CALLS_PER_CHUNK,
      }),
      resultPath: '$.chunkResult',
      resultSelector: {
        'statusCode.$': '$.Payload.statusCode',
        'body.$': 'States.StringToJson($.Payload.body)',
      },
    });

    const updateSenateState = new sfn.Pass(this, 'UpdateSenateState', {
      parameters: {
        'mode.$': '$.mode',
        'congress.$': '$.congress',
        'senateOffset.$': '$.chunkResult.body.voteChunking.nextOffset',
        'hasMore.$': '$.chunkResult.body.voteChunking.hasMore',
        'totalProcessed.$': 'States.MathAdd($.totalProcessed, $.chunkResult.body.voteChunking.rollCallsProcessed)',
        'lastChunkResult.$': '$.chunkResult',
      },
    });

    const hasMoreSenateChunks = new sfn.Choice(this, 'HasMoreSenateChunks')
      .when(sfn.Condition.booleanEquals('$.hasMore', true), processSenateChunk)
      .otherwise(senateVotesComplete);

    processSenateChunk.next(updateSenateState).next(hasMoreSenateChunks);

    const initSenateProcessing = new sfn.Pass(this, 'InitSenateProcessing', {
      parameters: {
        'mode.$': '$.mode',
        'congress.$': '$.congress',
        'senateOffset': 0,
        'hasMore': true,
        'totalProcessed': 0,
      },
    });

    const senateDefinition = initSenateProcessing.next(processSenateChunk);

    this.senateVoteStateMachine = new sfn.StateMachine(this, 'SenateVoteStateMachine', {
      stateMachineName: `democracy-watch-senate-votes-${config.envName}`,
      definitionBody: sfn.DefinitionBody.fromChainable(senateDefinition),
      timeout: cdk.Duration.hours(2),
      tracingEnabled: true,
      logs: {
        destination: logGroup,
        level: sfn.LogLevel.ALL,
        includeExecutionData: true,
      },
    });

    ingestCongressHandler.grantInvoke(this.senateVoteStateMachine);

    // =========================================================================
    // Full Ingestion State Machine (Members + Bills + Both Chambers in Parallel)
    // =========================================================================
    const fullSuccess = new sfn.Succeed(this, 'FullIngestionComplete', {
      comment: 'All data ingested successfully',
    });

    // Step 1: Sync members
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

    // Step 2: Sync bills
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

    // Parallel sync of members and bills
    const parallelSync = new sfn.Parallel(this, 'ParallelSync', {
      resultPath: '$.parallelResults',
    });
    parallelSync.branch(syncMembers);
    parallelSync.branch(syncBills);

    // Merge parallel results
    const mergeParallelResults = new sfn.Pass(this, 'MergeParallelResults', {
      parameters: {
        'mode.$': '$.mode',
        'congress.$': '$.congress',
        'membersResult.$': '$.parallelResults[0]',
        'billsResult.$': '$.parallelResults[1]',
      },
    });

    // House vote loop (for full ingestion)
    const processHouseChunkFull = new tasks.LambdaInvoke(this, 'ProcessHouseChunkFull', {
      lambdaFunction: ingestCongressHandler,
      payload: sfn.TaskInput.fromObject({
        mode: sfn.JsonPath.stringAt('$.mode'),
        congress: sfn.JsonPath.numberAt('$.congress'),
        skipMembers: true,
        skipBills: true,
        chamber: 'house',
        voteStartOffset: sfn.JsonPath.numberAt('$.houseOffset'),
        voteMaxRollCalls: HOUSE_ROLL_CALLS_PER_CHUNK,
      }),
      resultPath: '$.houseChunkResult',
      resultSelector: {
        'statusCode.$': '$.Payload.statusCode',
        'body.$': 'States.StringToJson($.Payload.body)',
      },
    });

    const updateHouseStateFull = new sfn.Pass(this, 'UpdateHouseStateFull', {
      parameters: {
        'mode.$': '$.mode',
        'congress.$': '$.congress',
        'houseOffset.$': '$.houseChunkResult.body.voteChunking.nextOffset',
        'houseHasMore.$': '$.houseChunkResult.body.voteChunking.hasMore',
        'houseTotalProcessed.$': 'States.MathAdd($.houseTotalProcessed, $.houseChunkResult.body.voteChunking.rollCallsProcessed)',
      },
    });

    const houseComplete = new sfn.Pass(this, 'HouseComplete', {
      parameters: {
        'houseFinalTotal.$': '$.houseTotalProcessed',
      },
    });

    const hasMoreHouseChunksFull = new sfn.Choice(this, 'HasMoreHouseChunksFull')
      .when(sfn.Condition.booleanEquals('$.houseHasMore', true), processHouseChunkFull)
      .otherwise(houseComplete);

    processHouseChunkFull.next(updateHouseStateFull).next(hasMoreHouseChunksFull);

    const initHouseLoop = new sfn.Pass(this, 'InitHouseLoop', {
      parameters: {
        'mode.$': '$.mode',
        'congress.$': '$.congress',
        'houseOffset': 0,
        'houseHasMore': true,
        'houseTotalProcessed': 0,
      },
    });

    // Senate vote loop (for full ingestion)
    const processSenateChunkFull = new tasks.LambdaInvoke(this, 'ProcessSenateChunkFull', {
      lambdaFunction: ingestCongressHandler,
      payload: sfn.TaskInput.fromObject({
        mode: sfn.JsonPath.stringAt('$.mode'),
        congress: sfn.JsonPath.numberAt('$.congress'),
        skipMembers: true,
        skipBills: true,
        chamber: 'senate',
        voteStartOffset: sfn.JsonPath.numberAt('$.senateOffset'),
        voteMaxRollCalls: SENATE_ROLL_CALLS_PER_CHUNK,
      }),
      resultPath: '$.senateChunkResult',
      resultSelector: {
        'statusCode.$': '$.Payload.statusCode',
        'body.$': 'States.StringToJson($.Payload.body)',
      },
    });

    const updateSenateStateFull = new sfn.Pass(this, 'UpdateSenateStateFull', {
      parameters: {
        'mode.$': '$.mode',
        'congress.$': '$.congress',
        'senateOffset.$': '$.senateChunkResult.body.voteChunking.nextOffset',
        'senateHasMore.$': '$.senateChunkResult.body.voteChunking.hasMore',
        'senateTotalProcessed.$': 'States.MathAdd($.senateTotalProcessed, $.senateChunkResult.body.voteChunking.rollCallsProcessed)',
      },
    });

    const senateComplete = new sfn.Pass(this, 'SenateComplete', {
      parameters: {
        'senateFinalTotal.$': '$.senateTotalProcessed',
      },
    });

    const hasMoreSenateChunksFull = new sfn.Choice(this, 'HasMoreSenateChunksFull')
      .when(sfn.Condition.booleanEquals('$.senateHasMore', true), processSenateChunkFull)
      .otherwise(senateComplete);

    processSenateChunkFull.next(updateSenateStateFull).next(hasMoreSenateChunksFull);

    const initSenateLoop = new sfn.Pass(this, 'InitSenateLoop', {
      parameters: {
        'mode.$': '$.mode',
        'congress.$': '$.congress',
        'senateOffset': 0,
        'senateHasMore': true,
        'senateTotalProcessed': 0,
      },
    });

    // House branch: init -> loop
    const houseBranch = initHouseLoop.next(processHouseChunkFull);

    // Senate branch: init -> loop
    const senateBranch = initSenateLoop.next(processSenateChunkFull);

    // Parallel vote processing (House and Senate run simultaneously)
    const parallelVotes = new sfn.Parallel(this, 'ParallelVotes', {
      resultPath: '$.voteResults',
    });
    parallelVotes.branch(houseBranch);
    parallelVotes.branch(senateBranch);

    // Final merge of vote results
    const mergeVoteResults = new sfn.Pass(this, 'MergeVoteResults', {
      parameters: {
        'houseTotal.$': '$.voteResults[0].houseFinalTotal',
        'senateTotal.$': '$.voteResults[1].senateFinalTotal',
      },
    });

    parallelVotes.next(mergeVoteResults).next(fullSuccess);

    // Full definition: members/bills -> parallel votes
    const fullDefinition = parallelSync
      .next(mergeParallelResults)
      .next(parallelVotes);

    this.voteIngestionStateMachine = new sfn.StateMachine(this, 'VoteIngestionStateMachine', {
      stateMachineName: `democracy-watch-full-ingestion-${config.envName}`,
      definitionBody: sfn.DefinitionBody.fromChainable(fullDefinition),
      timeout: cdk.Duration.hours(4), // Increased since both run in parallel
      tracingEnabled: true,
      logs: {
        destination: logGroup,
        level: sfn.LogLevel.ALL,
        includeExecutionData: true,
      },
    });

    ingestCongressHandler.grantInvoke(this.voteIngestionStateMachine);

    // =========================================================================
    // Bill Detail Ingestion State Machine (Chunked)
    // =========================================================================
    // Bills per chunk - stay well under 15 min timeout
    // ~3 API calls per bill (detail + summaries + subjects) at 720ms each = ~2.2s per bill
    // 200 bills * 2.2s = ~7.3 minutes, leaving margin for DB ops
    const BILLS_PER_CHUNK = 200;

    const billSuccess = new sfn.Succeed(this, 'BillIngestionComplete', {
      comment: 'Bill details ingested successfully',
    });

    const billsComplete = new sfn.Pass(this, 'BillsComplete').next(billSuccess);

    const processBillChunk = new tasks.LambdaInvoke(this, 'ProcessBillChunk', {
      lambdaFunction: ingestCongressHandler,
      payload: sfn.TaskInput.fromObject({
        mode: sfn.JsonPath.stringAt('$.mode'),
        congress: sfn.JsonPath.numberAt('$.congress'),
        skipMembers: true,
        skipVotes: true,
        fetchBillDetails: true,
        billChunkStart: sfn.JsonPath.numberAt('$.billOffset'),
        billChunkSize: BILLS_PER_CHUNK,
      }),
      resultPath: '$.chunkResult',
      resultSelector: {
        'statusCode.$': '$.Payload.statusCode',
        'body.$': 'States.StringToJson($.Payload.body)',
      },
    });

    // Check if we processed a full chunk (meaning there's likely more)
    const updateBillState = new sfn.Pass(this, 'UpdateBillState', {
      parameters: {
        'mode.$': '$.mode',
        'congress.$': '$.congress',
        'billOffset.$': `States.MathAdd($.billOffset, ${BILLS_PER_CHUNK})`,
        'totalProcessed.$': `States.MathAdd($.totalProcessed, $.chunkResult.body.results.bills.updated)`,
        'totalErrors.$': 'States.MathAdd($.totalErrors, $.chunkResult.body.results.bills.errors)',
        'lastChunkUpdated.$': '$.chunkResult.body.results.bills.updated',
        'lastChunkErrors.$': '$.chunkResult.body.results.bills.errors',
      },
    });

    // Continue if we got a full chunk worth of updates (meaning there's more)
    const hasMoreBillChunks = new sfn.Choice(this, 'HasMoreBillChunks')
      .when(
        sfn.Condition.numberGreaterThanEquals('$.lastChunkUpdated', BILLS_PER_CHUNK - 10), // Some margin for errors
        processBillChunk
      )
      .otherwise(billsComplete);

    processBillChunk.next(updateBillState).next(hasMoreBillChunks);

    const initBillProcessing = new sfn.Pass(this, 'InitBillProcessing', {
      parameters: {
        'mode.$': '$.mode',
        'congress.$': '$.congress',
        'billOffset': 0,
        'totalProcessed': 0,
        'totalErrors': 0,
        'lastChunkUpdated': BILLS_PER_CHUNK, // Start with full to enter loop
        'lastChunkErrors': 0,
      },
    });

    const billDefinition = initBillProcessing.next(processBillChunk);

    this.billIngestionStateMachine = new sfn.StateMachine(this, 'BillIngestionStateMachine', {
      stateMachineName: `democracy-watch-bill-details-${config.envName}`,
      definitionBody: sfn.DefinitionBody.fromChainable(billDefinition),
      timeout: cdk.Duration.hours(12), // Congress 118 needs ~10 hours due to API rate limits
      tracingEnabled: true,
      logs: {
        destination: logGroup,
        level: sfn.LogLevel.ALL,
        includeExecutionData: true,
      },
    });

    ingestCongressHandler.grantInvoke(this.billIngestionStateMachine);

    // =========================================================================
    // Outputs
    // =========================================================================
    new cdk.CfnOutput(this, 'FullStateMachineArn', {
      value: this.voteIngestionStateMachine.stateMachineArn,
      exportName: `${config.envName}-FullIngestionStateMachineArn`,
    });

    new cdk.CfnOutput(this, 'HouseStateMachineArn', {
      value: this.houseVoteStateMachine.stateMachineArn,
      exportName: `${config.envName}-HouseVoteStateMachineArn`,
    });

    new cdk.CfnOutput(this, 'SenateStateMachineArn', {
      value: this.senateVoteStateMachine.stateMachineArn,
      exportName: `${config.envName}-SenateVoteStateMachineArn`,
    });

    new cdk.CfnOutput(this, 'FullStateMachineName', {
      value: this.voteIngestionStateMachine.stateMachineName,
      exportName: `${config.envName}-FullIngestionStateMachineName`,
    });

    new cdk.CfnOutput(this, 'HouseStateMachineName', {
      value: this.houseVoteStateMachine.stateMachineName,
      exportName: `${config.envName}-HouseVoteStateMachineName`,
    });

    new cdk.CfnOutput(this, 'SenateStateMachineName', {
      value: this.senateVoteStateMachine.stateMachineName,
      exportName: `${config.envName}-SenateVoteStateMachineName`,
    });

    new cdk.CfnOutput(this, 'BillStateMachineArn', {
      value: this.billIngestionStateMachine.stateMachineArn,
      exportName: `${config.envName}-BillIngestionStateMachineArn`,
    });

    new cdk.CfnOutput(this, 'BillStateMachineName', {
      value: this.billIngestionStateMachine.stateMachineName,
      exportName: `${config.envName}-BillIngestionStateMachineName`,
    });
  }
}
