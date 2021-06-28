#!/usr/bin/env node

const { createVariables, launch } = require('../dist/main.js');

const vars = createVariables(process.argv);

launch(vars);
