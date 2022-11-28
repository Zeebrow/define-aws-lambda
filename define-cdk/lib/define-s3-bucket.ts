import * as cdk from '@aws-cdk/core'
import * as s3 from '@aws-cdk/aws-s3'
// import * as sqs from 'aws-cdk-lib/aws-sqs';


export class DefineBucket extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const bucket = new s3.Bucket(this, 'LambdaCodeBucket', {
      bucketName: 'define-merriam-webster',
    })

  }
}