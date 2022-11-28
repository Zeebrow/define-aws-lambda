profile: `define`
user: `define-lambda`
bucket: `arn:aws:s3:::define-first-golang-lambda`

- Lambda runs a binary which is built and shipped like this:
```
GOOS=linux go build -o build/main define/main.go 
zip build/main.zip build/main
```

## big obvious

See this guy: 
```go
func main() {
	lambda.Start(HandleRequest)
}
```

I was racking my brain trying to get the output of the lambda function to
cooperate with `jq`. I want a friggin' JSON, but I kept getting *strings*. Well, duh, the
return value of `HandleRequest` was a `(string, error)`. So I made a struct of
how I wanted the output, returned that, and voila!

The last two lines of the documentation for `lambda.Start` are pretty good:
```
// Start takes a handler and talks to an internal Lambda endpoint to pass requests to the handler. If the
// handler does not match one of the supported types an appropriate error message will be returned to the caller.
// Start blocks, and does not return after being called.
//
// Rules:
//
//   - handler must be a function
//   - handler may take between 0 and two arguments.
//   - if there are two arguments, the first argument must satisfy the "context.Context" interface.
//   - handler may return between 0 and two arguments.
//   - if there are two return values, the second argument must be an error.
//   - if there is one return value it must be an error.
//
// Valid function signatures:
//
//	func ()
//	func () error
//	func (TIn) error
//	func () (TOut, error)
//	func (TIn) (TOut, error)
//	func (context.Context) error
//	func (context.Context, TIn) error
//	func (context.Context) (TOut, error)
//	func (context.Context, TIn) (TOut, error)
//
// Where "TIn" and "TOut" are types compatible with the "encoding/json" standard library.
// See https://golang.org/pkg/encoding/json/#Unmarshal for how deserialization behaves
```

/blogpost


# how-to
```
npm install -g typescript
npm install -g aws-cdk

cd define-cdk
npm install --save-dev @aws-cdk/aws-iam
npm install --save-dev @aws-cdk/aws-lambda
npm install --save-dev @aws-cdk/aws-s3

# configure

cdk --profile <your-profile> bootstrap
cdk --profile <your-profile> deploy

cd ..
./upload-code.sh

```

# misc

- giving a `functionName` in `lambda.Function` props will delete and recreate
  the lambda function

- The `cdk.out` is by default in the cdk-generated `.gitignore` file. Using
  environment variables to store secret values (like out API key) is safe as
  long as this is true.
  * remove the `.git/` directory from the cdk code gen, but not the `.gitignore`!
- cdk does not detect changes to the contents of files uploaded to lambda (see `update-function-code`)

