#!/bin/bash
PROFILE=define-admin
DEFINE_LAMBDA_FUNCTION_NAME=define-url-v1
DEFINE_BUCKET_NAME=define-merriam-webster

function build() {
  rm -rf build/
  mkdir build
  GOOS=linux go build -o build/main define/main.go
  cd build
  zip main.zip main
  cd ..
}

function  upload() {
  aws --profile "$PROFILE" s3 cp build/main.zip s3://"$DEFINE_BUCKET_NAME"/code/main.zip
}

function update_code () {
  aws --profile "$PROFILE" lambda update-function-code \
    --function-name "$DEFINE_LAMBDA_FUNCTION_NAME" \
    --s3-bucket "$DEFINE_BUCKET_NAME" \
    --s3-key code/main.zip
}

function invoke() {
  WORD="${1:-peculiar}"; shift
  echo "defining '$WORD'..."
  output=output-$(date +%s).log
  aws --profile "$PROFILE" lambda invoke \
    --cli-binary-format raw-in-base64-out \
    --function-name "$DEFINE_LAMBDA_FUNCTION_NAME" \
    --invocation-type RequestResponse \
    --payload "{\"name\": \"zeebrow\", \"word\": \"$WORD\"}" \
    "$output"
  cat "$output" | jq
}

function invoke_url() {
  url=$(aws lambda get-function-url-config --function-name "$DEFINE_LAMBDA_FUNCTION_NAME" | jq '.FunctionUrl')
  curl "$url"
}

case "$1" in
  -a)
    shift
    echo building...
    build
    echo uploading to s3...
    upload
    echo updating lambda function...
    update_code
    sleep 5
    echo running code...
    invoke
    ;;
  -i) shift; invoke "$@";;
  *) echo 'usage:
    -a    build, upload, update lambda, invode
    -i    invoke url';;
esac
