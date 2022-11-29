package main

import (
	"context"
	"errors"
	"os"

	"github.com/Zeebrow/define/define"
	"github.com/aws/aws-lambda-go/events"
	"github.com/aws/aws-lambda-go/lambda"
)

type MyEvent struct {
	Name string `json:"name"`
	Word string `json:"word"`
}

type LambdaOutput struct {
	Word        string
	HomonymJSON *define.HomonymJSON
	Suggestions []string
}

func HandleSimpleRequest(ctx context.Context, request events.LambdaFunctionURLRequest) (LambdaOutput, error) { //Note: return type must be compatible with json.Unmarshal
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

	// var hj define.HomonymJSON

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
	// lambda.Start(HandleEventRequest)
	lambda.Start(HandleSimpleRequest)
}
