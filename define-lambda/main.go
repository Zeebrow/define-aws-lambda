package define_aws_lambda

import (
	"context"
	"errors"
	"os"

	"github.com/Zeebrow/define/define"
	"github.com/aws/aws-lambda-go/events"
	"github.com/aws/aws-lambda-go/lambda"
	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/feature/dynamodb/attributevalue"
	"github.com/aws/aws-sdk-go-v2/service/dynamodb"
)

type LambdaOutput struct {
	Word        string `json:"headword"`
	HomonymJSON *define.SimpleHomonymJSON
	Suggestions []string
}

func DoSomeDynamoDBStuff(ctx context.Context) error {
	tableName := "define-cli-v1"
	// https://dynobase.dev/dynamodb-golang-query-examples/

	cfg, err := config.LoadDefaultConfig(ctx, func(o *config.LoadOptions) error {
		o.Region = "us-east-1" //@@@
		return nil
	})
	if err != nil {
		return err
	}
	definintion, err := GetDefinition("intricate")
	if err != nil {
		return err
	}
	ddbItem, err := attributevalue.MarshalMap(definintion)
	if err != nil {
		return err
	}

	ddb := dynamodb.NewFromConfig(cfg)
	_, err = ddb.PutItem(ctx, &dynamodb.PutItemInput{
		TableName: &tableName,
		Item:      ddbItem,
	})
	if err != nil {
		return err
	}
	return nil
}

func HandleDDBTest(ctx context.Context, request events.LambdaFunctionURLRequest) error {
	return DoSomeDynamoDBStuff(ctx)
}

func HandleSimpleRequest(ctx context.Context, request events.LambdaFunctionURLRequest) (LambdaOutput, error) {
	for k, v := range request.QueryStringParameters {
		if k == "word" {
			return GetDefinition(v)
		}
	}
	return LambdaOutput{}, errors.New("no word to define")
}

func GetDefinition(word string) (LambdaOutput, error) {
	var lOutput LambdaOutput = LambdaOutput{
		Word: word,
	}
	mwDictAPIKey := os.Getenv("MW_DICT_API_KEY")
	if mwDictAPIKey == "" {
		return lOutput, errors.New("lambda environment improperly configured")
	}

	mw := define.NewApi(mwDictAPIKey)
	mw.Define(word)
	if mw.Suggestions != nil {
		lOutput.HomonymJSON = nil
		lOutput.Suggestions = *mw.Suggestions
		return lOutput, nil
	}
	if mw.Response != nil {
		j := mw.Response.GroupByHomonym()
		lOutput.HomonymJSON = &j
		lOutput.Suggestions = nil
		return lOutput, nil
	}
	return lOutput, errors.New("something went wrong")
}

func main() {
	// lambda.Start(HandleSimpleRequest)
	lambda.Start(HandleDDBTest)
}
