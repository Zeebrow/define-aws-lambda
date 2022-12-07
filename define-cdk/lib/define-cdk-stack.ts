import {
  Stack,
  RemovalPolicy,
  StackProps,
  aws_iam as iam,
  aws_lambda as lambda,
  aws_s3 as s3,
  aws_s3_deployment as s3deploy,
  aws_dynamodb as dynamodb,
  Tags,
} from 'aws-cdk-lib'
// import * as cdk from 'aws-cdk-lib'
import { Construct } from 'constructs'

export interface DefineCdkStackProps extends StackProps {
  /*friendly name for bucket (dump lambda code)*/
  bucketName: string
  /*friendly name for lambda function*/
  lambdaFunctionName: string
  /*obtained from environment variable "MW_DICT_API_KEY"*/
  dictApiKeyValue: string
  /*location of zipped lambda code main.zip (double-zipped)*/
  lambdaCodeZipFilepath: string
}

const appTag = {key: "cdk app", value: "define-url-v1", tagProps: undefined} 


export class DefineCdkStack extends Stack {
  constructor(scope: Construct, id: string, props: DefineCdkStackProps) {
    super(scope, id, props);

    /**********************************************************
     * create users
    */

    const group = new iam.Group(this, 'define-group', {
      groupName: 'define-group',
    });

    const user = new iam.User(this, 'define-user', {
      groups: [group],
      userName: "define-user"
    });
    Tags.of(user).add("cdk app", "define-url-v1")
    Tags.of(group).add("cdk app", "define-url-v1")

    /**********************************************************
     * s3
    */

    const bucket = new s3.Bucket(this, 'LambdaCodeBucket', {
        bucketName: props.bucketName,
        removalPolicy: RemovalPolicy.DESTROY,
        autoDeleteObjects: true,
    });
    const codeDeployment = new s3deploy.BucketDeployment(this, 'BucketSeed', {
        destinationBucket: bucket,
        destinationKeyPrefix: 'code',
        extract: true,
        sources: [s3deploy.Source.asset(props.lambdaCodeZipFilepath)] //"double-zipped" main.zip
    });
    bucket.grantReadWrite(group)
    Tags.of(bucket).add("cdk app", "define-url-v1")

    /**********************************************************
     * lambda
    */

    const lambdaFunc = new lambda.Function(this, 'DefineLambdaFunction', {
      functionName: props.lambdaFunctionName,
      //from deployedBucket description: Doing this replaces calling `otherResource.node.addDependency(deployment)`
      code: lambda.Code.fromBucket(codeDeployment.deployedBucket, 'code/main.zip'), //contents of the double-zip
      handler: 'main',
      environment: {
        "MW_DICT_API_KEY": props.dictApiKeyValue!
      },
      runtime: lambda.Runtime.GO_1_X
    });
    lambdaFunc.addFunctionUrl({
      authType:  lambda.FunctionUrlAuthType.NONE,
      // cors: {
      //   allowedOrigins: [] 
      // }
    });
    lambdaFunc.grantInvoke(group);
    bucket.grantReadWrite(lambdaFunc);
    Tags.of(lambdaFunc).add("cdk app", "define-url-v1")

    const ddb = new dynamodb.Table(this, 'DefinitionsTable', {
      partitionKey: {
        name: "headword",
        type: dynamodb.AttributeType.STRING
      },
      tableName: "define-url-v1",
      billingMode: dynamodb.BillingMode.PROVISIONED,
      writeCapacity: 1,
      readCapacity: 1,
      removalPolicy: RemovalPolicy.DESTROY,

      /*Nice to know*/
      sortKey: undefined,
      kinesisStream: undefined, /*Kinesis Data Stream to capture item-level changes for the table*/
    })
    ddb.grantReadWriteData(lambdaFunc);
    ddb.grantReadData(group);
    Tags.of(ddb).add("cdk app", "define-url-v1")

  };
};
