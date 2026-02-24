#!/usr/bin/env node
'use strict';

const args = process.argv.slice(2);
//let target = 'https://api.openai.com';
let target = 'https://ollama.com/';

for (let i = 0; i < args.length; i++) {
  if ((args[i] === '--target' || args[i] === '-t') && args[i + 1]) {
    target = args[i + 1];
    i++;
  }
}

// Remove trailing slash
target = target.replace(/\/$/, '');

process.env.PROXY_TARGET = target;

const { startServer } = require('../server/index');
startServer(8077);
