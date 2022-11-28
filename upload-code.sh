#!/bin/bash

function build() {
  rm -rf build/
  mkdir build
  GOOS=linux go build -o build/main define/main.go
  cd build
  zip main.zip main
  cd ..
}

function  upload() {
  aws --profile define-admin s3 cp build/main.zip s3://define-merriam-webster/code/main.zip
}

function update_code () {
  aws --profile define-admin lambda update-function-code \
    --function-name define-url-v1 \
    --s3-bucket define-merriam-webster \
    --s3-key code/main.zip
}

function invoke() {
  #output=$(mktemp)
  output=outp.log
  aws --profile define-admin lambda invoke \
    --cli-binary-format raw-in-base64-out \
    --function-name define-url-v1 \
    --invocation-type RequestResponse \
    --payload '{"name": "zeebrow", "word": "cloud"}' \
    "$output"
}

case "$1" in
  -a)
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
  -i) invoke;;
  *) echo aaa;;
esac
