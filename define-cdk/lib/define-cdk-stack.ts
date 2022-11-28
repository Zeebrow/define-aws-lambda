import * as path from 'path';
import * as process from 'process'
import * as cdk from '@aws-cdk/core';
import * as s3 from '@aws-cdk/aws-s3';
import * as iam from '@aws-cdk/aws-iam';
import * as lambda from '@aws-cdk/aws-lambda'
// import * as sqs from 'aws-cdk-lib/aws-sqs';

const S3_PATH_TO_LAMBDA_CODE = 'code/main.zip'
const LAMBDA_FUNCTION_NAME = 'define-url-v1'


export class DefineCdkStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const MW_DICT_API_KEY = process.env['MW_DICT_API_KEY']
    if (MW_DICT_API_KEY == undefined){
      console.log("MW_DICT_API_KEY environment variable is undefined.")
    }

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

    /**********************************************************
     * s3
    */

    const bucket = new s3.Bucket(this, 'LambdaCodeBucket', {
      bucketName: 'define-merriam-webster',
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });
    bucket.grantReadWrite(group)

    /**********************************************************
     * lambda
    */
    // const code = lambda.Code.fromAsset(path.join(__dirname, '../..', 'build/main.zip'));
    const code = lambda.Code.fromBucket(bucket, S3_PATH_TO_LAMBDA_CODE)

    const lambdaFunc = new lambda.Function(this, 'define-lambda-function', {
      functionName: LAMBDA_FUNCTION_NAME,
      code: code,
      handler: 'main',
      environment: {
        "MW_DICT_API_KEY": MW_DICT_API_KEY!
      },
      runtime: lambda.Runtime.GO_1_X
    });
    lambdaFunc.grantInvoke(group);
    bucket.grantReadWrite(lambdaFunc);


    // The code that defines your stack goes here

    // example resource
    // const queue = new sqs.Queue(this, 'DefineCdkQueue', {
    //   visibilityTimeout: cdk.Duration.seconds(300)
    // });


  }
}
