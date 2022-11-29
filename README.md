Using `go` for a lambda function that does what this one does (respond to http
requests with a JSON) is... ill advised...

But, without it, that would make [my define package](https://github.com/Zeebrow/define) even more useless!

# how-to

## set Merriam-Webster API key env
**The Great Filter**

`export MW_DICT_API_KEY=your-uuid`

You can get a free api key here: <https://dictionaryapi.com/>

## build for initial deployment
`./update-code --prep-deploy`

## run CDK deployment

```
npm install -g typescript
npm install -g aws-cdk # 99% sure this is right

cdk --profile <your-profile> bootstrap
cdk --profile <your-profile> synth # optional
cdk --profile <your-profile> deploy
```

## code updates
AWS can't detect when you update code in the lambda bucket (well, it *can*, but
I'm just here so I don't get fined).
`./update-code.sh -a` will recompile and upload your code, and tell your Lambda
about it.

# Notes
- Lambda runs a binary which is built and shipped like this:
```
GOOS=linux go build -o build/main define/main.go 
zip build/main.zip build/main
```

- Mixing CDK class versions between V1 and V2 isn't allowed!
  * V1 services look like `import ... from '@aws-cdk/<aws-service>'`
  * V2 services look like `import {aws_<service> as name} from 'aws-cdk-lib'`

- (go) The function signature you pass to `lambda.Start()` is all that matters.
  * If you want to return a JSON, return a struct from your handler function that `encoding/json` would be able to `Unmarshal`. 
  * See [aws-lambda-go/events](https://github.com/aws/aws-lambda-go/tree/main/events) for some good examples

# misc

- Providing a `functionName` in `lambda.Function` props will delete and recreate
  the lambda function, like so many other AWS resource updates.
- The `cdk.out` is by default in the cdk-generated `.gitignore` file. Using
  environment variables to store secret values (like the API key) is safe as
  long as this is true.
  * remove the `.git/` directory from the cdk code gen, but not the `.gitignore`!
- cdk does not detect changes to the contents of files uploaded to lambda (run `aws lambda update-function-code help`)

# Thanks for reading!

