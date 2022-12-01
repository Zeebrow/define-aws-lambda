#!/bin/bash

# these are all roughly analogous to appProps in CDK code
PROFILE=define-admin
DEFINE_LAMBDA_FUNCTION_NAME=define-url-v1
DEFINE_BUCKET_NAME=define-merriam-webster
DOUBLEZIP_FILENAME=deploy-main.zip

function build() {
  rm -rf build/
  mkdir build
  GOOS=linux go build -o build/main define/main.go
  cd build
  zip main.zip main
  cd ..
}

# untested
function prep_deploy() {
  [ -z $MW_DICT_API_KEY ] && echo 'MW_DICT_API_KEY is not set!' && sleep 2
  build
  cd build
  zip ${DOUBLEZIP_FILENAME} main.zip
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

# not used
function invoke() {
  WORD="${1:-peculiar}"; shift
  echo "defining '$WORD'..."
  output=output.log
  aws --profile "$PROFILE" lambda invoke \
    --cli-binary-format raw-in-base64-out \
    --function-name "$DEFINE_LAMBDA_FUNCTION_NAME" \
    --invocation-type RequestResponse \
    --payload "{\"name\": \"zeebrow\", \"word\": \"$WORD\"}" \
    "$output"
  cat "$output" | jq
}

function invoke_url() {
  WORD="${1:-peculiar}"; shift
  url=$(aws lambda get-function-url-config --function-name "$DEFINE_LAMBDA_FUNCTION_NAME" | jq -r '.FunctionUrl')
  curl "$url/?word=$WORD" 2>/dev/null  | jq
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
    invoke_url
    ;;
  --prep-deploy) prep_deploy;;
  -i) echo 'FYI: try -u instead'; shift; invoke "$@";;
  -u) shift; invoke_url "$@";;
  *) echo 'usage:
    -a              build, upload, update lambda, invode
    -i  [WORD]      invoke 
    -u  [WORD]      invoke url
    --prep-deploy   run checks and build specially for first-time deployment
    ';;

esac
