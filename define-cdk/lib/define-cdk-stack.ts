import * as path from 'path';
import * as process from 'process'

import {
  Stack,
  RemovalPolicy,
  StackProps,
  aws_iam as iam,
  aws_lambda as lambda,
  aws_s3 as s3,
  aws_s3_deployment as s3deploy
} from 'aws-cdk-lib'
import { Construct } from 'constructs'

export interface DefineCdkStackProps extends StackProps {
  bucketName: string
  /*obtained from environment variable "MW_DICT_API_KEY"*/
  dictApiKeyValue: string
  /*s3 prefix and key to destination code*/
  s3PathToLambdaCode: string
  /*friendly name for lambda function*/
  lambdaFunctionName: string
  /*location where the lambda code .zip file can be found (see upload-code.sh to update code after CDK stack is deployed)*/
  lambdaCodeZipFilepath: string
}


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

    /**********************************************************
     * s3
    */

    const bucket = new s3.Bucket(this, 'LambdaCodeBucket', {
        bucketName: props.bucketName,
        removalPolicy: RemovalPolicy.DESTROY,
        autoDeleteObjects: true,
    });
    bucket.grantReadWrite(group)
    const codeDeployment = new s3deploy.BucketDeployment(this, 'BucketSeed', {
        destinationBucket: bucket,
        sources: [s3deploy.Source.asset(props.lambdaCodeZipFilepath)]
    });
    codeDeployment.node.addDependency(bucket)

    /**********************************************************
     * lambda
    */
    const code = lambda.Code.fromBucket(bucket, props.s3PathToLambdaCode)

    const lambdaFunc = new lambda.Function(this, 'define-lambda-function', {
      functionName: props.lambdaFunctionName,
      code: code,
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
    })
    lambdaFunc.node.addDependency(codeDeployment)
    lambdaFunc.grantInvoke(group);
    bucket.grantReadWrite(lambdaFunc);


    // The code that defines your stack goes here

    // example resource
    // const queue = new sqs.Queue(this, 'DefineCdkQueue', {
    //   visibilityTimeout: Duration.seconds(300)
    // });


  }
}
