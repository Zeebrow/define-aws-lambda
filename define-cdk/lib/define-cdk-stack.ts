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

export class DefineCdkStack extends Stack {
  constructor(scope: Construct, id: string, props: DefineCdkStackProps) {
    super(scope, id, props);

/***************************************************************************
 * Infrastructure
 * 
 * Supports deployment and maintenance endeavors - The application shouldn't
 * need to interact with these services.
*/
    /**
     * Because every app needs 1+ admin!
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

    const lambdaFunc = new lambda.Function(this, 'DefineLambdaFunction', {
      functionName: props.lambdaFunctionName,
      code: lambda.Code.fromAsset(props.lambdaCodeZipFilepath),
      handler: 'main',
      environment: {
        "MW_DICT_API_KEY": props.dictApiKeyValue!
      },
      runtime: lambda.Runtime.GO_1_X,
    });
    lambdaFunc.addFunctionUrl({
      authType:  lambda.FunctionUrlAuthType.NONE,
    });

    lambdaFunc.grantInvoke(group);
    Tags.of(lambdaFunc).add("cdk app", "define-url-v1")

/***************************************************************************
 * Application Components
 * 
 * Services which define (no pun intended) the cloud-native app
 *                   
 * Input:
 * APIKey
 * headword
 * 
 * Output:
 * json definition
 * 
 * State:
 * Database table (to save API call quota)
*/
    /**
     * Permissions required for the app to run
     */
    lambdaFunc.addToRolePolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      resources: [
        // `arn:aws:lambda:${this.region}:${this.account}:*:*` // why doesn't this work
        "*"
      ],
      actions: [
        "dynamodb:PutItem"
      ]
    }))
    const ddb = new dynamodb.Table(this, 'DefinitionsTable', {
      partitionKey: {
        name: "Headword",
        type: dynamodb.AttributeType.STRING
      },
      // tableName: "define-url-v1", //you cannot update a table once you name it
      billingMode: dynamodb.BillingMode.PROVISIONED,
      writeCapacity: 1,
      readCapacity: 1,
      removalPolicy: RemovalPolicy.DESTROY,
      sortKey: undefined,
    })
    ddb.grantReadData(group);
    Tags.of(ddb).add("cdk app", "define-url-v1")
    /**
     * @@@TODO
     * The name of the table which is used to store definitions is subject to change between deployments.
     * This is a pretty typical admin 
     * 
     * Here are some choices:
     * 1) Environment Variable
     *  + less application dependencies
     *  + cheaper
     *  
     * 2) Parameter Store
     *  + Decouples app from deployment, if that is desireable
     */
    lambdaFunc.addEnvironment("DDB_TABLE_NAME", ddb.tableName)
  };

};
