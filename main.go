package main

import (
	"context"
	"errors"
	"fmt"
	"os"

	"github.com/Zeebrow/define/define"
	"github.com/aws/aws-lambda-go/events"
	"github.com/aws/aws-lambda-go/lambda"
	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/feature/dynamodb/attributevalue"
	"github.com/aws/aws-sdk-go-v2/service/dynamodb"
)

type LambdaOutput struct {
	Headword    string `json:"headword"`
	HomonymJSON *define.SimpleHomonymJSON
	Suggestions []string
}

func DoSomeDynamoDBStuff(ctx context.Context) error {
	tableName := "DefineCdkStack-DefinitionsTable5BA5B3FD-TR5QLHMJLTF2"
	// https://dynobase.dev/dynamodb-golang-query-examples/

	cfg, err := config.LoadDefaultConfig(ctx, func(o *config.LoadOptions) error {
		o.Region = "us-east-1" //@@@
		return nil
	})
	if err != nil {
		return err
	}
	definintion, err := GetDefinition("peculiar")
	if err != nil {
		return err
	}
	ddbItem, err := attributevalue.MarshalMap(definintion.HomonymJSON)
	if err != nil {
		return err
	}

	fmt.Printf("%+v\n", definintion.HomonymJSON)
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
		Headword: word,
	}
	mwDictAPIKey := os.Getenv("MW_DICT_API_KEY")
	if mwDictAPIKey == "" {
		return lOutput, errors.New("lambda environment improperly configured")
	}

	mw := define.NewDictionary(mwDictAPIKey)
	ds, err := mw.Lookup(word)
	if err != nil { // 'word' did not have a definition and instead provides suggestions
		var eo string
		for i, s := range *ds.Suggestions {
			eo += fmt.Sprintf("suggestion %d: %s\n", i, s)
		}
		lOutput.HomonymJSON = nil
		lOutput.Suggestions = *ds.Suggestions
		return lOutput, err
	}
	j := ds.GetSimpleHomonymJSON()
	lOutput.HomonymJSON = &j
	lOutput.Suggestions = nil
	fmt.Printf("homonym json: %+v\n", j)
	return lOutput, nil
}

func main() {
	lambda.Start(HandleSimpleRequest)
	// lambda.Start(HandleDDBTest)
}
