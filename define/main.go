package main

import (
	"context"
	"errors"
	"fmt"
	"os"

	"github.com/Zeebrow/define/define"
	"github.com/aws/aws-lambda-go/lambda"
)

type MyEvent struct {
	Name string `json:"name"`
	Word string `json:"word"`
}

type LambdaOutput struct {
	Name        string
	Word        string
	HomonymJSON define.HomonymJSON
	Suggestions []string
}

func HandleRequest(ctx context.Context, e MyEvent) (LambdaOutput, error) { //Note: return type must be compatible with json.Unmarshal
	var lOutput LambdaOutput
	lOutput.Word = e.Word
	lOutput.Name = e.Name

	var hj define.HomonymJSON

	fmt.Printf("Context: %+v\n", ctx)
	mwDictAPIKey := os.Getenv("MW_DICT_API_KEY")
	mw := define.NewApi(mwDictAPIKey)
	mw.Define(e.Word)
	if mw.Suggestions != nil {
		lOutput.HomonymJSON = hj
		lOutput.Suggestions = *mw.Suggestions
		return lOutput, nil
	}
	if mw.Response != nil {
		j := mw.Response.GroupByHomonym()
		lOutput.HomonymJSON = j
		return lOutput, nil
	}
	return lOutput, errors.New("something went wrong")
}

func main() {
	lambda.Start(HandleRequest)
}
