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
  /*friendly name for bucket to store lambda code*/
  bucketName: string
  /*friendly name for lambda function*/
  lambdaFunctionName: string
  /*obtained from environment variable "MW_DICT_API_KEY"*/
  dictApiKeyValue: string
  /*location of zipped lambda code main.zip (double-zipped)*/
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
    const codeDeployment = new s3deploy.BucketDeployment(this, 'BucketSeed', {
        destinationBucket: bucket,
        destinationKeyPrefix: 'code',
        extract: true,
        sources: [s3deploy.Source.asset(props.lambdaCodeZipFilepath)] //"double-zipped" main.zip
    });
    bucket.grantReadWrite(group)

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
  };
};
