#!/bin/bash

PROFILE=define-admin
# these are all roughly analogous to appProps in CDK code
DEFINE_LAMBDA_FUNCTION_NAME=define-url-v1
DEFINE_BUCKET_NAME=define-merriam-webster
DOUBLEZIP_FILENAME=deploy-main.zip

function build() {
  echo building...
  rm -rf build/
  mkdir build
  GOOS=linux go build -o build/main main.go
  cd build
  zip main.zip main
  cd ..
}

function prep_deploy() {
  [ -z $MW_DICT_API_KEY ] && echo 'MW_DICT_API_KEY is not set!' && exit 1
  build
}

function update_code () {
    echo updating lambda function code...
  aws --profile "$PROFILE" lambda update-function-code \
    --function-name "$DEFINE_LAMBDA_FUNCTION_NAME" \
    --zip-file fileb://build/main.zip
}

function invoke_event() {
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
    printf "%s\r" 'invoking url: ...'
  WORD="${1:-peculiar}"; shift
  url=$(aws lambda get-function-url-config --function-name "$DEFINE_LAMBDA_FUNCTION_NAME" | jq -r '.FunctionUrl')
  printf "invoking url: %s\n" "$url"
  curl "$url/?word=$WORD" 2>/dev/null
}

function deploy() {
  prep_deploy
  cd define-cdk
  cdk --profile "$PROFILE" deploy 
}

case "$1" in
  -a)
    shift
    build
    update_code
    invoke_url
    ;;
  --prep-deploy) prep_deploy;;
  --deploy) deploy;;
  -i) shift; invoke_event "$@";;
  -u) shift; invoke_url "$@";;
  *) echo "usage:
    -a              build, update lambda, invode
    -i  [WORD]      invoke 
    -u  [WORD]      invoke url
    --prep-deploy   run checks and build specially for first-time deployment
    --deploy        runs --prep-deploy and cdk deploy with the profile '${PROFILE}'
    ";;

esac
