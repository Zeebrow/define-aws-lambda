#!/usr/bin/env node
import { App } from 'aws-cdk-lib'
import { exit } from 'process';
import { DefineCdkStack } from '../lib/define-cdk-stack';

import * as path from 'path'

//note-to-self
const PROFILE = 'define-admin'

const appProps = {
  bucketName: 'define-merriam-webster',
  lambdaCodeZipFilepath: '../build/main.zip',
  lambdaFunctionName: 'define-url-v1',
  s3PathToLambdaCode: 'code/main.zip'
}

if (process.env['MW_DICT_API_KEY'] == undefined){
  console.log('MW_DICT_API_KEY' + " environment variable is undefined.")
  exit(1)
}

if (path.extname(appProps.lambdaCodeZipFilepath) != '.zip'){
  console.log(`'${appProps.lambdaCodeZipFilepath}' doesn't appear to be a good zipfile.`)
  exit(1)
}

const app = new App();
new DefineCdkStack(app, 'DefineCdkStack', {
  ...appProps,
  dictApiKeyValue: process.env['MW_DICT_API_KEY']!,
  env: {
    account: '865386952527',
    region: 'us-east-1'
  }
});